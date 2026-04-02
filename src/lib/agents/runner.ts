import { db } from "@/lib/db";
import { agentRuns } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { getAgent } from "./registry";
import type { AgentContext, AgentStatus, StepStatus } from "./types";

interface PersistedStep {
  name: string;
  label: string;
  status: StepStatus;
  output?: unknown;
  error?: string;
  startedAt?: string;
  completedAt?: string;
}

interface RunState {
  steps: PersistedStep[];
  currentStep: number;
  childRuns?: string[];
}

/** Safely cast RunState to the jsonb-compatible Record type Drizzle expects */
function stateToJson(s: RunState): Record<string, unknown> {
  return s as unknown as Record<string, unknown>;
}

/** Safely cast jsonb value from DB to RunState */
function jsonToState(v: unknown): RunState {
  return v as RunState;
}

/** Create a new agent run and return its ID */
export async function createRun(
  agentType: string,
  userId: string,
  input: Record<string, unknown>
): Promise<string> {
  const agent = getAgent(agentType);
  if (!agent) throw new Error(`Unknown agent type: ${agentType}`);

  const steps = agent.buildSteps(input);
  const state: RunState = {
    steps: steps.map((s) => ({ name: s.name, label: s.label, status: "pending" as StepStatus })),
    currentStep: 0,
  };

  const [run] = await db
    .insert(agentRuns)
    .values({
      agentType,
      userId,
      status: "pending",
      input,
      state: stateToJson(state),
    })
    .returning({ id: agentRuns.id });

  return run.id;
}

/** Execute the next pending step of a run. Returns true if there's more work. */
export async function tick(runId: string): Promise<{ done: boolean; error?: string }> {
  const [run] = await db.select().from(agentRuns).where(eq(agentRuns.id, runId)).limit(1);
  if (!run) return { done: true, error: "Run not found" };
  if (run.status === "completed" || run.status === "failed") return { done: true };

  const agent = getAgent(run.agentType);
  if (!agent) return { done: true, error: `Unknown agent: ${run.agentType}` };

  const state = jsonToState(run.state);
  const stepDefs = agent.buildSteps(run.input as Record<string, unknown>);

  if (state.currentStep >= state.steps.length) {
    await db.update(agentRuns).set({ status: "completed", completedAt: new Date() }).where(eq(agentRuns.id, runId));
    return { done: true };
  }

  const stepIndex = state.currentStep;
  const stepDef = stepDefs[stepIndex];
  const persistedStep = state.steps[stepIndex];

  if (!stepDef) {
    await db.update(agentRuns).set({ status: "completed", completedAt: new Date() }).where(eq(agentRuns.id, runId));
    return { done: true };
  }

  // Build context with accumulated outputs
  const stepOutputs: Record<string, unknown> = {};
  for (let i = 0; i < stepIndex; i++) {
    if (state.steps[i].output !== undefined) {
      stepOutputs[state.steps[i].name] = state.steps[i].output;
    }
  }

  const ctx: AgentContext = {
    runId,
    userId: run.userId,
    input: run.input as Record<string, unknown>,
    stepOutputs,
  };

  // Mark step + run as running
  persistedStep.status = "running";
  persistedStep.startedAt = new Date().toISOString();
  await db.update(agentRuns).set({ status: "running", state: stateToJson(state) }).where(eq(agentRuns.id, runId));

  try {
    const result = await stepDef.execute(ctx);

    persistedStep.status = "completed";
    persistedStep.output = result.output;
    persistedStep.completedAt = new Date().toISOString();

    // Handle child agent spawning
    if (result.spawn?.length) {
      const childIds: string[] = [];
      for (const child of result.spawn) {
        const childId = await createRun(child.agentType, run.userId, child.input);
        childIds.push(childId);
      }
      state.childRuns = [...(state.childRuns || []), ...childIds];
    }

    if (result.abort) {
      // Skip remaining steps
      for (let i = stepIndex + 1; i < state.steps.length; i++) {
        state.steps[i].status = "skipped";
      }
      state.currentStep = state.steps.length;
      await db.update(agentRuns).set({
        status: "completed",
        state: stateToJson(state),
        output: result.output as Record<string, unknown> | undefined,
        completedAt: new Date(),
      }).where(eq(agentRuns.id, runId));
      return { done: true };
    }

    state.currentStep = stepIndex + 1;
    const done = state.currentStep >= state.steps.length;

    await db.update(agentRuns).set({
      status: done ? "completed" : "running",
      state: stateToJson(state),
      ...(done && { output: result.output as Record<string, unknown> | undefined, completedAt: new Date() }),
    }).where(eq(agentRuns.id, runId));

    return { done };
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : "Unknown error";
    persistedStep.status = "failed";
    persistedStep.error = errorMsg;
    persistedStep.completedAt = new Date().toISOString();

    await db.update(agentRuns).set({
      status: "failed",
      state: stateToJson(state),
      error: errorMsg,
    }).where(eq(agentRuns.id, runId));

    return { done: true, error: errorMsg };
  }
}

/** Run all steps to completion (use in background or long-running contexts) */
export async function runToCompletion(runId: string): Promise<void> {
  let result: { done: boolean; error?: string } = { done: false };
  while (!result.done) {
    result = await tick(runId);
    if (result.error) break;
  }
}

/** Get the current state of a run */
export async function getRunStatus(runId: string) {
  const [run] = await db.select().from(agentRuns).where(eq(agentRuns.id, runId)).limit(1);
  if (!run) return null;
  const state = jsonToState(run.state);
  return {
    id: run.id,
    agentType: run.agentType,
    status: run.status as AgentStatus,
    input: run.input,
    output: run.output,
    error: run.error,
    steps: state.steps,
    currentStep: state.currentStep,
    childRuns: state.childRuns || [],
    createdAt: run.createdAt,
    completedAt: run.completedAt,
  };
}

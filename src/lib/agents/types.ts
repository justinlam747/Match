export type AgentStatus = "pending" | "running" | "completed" | "failed" | "paused";
export type StepStatus = "pending" | "running" | "completed" | "failed" | "skipped";

export interface StepResult {
  output?: unknown;
  /** Spawn child agent runs */
  spawn?: { agentType: string; input: Record<string, unknown> }[];
  /** Skip remaining steps */
  abort?: boolean;
}

export interface AgentContext {
  runId: string;
  userId: string;
  input: Record<string, unknown>;
  /** Accumulated outputs from previous steps, keyed by step name */
  stepOutputs: Record<string, unknown>;
}

export interface StepDefinition {
  name: string;
  /** Human-readable label for UI */
  label: string;
  /** Execute this step. Return output to persist. */
  execute: (ctx: AgentContext) => Promise<StepResult>;
}

export interface AgentDefinition {
  type: string;
  label: string;
  description: string;
  /** Build the step list based on input. Steps can be dynamic. */
  buildSteps: (input: Record<string, unknown>) => StepDefinition[];
}

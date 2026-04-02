// Re-export everything and register all agents on import
export { registerAgent, getAgent, listAgents } from "./registry";
export { createRun, tick, runToCompletion, getRunStatus } from "./runner";
export type { AgentDefinition, AgentContext, StepDefinition, StepResult } from "./types";

// Import agents to trigger their self-registration
import "./agents/scoring";
import "./agents/contacts";
import "./agents/email-drafter";
import "./agents/outreach";
import "./agents/pipeline";

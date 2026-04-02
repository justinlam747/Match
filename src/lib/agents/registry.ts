import type { AgentDefinition } from "./types";

const agents = new Map<string, AgentDefinition>();

export function registerAgent(agent: AgentDefinition) {
  agents.set(agent.type, agent);
}

export function getAgent(type: string): AgentDefinition | undefined {
  return agents.get(type);
}

export function listAgents(): AgentDefinition[] {
  return Array.from(agents.values());
}

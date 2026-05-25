// Role archetype taxonomy adapted from career-ops (MIT). See THIRD_PARTY_LICENSES.md.
export type RoleArchetype =
  | "platform-llmops"
  | "agentic-automation"
  | "technical-pm"
  | "solutions-architect"
  | "forward-deployed"
  | "transformation-lead";

export const ROLE_ARCHETYPES: readonly RoleArchetype[] = [
  "platform-llmops",
  "agentic-automation",
  "technical-pm",
  "solutions-architect",
  "forward-deployed",
  "transformation-lead",
] as const;

export const ARCHETYPE_DESCRIPTIONS: Record<RoleArchetype, string> = {
  "platform-llmops":
    "Building and operating LLM platforms: model serving, evaluations, prompt infrastructure, inference optimization, and production ML tooling.",
  "agentic-automation":
    "Designing autonomous agents with tool use, multi-step reasoning, and end-to-end workflow automation across systems.",
  "technical-pm":
    "Technical product manager bridging engineering and product for AI/ML products, owning roadmap, requirements, and cross-functional delivery.",
  "solutions-architect":
    "Customer-facing technical role designing AI integrations, scoping deployments, and translating customer needs into reference architectures.",
  "forward-deployed":
    "Embedded engineer shipping bespoke deployments on-site or inside customer stacks, writing production code against real customer data.",
  "transformation-lead":
    "Enterprise change leadership driving AI adoption: operating model redesign, stakeholder alignment, and organizational rollout.",
};

export const ARCHETYPE_LABELS: Record<RoleArchetype, string> = {
  "platform-llmops": "Platform / LLMOps",
  "agentic-automation": "Agentic Automation",
  "technical-pm": "Technical PM",
  "solutions-architect": "Solutions Architect",
  "forward-deployed": "Forward-Deployed",
  "transformation-lead": "Transformation Lead",
};

export function buildArchetypeDetectionPrompt(jobDescription: string): string {
  const archetypeList = ROLE_ARCHETYPES.map(
    (a) => `- ${a}: ${ARCHETYPE_DESCRIPTIONS[a]}`
  ).join("\n");

  return `Classify the following job description into EXACTLY ONE of the six role archetypes below. Pick the single best fit.

Archetypes:
${archetypeList}

Job description:
<job>
${jobDescription}
</job>

Respond with ONLY valid JSON in this exact shape, nothing else:
{"archetype": "<one of: ${ROLE_ARCHETYPES.join(" | ")}>", "confidence": <number 0 to 1>, "rationale": "<one sentence explaining the choice>"}`;
}

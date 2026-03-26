import Anthropic from "@anthropic-ai/sdk";

const anthropic = new Anthropic();

export async function inferTechStack(
  companyName: string,
  description: string
): Promise<string[]> {
  try {
    const response = await anthropic.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 256,
      messages: [
        {
          role: "user",
          content: `Based on this YC company description, infer their likely tech stack (programming languages, frameworks, databases, cloud providers, tools). Only list technologies they very likely use based on what they build.

Company: ${companyName}
Description: ${description}

Return ONLY a JSON array of strings, like: ["TypeScript", "React", "Node.js", "PostgreSQL", "AWS"]
No explanation. No markdown. Just the JSON array.`,
        },
      ],
    });

    const text =
      response.content[0].type === "text" ? response.content[0].text : "[]";
    const parsed = JSON.parse(text.trim());
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

/*
 * Title filter logic ported from career-ops.
 * Original work licensed under the MIT License.
 * See https://github.com/career-ops/career-ops for upstream source.
 */

// Each keyword is matched as a whole-word substring (unicode word boundaries),
// NOT a bare String.includes — "AI" must not match "maintainer", "ML" must
// not match "html", "HR" must not match "thread". Multi-word phrases match
// literally with whitespace collapsed. Case-insensitive.

export const POSITIVE_KEYWORDS: readonly string[] = [
  "AI",
  "ML",
  "LLM",
  "Agent",
  "Agentic",
  "Platform",
  "Infrastructure",
  "Backend",
  "Full Stack",
  "Fullstack",
  "Software Engineer",
  "Software Developer",
  "Senior",
  "Staff",
  "Principal",
  "Forward Deployed",
  "Solutions Engineer",
  "Solutions Architect",
  "ML Engineer",
  "MLOps",
  "DevOps",
  "SRE",
  "Site Reliability",
  "Platform Engineer",
  "Data Engineer",
  "Data Scientist",
  "Applied Scientist",
  "Research Engineer",
  "Research Scientist",
  "GenAI",
  "Generative AI",
  "RAG",
  "Vector",
  "Embedding",
  "Fine-tuning",
  "Prompt Engineer",
  "Inference",
  "Serving",
  "Distributed Systems",
  "Production",
  "Scale",
  "Scalability",
  "Architect",
  "Founding Engineer",
  "Technical",
  "Product Engineer",
  "Scientist",
  "Evaluation",
  "Evals",
  "Computer Vision",
  "NLP",
  "Deep Learning",
  "Reinforcement Learning",
];

export const NEGATIVE_KEYWORDS: readonly string[] = [
  "Junior",
  "Intern",
  "Internship",
  "Entry Level",
  "Entry-Level",
  ".NET",
  "Blockchain",
  "Crypto",
  "Web3",
  "NFT",
  "Solidity",
  "PHP",
  "WordPress",
  "Drupal",
  "Sales",
  "Marketing",
  "Human Resources",
  "Recruiter",
  "Recruiting",
  "Accounting",
  "Accountant",
  "Customer Support",
  "Customer Success",
  "QA Tester",
  "Game Designer",
  "Unity Engine",
];

export interface TitleFilterConfig {
  positive?: readonly string[];
  negative?: readonly string[];
  requirePositiveMatch?: boolean;
  rejectOnNegativeMatch?: boolean;
}

export interface TitleFilterResult {
  matched: boolean;
  positiveHits: string[];
  negativeHits: string[];
}

// Escape regex metacharacters so "." and "+" in keywords match literally.
function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

// Build a whole-word regex for a keyword. For short tokens (<=3 chars) we
// require word boundaries on BOTH sides. For multi-word phrases we collapse
// internal whitespace and still require boundaries at the edges.
function buildKeywordRegex(keyword: string): RegExp {
  const collapsed = keyword.trim().replace(/\s+/g, " ");
  const escaped = escapeRegex(collapsed);
  // \b doesn't work with ".NET" (dot is non-word); fall back to (?<!\w)/(?!\w) lookarounds.
  return new RegExp(`(?<![A-Za-z0-9])${escaped}(?![A-Za-z0-9])`, "i");
}

function findHits(haystack: string, needles: readonly string[]): string[] {
  const hits: string[] = [];
  for (const needle of needles) {
    if (needle.length === 0) continue;
    if (buildKeywordRegex(needle).test(haystack)) {
      hits.push(needle);
    }
  }
  return hits;
}

export function filterTitle(
  title: string,
  config?: TitleFilterConfig,
): TitleFilterResult {
  const positive = config?.positive ?? POSITIVE_KEYWORDS;
  const negative = config?.negative ?? NEGATIVE_KEYWORDS;
  const requirePositiveMatch = config?.requirePositiveMatch ?? true;
  const rejectOnNegativeMatch = config?.rejectOnNegativeMatch ?? true;

  const positiveHits = findHits(title, positive);
  const negativeHits = findHits(title, negative);

  const positiveOk = requirePositiveMatch ? positiveHits.length > 0 : true;
  const negativeOk = rejectOnNegativeMatch ? negativeHits.length === 0 : true;

  return {
    matched: positiveOk && negativeOk,
    positiveHits,
    negativeHits,
  };
}

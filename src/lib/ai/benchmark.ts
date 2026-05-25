/**
 * YC Match Scoring Benchmark Suite
 *
 * Generates ground-truth labels using Claude as an expert recruiter judge,
 * then evaluates our scoring pipeline against multiple baselines.
 *
 * Metrics:
 *   - Precision@K    — of top K results, how many are actually good?
 *   - Recall@K       — of all good matches, how many appear in top K?
 *   - NDCG@K         — normalized discounted cumulative gain (ranking quality)
 *   - Spearman ρ     — rank correlation between predicted and ground truth
 *   - MAP            — mean average precision
 *
 * Baselines:
 *   1. Random         — shuffle companies randomly
 *   2. Keyword/TF-IDF — count overlapping words between resume text and company description
 *   3. Our scorer     — the 4-dimension scoring pipeline
 *
 * Usage:
 *   npx tsx src/lib/ai/benchmark.ts
 *
 * Output:
 *   - benchmark-results.json   — raw scores + labels
 *   - benchmark-report.json    — final metrics comparison table
 */

import Anthropic from "@anthropic-ai/sdk";
import { writeFileSync, existsSync, readFileSync } from "fs";
import type { ParsedResume } from "@/lib/db/schema";

const anthropic = new Anthropic();

/* ── Synthetic test resumes ── */

const testResumes: ParsedResume[] = [
  {
    name: "Alex Rivera",
    email: "alex@example.com",
    skills: {
      languages: ["TypeScript", "Python", "Go"],
      frameworks: ["React", "Next.js", "FastAPI"],
      tools: ["Docker", "Kubernetes", "Git", "Terraform"],
      databases: ["PostgreSQL", "Redis", "MongoDB"],
      cloud: ["AWS", "Vercel"],
      other: ["GraphQL", "REST APIs", "CI/CD"],
    },
    experience: [
      { company: "Stripe", title: "Senior Software Engineer", duration_months: 36, industry: "Fintech", highlights: ["Led payments API redesign", "Reduced latency 40%"], tech_used: ["Go", "Ruby", "AWS"] },
      { company: "Vercel", title: "Software Engineer", duration_months: 24, industry: "Developer Tools", highlights: ["Built edge functions platform", "Next.js core contributor"], tech_used: ["TypeScript", "React", "Next.js"] },
    ],
    education: { school: "MIT", degree: "BS", field: "Computer Science", year: 2018 },
    industries_worked_in: ["Fintech", "Developer Tools", "Cloud Infrastructure"],
    seniority_level: "senior",
    years_of_experience: 5,
    standout_signals: ["FAANG experience", "Open source contributor"],
  },
  {
    name: "Priya Sharma",
    email: "priya@example.com",
    skills: {
      languages: ["Python", "R", "SQL"],
      frameworks: ["PyTorch", "TensorFlow", "scikit-learn", "Pandas"],
      tools: ["Jupyter", "MLflow", "Airflow", "dbt"],
      databases: ["BigQuery", "Snowflake", "PostgreSQL"],
      cloud: ["GCP", "AWS SageMaker"],
      other: ["NLP", "Computer Vision", "A/B Testing"],
    },
    experience: [
      { company: "Google", title: "ML Engineer", duration_months: 30, industry: "Technology", highlights: ["Built recommendation system serving 100M users", "Published 2 papers at NeurIPS"], tech_used: ["Python", "TensorFlow", "GCP"] },
      { company: "Hugging Face", title: "Research Engineer", duration_months: 18, industry: "AI/ML", highlights: ["Fine-tuned LLMs for production", "Contributed to Transformers library"], tech_used: ["PyTorch", "Python", "CUDA"] },
    ],
    education: { school: "Stanford", degree: "MS", field: "Machine Learning", year: 2020 },
    industries_worked_in: ["Technology", "AI/ML", "Data Science"],
    seniority_level: "mid",
    years_of_experience: 4,
    standout_signals: ["Published researcher", "Open source maintainer"],
  },
  {
    name: "Jordan Lee",
    email: "jordan@example.com",
    skills: {
      languages: ["JavaScript", "TypeScript", "Swift"],
      frameworks: ["React Native", "SwiftUI", "Express"],
      tools: ["Figma", "Firebase", "Xcode", "TestFlight"],
      databases: ["Firestore", "SQLite"],
      cloud: ["Firebase", "AWS Amplify"],
      other: ["Mobile development", "UI/UX", "App Store optimization"],
    },
    experience: [
      { company: "Robinhood", title: "Mobile Engineer", duration_months: 24, industry: "Fintech", highlights: ["Shipped crypto trading feature to 5M users", "Reduced crash rate 60%"], tech_used: ["React Native", "TypeScript", "Firebase"] },
      { company: "Instagram", title: "iOS Engineer", duration_months: 18, industry: "Social Media", highlights: ["Built Reels editing tools", "Performance optimization"], tech_used: ["Swift", "UIKit", "GraphQL"] },
    ],
    education: { school: "UC Berkeley", degree: "BS", field: "EECS", year: 2019 },
    industries_worked_in: ["Fintech", "Social Media", "Consumer Apps"],
    seniority_level: "mid",
    years_of_experience: 3.5,
    standout_signals: ["Consumer scale experience", "Mobile specialist"],
  },
];

/* ── Synthetic test companies ── */

const testCompanies = [
  { id: "c1", name: "PayFlex", description: "API-first payment infrastructure for emerging markets. We process $2B+ annually across 15 countries using Go microservices on AWS.", industries: ["Fintech", "B2B", "Payments"], techStack: ["Go", "TypeScript", "React", "PostgreSQL", "AWS", "Kubernetes", "Redis"], stage: "series_a", batch: "W24", hiringSignals: { has_careers_page: true, recent_job_posts: 5, eng_roles_open: true } },
  { id: "c2", name: "NeuralForge", description: "Building foundation models for scientific research. Our models predict protein structures and molecular interactions 100x faster than existing methods.", industries: ["AI/ML", "Biotech", "Deep Tech"], techStack: ["Python", "PyTorch", "CUDA", "C++", "GCP", "Kubernetes"], stage: "seed", batch: "W25", hiringSignals: { has_careers_page: true, recent_job_posts: 3, eng_roles_open: true } },
  { id: "c3", name: "LoopChat", description: "Social messaging app for Gen-Z with disappearing group chats and AI-powered content creation tools. 2M MAU and growing 30% MoM.", industries: ["Social Media", "Consumer", "Messaging"], techStack: ["React Native", "TypeScript", "Firebase", "Swift", "Node.js"], stage: "series_a", batch: "S24", hiringSignals: { has_careers_page: true, recent_job_posts: 8, eng_roles_open: true } },
  { id: "c4", name: "TerraWatch", description: "Climate monitoring platform using satellite imagery and ML to track deforestation and carbon emissions for governments and NGOs.", industries: ["Climate Tech", "Government", "Remote Sensing"], techStack: ["Python", "TensorFlow", "GCP", "BigQuery", "React", "PostGIS"], stage: "seed", batch: "W25", hiringSignals: { has_careers_page: false, recent_job_posts: 0, eng_roles_open: false } },
  { id: "c5", name: "DevShip", description: "Developer productivity platform that auto-generates CI/CD pipelines, infrastructure-as-code, and deployment configs from your codebase.", industries: ["Developer Tools", "DevOps", "B2B"], techStack: ["TypeScript", "Go", "React", "Next.js", "Terraform", "Docker", "AWS", "PostgreSQL"], stage: "seed", batch: "W25", hiringSignals: { has_careers_page: true, recent_job_posts: 2, eng_roles_open: true } },
  { id: "c6", name: "MedScribe", description: "AI medical documentation — listens to doctor-patient conversations and generates structured clinical notes, saving 2 hours/day per physician.", industries: ["Healthcare", "AI/ML", "B2B"], techStack: ["Python", "PyTorch", "FastAPI", "React", "AWS", "PostgreSQL"], stage: "series_a", batch: "S24", hiringSignals: { has_careers_page: true, recent_job_posts: 4, eng_roles_open: true } },
  { id: "c7", name: "FreightOS", description: "Digital freight forwarding platform connecting shippers with carriers. Automates quotes, booking, and tracking for international shipments.", industries: ["Logistics", "Supply Chain", "B2B"], techStack: ["Java", "Spring Boot", "React", "PostgreSQL", "AWS", "Kafka"], stage: "growth", batch: "W22", hiringSignals: { has_careers_page: true, recent_job_posts: 1, eng_roles_open: false } },
  { id: "c8", name: "PixelCraft", description: "No-code design tool for creating 3D product mockups and AR experiences. Used by 500+ e-commerce brands.", industries: ["Design Tools", "E-commerce", "AR/VR"], techStack: ["TypeScript", "Three.js", "WebGL", "React", "Node.js", "MongoDB"], stage: "seed", batch: "W25", hiringSignals: { has_careers_page: false, recent_job_posts: 1, eng_roles_open: false } },
  { id: "c9", name: "DataBrew", description: "Modern data warehouse for startups. One-click ETL, SQL analytics, and dashboards built on top of DuckDB.", industries: ["Data Infrastructure", "Developer Tools", "B2B"], techStack: ["Rust", "TypeScript", "React", "DuckDB", "Python", "Docker", "AWS"], stage: "seed", batch: "W25", hiringSignals: { has_careers_page: true, recent_job_posts: 2, eng_roles_open: true } },
  { id: "c10", name: "Nomad Health", description: "Telemedicine platform for digital nomads and remote workers. Connects travelers with local doctors and handles international prescriptions.", industries: ["Healthcare", "Consumer", "Travel"], techStack: ["React Native", "TypeScript", "Firebase", "Node.js", "Stripe"], stage: "seed", batch: "W25", hiringSignals: { has_careers_page: false, recent_job_posts: 0, eng_roles_open: false } },
  { id: "c11", name: "CodeReview AI", description: "AI-powered code review tool that catches bugs, security vulnerabilities, and style issues before they reach production.", industries: ["Developer Tools", "AI/ML", "B2B"], techStack: ["Python", "TypeScript", "React", "Next.js", "PostgreSQL", "AWS", "Docker"], stage: "seed", batch: "W25", hiringSignals: { has_careers_page: true, recent_job_posts: 3, eng_roles_open: true } },
  { id: "c12", name: "FarmStack", description: "Precision agriculture platform using drone imagery and soil sensors to optimize crop yields for small-scale farmers in South Asia.", industries: ["AgTech", "IoT", "Climate Tech"], techStack: ["Python", "React", "PostgreSQL", "TensorFlow", "AWS IoT"], stage: "seed", batch: "W25", hiringSignals: { has_careers_page: false, recent_job_posts: 0, eng_roles_open: false } },
];

/* ── Step 1: Generate ground truth labels via Claude ── */

interface GroundTruthLabel {
  resumeName: string;
  companyId: string;
  companyName: string;
  relevance: number; // 0-3 scale
  reasoning: string;
}

async function generateGroundTruth(): Promise<GroundTruthLabel[]> {
  const labels: GroundTruthLabel[] = [];

  for (const resume of testResumes) {
    // Batch companies into a single prompt per resume for efficiency
    const companyDescriptions = testCompanies
      .map((c, i) => `${i + 1}. ${c.name} (${c.batch}) — ${c.description}\n   Tech: ${c.techStack.join(", ")}\n   Industries: ${c.industries.join(", ")}`)
      .join("\n\n");

    const prompt = `You are a senior technical recruiter with 15 years of experience placing engineers at startups. Rate how good a match each company is for this candidate.

## Candidate: ${resume.name}
- Seniority: ${resume.seniority_level} (${resume.years_of_experience} years)
- Skills: ${[...resume.skills.languages, ...resume.skills.frameworks, ...resume.skills.tools, ...resume.skills.databases, ...resume.skills.cloud].join(", ")}
- Experience: ${resume.experience.map((e) => `${e.title} at ${e.company} (${e.industry}, ${e.duration_months}mo)`).join("; ")}
- Industries: ${resume.industries_worked_in.join(", ")}
- Standout: ${resume.standout_signals.join(", ")}

## Companies
${companyDescriptions}

Rate EACH company 0-3:
  0 = Poor fit (wrong domain, wrong tech, wrong seniority)
  1 = Weak fit (some overlap but significant gaps)
  2 = Good fit (strong overlap in tech or domain, could contribute)
  3 = Excellent fit (ideal match — right tech, right domain, right level)

Return ONLY a JSON array like: [{"company": "CompanyName", "score": 2, "reason": "brief explanation"}]
No markdown, no extra text.`;

    try {
      const response = await anthropic.messages.create({
        model: "claude-sonnet-4-20250514",
        max_tokens: 2048,
        messages: [{ role: "user", content: prompt }],
      });

      const text = response.content[0].type === "text" ? response.content[0].text : "[]";
      const parsed = JSON.parse(text) as { company: string; score: number; reason: string }[];

      for (const item of parsed) {
        const company = testCompanies.find((c) => c.name === item.company);
        if (company) {
          labels.push({
            resumeName: resume.name,
            companyId: company.id,
            companyName: company.name,
            relevance: item.score,
            reasoning: item.reason,
          });
        }
      }
    } catch (err) {
      console.error(`Error generating labels for ${resume.name}:`, err);
    }
  }

  return labels;
}

/* ── Step 2: Baseline scorers ── */

// Baseline 1: Random
function randomScore(): number {
  return Math.random() * 100;
}

// Baseline 2: Keyword TF-IDF-like overlap
function keywordScore(resume: ParsedResume, company: typeof testCompanies[0]): number {
  const resumeWords = new Set(
    [
      ...resume.skills.languages,
      ...resume.skills.frameworks,
      ...resume.skills.tools,
      ...resume.skills.databases,
      ...resume.skills.cloud,
      ...resume.skills.other,
      ...resume.industries_worked_in,
    ].map((w) => w.toLowerCase())
  );

  const companyWords = new Set(
    [
      ...(company.techStack || []),
      ...(company.industries || []),
      ...(company.description || "").split(/\W+/),
    ].map((w) => w.toLowerCase()).filter((w) => w.length > 2)
  );

  const overlap = [...resumeWords].filter((w) => companyWords.has(w));
  return Math.min((overlap.length / Math.max(resumeWords.size, 1)) * 100, 100);
}

// Our scorer (imported logic, simplified for benchmark)
function ourScore(resume: ParsedResume, company: typeof testCompanies[0]): number {
  // Tech score (0-25)
  const resumeTech = new Set(
    [...resume.skills.languages, ...resume.skills.frameworks, ...resume.skills.tools, ...resume.skills.databases, ...resume.skills.cloud, ...resume.skills.other].map((t) => t.toLowerCase())
  );
  const companyTech = new Set((company.techStack || []).map((t) => t.toLowerCase()));
  const overlap = [...resumeTech].filter((t) => companyTech.has(t));
  const techScore = companyTech.size > 0 ? Math.round((overlap.length / Math.max(companyTech.size, 1)) * 25) : 12;

  // Hiring score (0-25)
  let hiringScore = 5;
  const signals = company.hiringSignals;
  if (signals?.has_careers_page) hiringScore += 8;
  if ((signals?.recent_job_posts ?? 0) > 0) hiringScore += 7;
  if (signals?.eng_roles_open) hiringScore += 5;
  hiringScore = Math.min(hiringScore, 25);

  // Stage score (0-25)
  const stageMap: Record<string, Record<string, number>> = {
    intern: { seed: 20, series_a: 15, growth: 10 },
    junior: { seed: 22, series_a: 25, growth: 15 },
    mid: { seed: 18, series_a: 22, growth: 25 },
    senior: { seed: 25, series_a: 20, growth: 18 },
  };
  const stageScore = stageMap[resume.seniority_level]?.[company.stage || "seed"] || 12;

  // Industry score — simple overlap for benchmark (no API call)
  const resumeIndustries = new Set(resume.industries_worked_in.map((i) => i.toLowerCase()));
  const companyIndustries = new Set((company.industries || []).map((i) => i.toLowerCase()));
  const industryOverlap = [...resumeIndustries].filter((i) => companyIndustries.has(i));
  const industryScore = Math.round((industryOverlap.length / Math.max(companyIndustries.size, 1)) * 25);

  return techScore + industryScore + hiringScore + stageScore;
}

/* ── Step 3: Metrics ── */

function precisionAtK(predicted: string[], relevant: Set<string>, k: number): number {
  const topK = predicted.slice(0, k);
  const hits = topK.filter((id) => relevant.has(id)).length;
  return hits / k;
}

function recallAtK(predicted: string[], relevant: Set<string>, k: number): number {
  if (relevant.size === 0) return 0;
  const topK = predicted.slice(0, k);
  const hits = topK.filter((id) => relevant.has(id)).length;
  return hits / relevant.size;
}

function ndcgAtK(predicted: string[], relevanceMap: Map<string, number>, k: number): number {
  const topK = predicted.slice(0, k);

  // DCG
  let dcg = 0;
  for (let i = 0; i < topK.length; i++) {
    const rel = relevanceMap.get(topK[i]) || 0;
    dcg += (Math.pow(2, rel) - 1) / Math.log2(i + 2);
  }

  // Ideal DCG
  const idealRels = [...relevanceMap.values()].sort((a, b) => b - a).slice(0, k);
  let idcg = 0;
  for (let i = 0; i < idealRels.length; i++) {
    idcg += (Math.pow(2, idealRels[i]) - 1) / Math.log2(i + 2);
  }

  return idcg === 0 ? 0 : dcg / idcg;
}

function meanAveragePrecision(predicted: string[], relevant: Set<string>): number {
  let sum = 0;
  let hits = 0;
  for (let i = 0; i < predicted.length; i++) {
    if (relevant.has(predicted[i])) {
      hits++;
      sum += hits / (i + 1);
    }
  }
  return relevant.size === 0 ? 0 : sum / relevant.size;
}

function spearmanRho(predicted: string[], relevanceMap: Map<string, number>): number {
  const n = predicted.length;
  if (n < 2) return 0;

  // Rank from relevanceMap (ideal order)
  const idealOrder = [...relevanceMap.entries()].sort((a, b) => b[1] - a[1]).map((e) => e[0]);
  const idealRank = new Map(idealOrder.map((id, i) => [id, i + 1]));
  const predictedRank = new Map(predicted.map((id, i) => [id, i + 1]));

  let d2sum = 0;
  for (const id of predicted) {
    const ri = predictedRank.get(id) || n;
    const ii = idealRank.get(id) || n;
    d2sum += Math.pow(ri - ii, 2);
  }

  return 1 - (6 * d2sum) / (n * (n * n - 1));
}

/* ── Step 4: Run benchmark ── */

interface ScorerResult {
  name: string;
  metrics: {
    "precision@3": number;
    "precision@5": number;
    "recall@5": number;
    "recall@10": number;
    "ndcg@5": number;
    "ndcg@10": number;
    map: number;
    spearman: number;
  };
}

/**
 * Expert-curated ground truth — hand-labeled by reviewing each resume×company pair.
 * These serve as the gold standard when no API key is available.
 */
function getHardcodedLabels(): GroundTruthLabel[] {
  // Alex Rivera: Senior fullstack, TS/React/Go/AWS, ex-Stripe/Vercel
  const alex: [string, string, number, string][] = [
    ["c1", "PayFlex", 3, "Exact fintech domain + strong TypeScript/AWS/PostgreSQL overlap from Stripe background"],
    ["c2", "NeuralForge", 0, "No ML/AI experience, wrong tech stack (Python/PyTorch vs TypeScript/React)"],
    ["c3", "LoopChat", 1, "Some React Native overlap but consumer social isn't his domain"],
    ["c4", "TerraWatch", 0, "No climate/ML experience, completely different stack"],
    ["c5", "DevShip", 3, "Perfect fit — dev tools background from Vercel, exact stack match (TS/Go/Next.js/Terraform/Docker/AWS)"],
    ["c6", "MedScribe", 1, "Tech partially overlaps (React/AWS/PostgreSQL) but no healthcare domain experience"],
    ["c7", "FreightOS", 0, "Java/Spring stack mismatch, no logistics experience, not actively hiring"],
    ["c8", "PixelCraft", 1, "TypeScript/React overlap but no 3D/WebGL experience"],
    ["c9", "DataBrew", 2, "Strong infra background, TypeScript/Docker/AWS overlap, dev tools adjacent"],
    ["c10", "Nomad Health", 1, "Some TypeScript overlap but healthcare/mobile focus doesn't match"],
    ["c11", "CodeReview AI", 2, "Dev tools background, TypeScript/React/Next.js/PostgreSQL/AWS overlap, good fit"],
    ["c12", "FarmStack", 0, "No agtech/ML experience, not hiring"],
  ];

  // Priya Sharma: ML engineer, Python/PyTorch/TensorFlow, ex-Google/HuggingFace
  const priya: [string, string, number, string][] = [
    ["c1", "PayFlex", 0, "No fintech experience, wrong tech stack (Go/TS vs Python/PyTorch)"],
    ["c2", "NeuralForge", 3, "Perfect — ML research background, PyTorch/CUDA expertise, published researcher"],
    ["c3", "LoopChat", 0, "No mobile/consumer experience, completely different tech"],
    ["c4", "TerraWatch", 3, "Strong ML fit (TensorFlow/GCP/BigQuery), satellite imagery is CV-adjacent"],
    ["c5", "DevShip", 0, "No devops/infra experience, wrong tech stack"],
    ["c6", "MedScribe", 2, "PyTorch/FastAPI/Python overlap, AI-powered product, but no healthcare domain"],
    ["c7", "FreightOS", 0, "No overlap in tech or domain, not hiring"],
    ["c8", "PixelCraft", 0, "No 3D/WebGL experience, not hiring"],
    ["c9", "DataBrew", 1, "Python/data background adjacent but no Rust, not exactly data engineering"],
    ["c10", "Nomad Health", 0, "No healthcare/mobile experience"],
    ["c11", "CodeReview AI", 2, "AI/ML background + Python/AWS, could build the AI models for code analysis"],
    ["c12", "FarmStack", 2, "TensorFlow/Python match, ML for agriculture is domain-adjacent to her CV work"],
  ];

  // Jordan Lee: Mobile engineer, React Native/Swift, ex-Robinhood/Instagram
  const jordan: [string, string, number, string][] = [
    ["c1", "PayFlex", 1, "Some fintech background from Robinhood but backend-heavy stack mismatch"],
    ["c2", "NeuralForge", 0, "No ML experience, completely wrong tech"],
    ["c3", "LoopChat", 3, "Perfect — React Native/Swift/Firebase + consumer social experience from Instagram"],
    ["c4", "TerraWatch", 0, "No climate/ML experience"],
    ["c5", "DevShip", 0, "No devops experience, mobile specialist vs infra tools"],
    ["c6", "MedScribe", 0, "No healthcare or NLP experience"],
    ["c7", "FreightOS", 0, "Wrong tech, wrong domain, not hiring"],
    ["c8", "PixelCraft", 1, "Some TypeScript/React overlap but no 3D experience, not hiring"],
    ["c9", "DataBrew", 0, "No data engineering background"],
    ["c10", "Nomad Health", 2, "React Native/TypeScript/Firebase overlap + consumer mobile experience"],
    ["c11", "CodeReview AI", 1, "TypeScript overlap but no AI/backend experience"],
    ["c12", "FarmStack", 0, "No overlap whatsoever"],
  ];

  const all = [
    ...alex.map(([cid, cname, score, reason]) => ({ resumeName: "Alex Rivera", companyId: cid, companyName: cname, relevance: score, reasoning: reason })),
    ...priya.map(([cid, cname, score, reason]) => ({ resumeName: "Priya Sharma", companyId: cid, companyName: cname, relevance: score, reasoning: reason })),
    ...jordan.map(([cid, cname, score, reason]) => ({ resumeName: "Jordan Lee", companyId: cid, companyName: cname, relevance: score, reasoning: reason })),
  ];

  return all;
}

async function runBenchmark() {
  console.log("=== YC Match Scoring Benchmark ===\n");

  // Check for cached labels, generate if needed, fallback to hardcoded
  const labelsPath = "benchmark-labels.json";
  let labels: GroundTruthLabel[];

  if (existsSync(labelsPath)) {
    const cached = JSON.parse(readFileSync(labelsPath, "utf-8"));
    if (cached.length > 0) {
      console.log(`Loading ${cached.length} cached ground truth labels...`);
      labels = cached;
    } else {
      console.log("Cached labels empty, using expert-curated fallback...");
      labels = getHardcodedLabels();
    }
  } else if (process.env.ANTHROPIC_API_KEY) {
    console.log("Generating ground truth labels via Claude (this costs ~$0.10)...");
    labels = await generateGroundTruth();
    writeFileSync(labelsPath, JSON.stringify(labels, null, 2));
    console.log(`Generated ${labels.length} labels\n`);
  } else {
    console.log("No API key found — using expert-curated ground truth labels...");
    labels = getHardcodedLabels();
    writeFileSync(labelsPath, JSON.stringify(labels, null, 2));
  }

  // Fine-tuned model scorer (calls localhost:8787)
  async function fineTunedScore(resume: ParsedResume, company: typeof testCompanies[0]): Promise<number> {
    const skills = [
      ...resume.skills.languages, ...resume.skills.frameworks,
      ...resume.skills.tools, ...resume.skills.databases,
      ...resume.skills.cloud, ...resume.skills.other,
    ].join(", ");
    const experience = resume.experience
      .map((e) => `${e.title} at ${e.company} (${e.industry}, ${e.duration_months}mo)`)
      .join("; ");
    const hiring = company.hiringSignals;
    const isHiring = hiring?.has_careers_page || (hiring?.recent_job_posts ?? 0) > 0 || hiring?.eng_roles_open;

    const prompt = `Score this match:\n\nCANDIDATE:\n- Skills: ${skills}\n- Experience: ${experience}\n- Industries: ${resume.industries_worked_in.join(", ")}\n- Seniority: ${resume.seniority_level} (${resume.years_of_experience} years)\n\nCOMPANY: ${company.name} (YC ${company.batch}, ${company.stage})\n- Description: ${company.description}\n- Tech stack: ${company.techStack.join(", ")}\n- Industries: ${company.industries.join(", ")}\n- Actively hiring: ${isHiring ? "Yes" : "No"}`;

    try {
      const res = await fetch("http://localhost:8787/score", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          system: "You are an expert technical recruiter scoring resume-job matches. Output ONLY valid JSON with techScore, industryScore, stageScore, hiringScore (each 0-25), and explanation.",
          prompt,
        }),
        signal: AbortSignal.timeout(30000),
      });
      if (!res.ok) return 0;
      const data = await res.json();
      const match = (data.result || "").match(/\{[\s\S]*\}/);
      if (!match) return 0;
      const parsed = JSON.parse(match[0]);
      return (parsed.techScore || 0) + (parsed.industryScore || 0) + (parsed.stageScore || 0) + (parsed.hiringScore || 0);
    } catch {
      return 0;
    }
  }

  // Check if model server is running
  let modelServerUp = false;
  try {
    const health = await fetch("http://localhost:8787/health", { signal: AbortSignal.timeout(3000) });
    modelServerUp = health.ok;
  } catch {}

  if (modelServerUp) {
    console.log("Model server detected at localhost:8787 — including fine-tuned model in benchmark\n");
  } else {
    console.log("Model server not running — skipping fine-tuned model (start with: python scripts/model-server.py)\n");
  }

  // Define scorers
  type Scorer = { name: string; score: (r: ParsedResume, c: typeof testCompanies[0]) => number | Promise<number> };
  const scorers: Scorer[] = [
    { name: "Random", score: () => randomScore() },
    { name: "Keyword overlap", score: (r, c) => keywordScore(r, c) },
    { name: "YC Match (heuristic)", score: (r, c) => ourScore(r, c) },
  ];
  if (modelServerUp) {
    scorers.push({ name: "Fine-tuned model", score: (r, c) => fineTunedScore(r, c) });
  }

  const allResults: ScorerResult[] = [];

  for (const scorer of scorers) {
    console.log(`  Running: ${scorer.name}...`);
    const perResumeMetrics: ScorerResult["metrics"][] = [];

    for (const resume of testResumes) {
      const resumeLabels = labels.filter((l) => l.resumeName === resume.name);
      const relevanceMap = new Map(resumeLabels.map((l) => [l.companyId, l.relevance]));
      const relevant = new Set(resumeLabels.filter((l) => l.relevance >= 2).map((l) => l.companyId));

      // Score all companies (await for async scorers)
      const scorePromises = testCompanies.map(async (c) => ({
        id: c.id,
        score: await scorer.score(resume, c),
      }));
      const scores = await Promise.all(scorePromises);
      scores.sort((a, b) => b.score - a.score);
      const ranked = scores.map((s) => s.id);

      perResumeMetrics.push({
        "precision@3": precisionAtK(ranked, relevant, 3),
        "precision@5": precisionAtK(ranked, relevant, 5),
        "recall@5": recallAtK(ranked, relevant, 5),
        "recall@10": recallAtK(ranked, relevant, 10),
        "ndcg@5": ndcgAtK(ranked, relevanceMap, 5),
        "ndcg@10": ndcgAtK(ranked, relevanceMap, 10),
        map: meanAveragePrecision(ranked, relevant),
        spearman: spearmanRho(ranked, relevanceMap),
      });
    }

    const avg: ScorerResult["metrics"] = {
      "precision@3": 0, "precision@5": 0, "recall@5": 0, "recall@10": 0,
      "ndcg@5": 0, "ndcg@10": 0, map: 0, spearman: 0,
    };
    for (const m of perResumeMetrics) {
      for (const key of Object.keys(avg) as (keyof typeof avg)[]) {
        avg[key] += m[key] / perResumeMetrics.length;
      }
    }

    allResults.push({ name: scorer.name, metrics: avg });
  }

  // Print results
  console.log("\n╔══════════════════════════════════════════════════════════════════════════╗");
  console.log("║                    BENCHMARK RESULTS (averaged over 3 resumes)          ║");
  console.log("╠══════════════════════════════════════════════════════════════════════════╣");

  const metricKeys = Object.keys(allResults[0].metrics) as (keyof ScorerResult["metrics"])[];
  const header = ["Scorer", ...metricKeys.map((k) => k.padStart(12))].join(" │ ");
  console.log(`║ ${header} ║`);
  console.log("╠══════════════════════════════════════════════════════════════════════════╣");

  for (const result of allResults) {
    const row = [
      result.name.padEnd(18),
      ...metricKeys.map((k) => result.metrics[k].toFixed(3).padStart(12)),
    ].join(" │ ");
    console.log(`║ ${row} ║`);
  }

  console.log("╚══════════════════════════════════════════════════════════════════════════╝");

  // Compute improvement percentages
  const random = allResults.find((r) => r.name === "Random")!;
  const keyword = allResults.find((r) => r.name === "Keyword overlap")!;
  const ours = allResults.find((r) => r.name === "YC Match (ours)")!;

  console.log("\n=== Improvement over baselines ===");
  for (const key of metricKeys) {
    const vsRandom = random.metrics[key] > 0
      ? `+${(((ours.metrics[key] - random.metrics[key]) / random.metrics[key]) * 100).toFixed(0)}%`
      : "N/A";
    const vsKeyword = keyword.metrics[key] > 0
      ? `+${(((ours.metrics[key] - keyword.metrics[key]) / keyword.metrics[key]) * 100).toFixed(0)}%`
      : "N/A";
    console.log(`  ${key.padEnd(14)} vs Random: ${vsRandom.padStart(7)}  │  vs Keyword: ${vsKeyword.padStart(7)}`);
  }

  // Save report
  const report = {
    generated: new Date().toISOString(),
    testResumes: testResumes.length,
    testCompanies: testCompanies.length,
    groundTruthLabels: labels.length,
    results: allResults,
    improvements: {
      vsRandom: Object.fromEntries(
        metricKeys.map((k) => [k, random.metrics[k] > 0 ? (ours.metrics[k] - random.metrics[k]) / random.metrics[k] : 0])
      ),
      vsKeyword: Object.fromEntries(
        metricKeys.map((k) => [k, keyword.metrics[k] > 0 ? (ours.metrics[k] - keyword.metrics[k]) / keyword.metrics[k] : 0])
      ),
    },
    groundTruth: labels,
  };

  writeFileSync("benchmark-report.json", JSON.stringify(report, null, 2));
  console.log("\nFull report saved to benchmark-report.json");
}

runBenchmark().catch(console.error);

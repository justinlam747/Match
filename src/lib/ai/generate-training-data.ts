/**
 * Generate fine-tuning training data for the scoring model.
 *
 * Uses Claude to create high-quality labeled examples of:
 *   Input:  resume summary + company description
 *   Output: JSON with techScore, industryScore, stageScore, hiringScore, explanation
 *
 * The generated JSONL file can be used to fine-tune Qwen2.5 / Llama 3
 * on Google Colab with Unsloth (free T4 GPU).
 *
 * Usage:
 *   ANTHROPIC_API_KEY=sk-... npx tsx src/lib/ai/generate-training-data.ts
 *
 * Output:
 *   training-data.jsonl  — ready for fine-tuning
 */

import Anthropic from "@anthropic-ai/sdk";
import { writeFileSync } from "fs";

const anthropic = new Anthropic();

/* ── Diverse resume profiles ── */

const resumeProfiles = [
  {
    summary: "Senior fullstack engineer, 5 years. TypeScript, React, Next.js, Node.js, PostgreSQL, AWS, Docker. Previously at Stripe (payments) and Vercel (dev tools). Strong in distributed systems and API design.",
    skills: "TypeScript, React, Next.js, Node.js, PostgreSQL, AWS, Docker, Redis, GraphQL, Go",
    industries: "Fintech, Developer Tools",
    seniority: "senior",
    years: 5,
  },
  {
    summary: "ML engineer, 4 years. Python, PyTorch, TensorFlow, GCP, BigQuery. Published at NeurIPS. Previously at Google (recommendations) and Hugging Face (LLM fine-tuning). Expert in NLP and computer vision.",
    skills: "Python, PyTorch, TensorFlow, GCP, BigQuery, scikit-learn, CUDA, MLflow, Pandas, R",
    industries: "AI/ML, Technology",
    seniority: "mid",
    years: 4,
  },
  {
    summary: "Mobile engineer, 3.5 years. React Native, Swift, TypeScript, Firebase. Previously at Robinhood (crypto trading) and Instagram (Reels). Consumer-scale experience with 5M+ users.",
    skills: "React Native, Swift, TypeScript, Firebase, Node.js, SQLite, Xcode, Figma",
    industries: "Fintech, Social Media, Consumer",
    seniority: "mid",
    years: 3.5,
  },
  {
    summary: "Backend engineer, 2 years. Python, Django, PostgreSQL, AWS. Built microservices at a Series A SaaS company. Strong in databases and cloud infrastructure.",
    skills: "Python, Django, PostgreSQL, AWS, Docker, Redis, Celery, Linux",
    industries: "B2B SaaS",
    seniority: "junior",
    years: 2,
  },
  {
    summary: "Data engineer, 6 years. Python, Spark, Airflow, Snowflake, dbt, AWS, Terraform. Built data pipelines processing 10TB/day at Uber. Expert in ETL and data warehousing.",
    skills: "Python, Spark, Airflow, Snowflake, dbt, AWS, Terraform, Kafka, SQL, Kubernetes",
    industries: "Transportation, Data Infrastructure",
    seniority: "senior",
    years: 6,
  },
  {
    summary: "Frontend engineer, 1 year. JavaScript, React, CSS, Figma. Recent CS grad from UC Berkeley. Internship at a YC startup building dashboards.",
    skills: "JavaScript, React, HTML, CSS, Figma, Git, Python",
    industries: "Startups",
    seniority: "junior",
    years: 1,
  },
  {
    summary: "DevOps/SRE, 4 years. Kubernetes, Terraform, AWS, GCP, Docker, Prometheus, Grafana. Previously at Datadog. Expert in CI/CD, monitoring, and infrastructure automation.",
    skills: "Kubernetes, Terraform, AWS, GCP, Docker, Prometheus, Grafana, Linux, Go, Python, CI/CD, Ansible",
    industries: "Developer Tools, Cloud Infrastructure",
    seniority: "mid",
    years: 4,
  },
  {
    summary: "Security engineer, 3 years. Python, Go, AWS Security, Burp Suite. Previously at a Series B security startup. OSCP certified. Experience in penetration testing and incident response.",
    skills: "Python, Go, AWS, Burp Suite, Wireshark, Linux, Docker, Terraform",
    industries: "Cybersecurity, B2B",
    seniority: "mid",
    years: 3,
  },
];

/* ── Diverse company profiles ── */

const companyProfiles = [
  { name: "PayFlex", desc: "API-first payment infrastructure for emerging markets. Go microservices on AWS, processing $2B+ annually.", tech: "Go, TypeScript, React, PostgreSQL, AWS, Kubernetes, Redis", industries: "Fintech, Payments, B2B", stage: "series_a", batch: "W24", hiring: true },
  { name: "NeuralForge", desc: "Foundation models for scientific research. Predicts protein structures 100x faster.", tech: "Python, PyTorch, CUDA, C++, GCP, Kubernetes", industries: "AI/ML, Biotech", stage: "seed", batch: "W25", hiring: true },
  { name: "LoopChat", desc: "Gen-Z social messaging with disappearing group chats and AI content tools. 2M MAU.", tech: "React Native, TypeScript, Firebase, Swift, Node.js", industries: "Social Media, Consumer", stage: "series_a", batch: "S24", hiring: true },
  { name: "DevShip", desc: "Auto-generates CI/CD pipelines and infra-as-code from your codebase.", tech: "TypeScript, Go, React, Next.js, Terraform, Docker, AWS, PostgreSQL", industries: "Developer Tools, DevOps, B2B", stage: "seed", batch: "W25", hiring: true },
  { name: "MedScribe", desc: "AI medical documentation — converts doctor-patient conversations to clinical notes.", tech: "Python, PyTorch, FastAPI, React, AWS, PostgreSQL", industries: "Healthcare, AI/ML, B2B", stage: "series_a", batch: "S24", hiring: true },
  { name: "FreightOS", desc: "Digital freight forwarding platform. Automates quotes, booking, tracking for international shipments.", tech: "Java, Spring Boot, React, PostgreSQL, AWS, Kafka", industries: "Logistics, Supply Chain, B2B", stage: "growth", batch: "W22", hiring: false },
  { name: "TerraWatch", desc: "Climate monitoring using satellite imagery and ML for governments and NGOs.", tech: "Python, TensorFlow, GCP, BigQuery, React, PostGIS", industries: "Climate Tech, Government", stage: "seed", batch: "W25", hiring: false },
  { name: "DataBrew", desc: "Modern data warehouse for startups. One-click ETL, SQL analytics, dashboards on DuckDB.", tech: "Rust, TypeScript, React, DuckDB, Python, Docker, AWS", industries: "Data Infrastructure, Developer Tools, B2B", stage: "seed", batch: "W25", hiring: true },
  { name: "PixelCraft", desc: "No-code 3D product mockups and AR experiences for e-commerce brands.", tech: "TypeScript, Three.js, WebGL, React, Node.js, MongoDB", industries: "Design Tools, E-commerce, AR/VR", stage: "seed", batch: "W25", hiring: false },
  { name: "Nomad Health", desc: "Telemedicine for digital nomads. Connects travelers with local doctors.", tech: "React Native, TypeScript, Firebase, Node.js, Stripe", industries: "Healthcare, Consumer, Travel", stage: "seed", batch: "W25", hiring: false },
  { name: "CodeReview AI", desc: "AI code review catching bugs, security vulns, and style issues pre-production.", tech: "Python, TypeScript, React, Next.js, PostgreSQL, AWS, Docker", industries: "Developer Tools, AI/ML, B2B", stage: "seed", batch: "W25", hiring: true },
  { name: "ShieldOps", desc: "Cloud security posture management. Scans AWS/GCP infra for misconfigurations and compliance violations.", tech: "Go, Python, AWS, GCP, Terraform, React, PostgreSQL", industries: "Cybersecurity, Cloud, B2B", stage: "seed", batch: "W25", hiring: true },
  { name: "FleetAI", desc: "Autonomous fleet management for last-mile delivery. Computer vision + route optimization.", tech: "Python, PyTorch, C++, React, PostgreSQL, AWS, ROS", industries: "Logistics, AI/ML, Autonomous Vehicles", stage: "seed", batch: "W25", hiring: true },
  { name: "StackPay", desc: "Payroll and benefits platform for startups. Automates compliance across 50 states.", tech: "Ruby, Rails, React, PostgreSQL, AWS, Stripe", industries: "Fintech, HR Tech, B2B", stage: "series_a", batch: "S24", hiring: true },
  { name: "GridScale", desc: "Energy grid optimization using ML. Helps utilities balance renewable energy supply and demand.", tech: "Python, TensorFlow, FastAPI, React, PostgreSQL, AWS", industries: "Energy, Climate Tech, AI/ML", stage: "seed", batch: "W25", hiring: false },
];

/* ── System prompt for the scoring teacher ── */

const SYSTEM_PROMPT = `You are an expert technical recruiter scoring resume-company matches. You must output ONLY valid JSON.

Score each dimension 0-25:
- techScore: How well the candidate's technical skills match the company's stack. Consider exact matches, related technologies, and transferable skills. 0=no overlap, 25=perfect stack match.
- industryScore: How relevant the candidate's industry experience is. Consider direct matches, adjacent industries, and transferable domain knowledge. 0=completely unrelated, 25=exact domain match.
- stageScore: How well the candidate's seniority fits the company stage. Seniors thrive at seed (leadership), juniors at series_a (mentorship available), mid at growth (scale). Consider the nuance.
- hiringScore: Based on hiring signals — is the company actively hiring? Careers page, recent posts, eng roles. 0-5=not hiring, 15-25=actively hiring engineers.

Also provide a 2-sentence explanation of the match quality.

Output format (ONLY this JSON, nothing else):
{"techScore": N, "industryScore": N, "stageScore": N, "hiringScore": N, "explanation": "..."}`;

/* ── Generate training examples ── */

interface TrainingExample {
  messages: { role: string; content: string }[];
}

async function generateExamples(): Promise<TrainingExample[]> {
  const examples: TrainingExample[] = [];
  let count = 0;
  const total = resumeProfiles.length * companyProfiles.length;

  for (const resume of resumeProfiles) {
    for (const company of companyProfiles) {
      count++;
      process.stdout.write(`\r  Generating ${count}/${total}...`);

      const userPrompt = `Score this match:

CANDIDATE:
- Summary: ${resume.summary}
- Skills: ${resume.skills}
- Industries: ${resume.industries}
- Seniority: ${resume.seniority} (${resume.years} years)

COMPANY: ${company.name} (YC ${company.batch}, ${company.stage})
- Description: ${company.desc}
- Tech stack: ${company.tech}
- Industries: ${company.industries}
- Actively hiring: ${company.hiring ? "Yes" : "No"}`;

      try {
        const response = await anthropic.messages.create({
          model: "claude-haiku-4-5-20251001",
          max_tokens: 256,
          system: SYSTEM_PROMPT,
          messages: [{ role: "user", content: userPrompt }],
        });

        const text = response.content[0].type === "text" ? response.content[0].text : "";
        // Validate it's valid JSON
        JSON.parse(text);

        examples.push({
          messages: [
            { role: "system", content: SYSTEM_PROMPT },
            { role: "user", content: userPrompt },
            { role: "assistant", content: text },
          ],
        });
      } catch (err) {
        // Skip failed examples
        console.error(`\n  Skipped ${resume.summary.slice(0, 30)}... × ${company.name}: ${err}`);
      }

      // Rate limit: 200ms between calls
      await new Promise((r) => setTimeout(r, 200));
    }
  }

  return examples;
}

async function main() {
  console.log("=== Training Data Generator ===\n");
  console.log(`Generating ${resumeProfiles.length} resumes × ${companyProfiles.length} companies = ${resumeProfiles.length * companyProfiles.length} examples\n`);

  const examples = await generateExamples();

  console.log(`\n\nGenerated ${examples.length} training examples`);

  // Write JSONL (one JSON per line — standard fine-tuning format)
  const jsonl = examples.map((e) => JSON.stringify(e)).join("\n");
  writeFileSync("training-data.jsonl", jsonl);
  console.log("Saved to training-data.jsonl");

  // Also write a train/val split (90/10)
  const shuffled = examples.sort(() => Math.random() - 0.5);
  const splitIdx = Math.floor(shuffled.length * 0.9);
  const train = shuffled.slice(0, splitIdx);
  const val = shuffled.slice(splitIdx);

  writeFileSync("train.jsonl", train.map((e) => JSON.stringify(e)).join("\n"));
  writeFileSync("val.jsonl", val.map((e) => JSON.stringify(e)).join("\n"));
  console.log(`Split: ${train.length} train, ${val.length} val`);

  // Cost estimate
  const avgTokens = 400; // rough estimate per example
  const totalTokens = examples.length * avgTokens;
  console.log(`\nApprox cost: ~$${((totalTokens / 1_000_000) * 0.25).toFixed(2)} (Haiku input) + ~$${((totalTokens / 1_000_000) * 1.25).toFixed(2)} (Haiku output)`);
  console.log("\nNext steps:");
  console.log("  1. Upload train.jsonl to Google Colab");
  console.log("  2. Run the fine-tuning notebook (see finetune-colab.py)");
  console.log("  3. Push model to Hugging Face");
  console.log("  4. Use via HF Inference API (free) or Groq");
}

main().catch(console.error);

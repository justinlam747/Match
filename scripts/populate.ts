/**
 * Populate the company database from YC OSS API + generate embeddings.
 *
 * Usage:
 *   npx tsx scripts/populate.ts                # import + embed
 *   npx tsx scripts/populate.ts --import-only  # just import
 *   npx tsx scripts/populate.ts --embed-only   # just embed
 *   npx tsx scripts/populate.ts --limit 50     # limit per step
 */

import { config } from "dotenv";
config({ path: ".env.local" });

import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";
import { eq, isNull } from "drizzle-orm";
import * as schema from "../src/lib/db/schema";
import OpenAI from "openai";

const client = postgres(process.env.DATABASE_URL!);
const db = drizzle(client, { schema });
const { ycCompanies } = schema;

// ── Args ──

const args = process.argv.slice(2);
const importOnly = args.includes("--import-only");
const embedOnly = args.includes("--embed-only");
const runAll = !importOnly && !embedOnly;
const limitIdx = args.indexOf("--limit");
const LIMIT = limitIdx !== -1 ? parseInt(args[limitIdx + 1], 10) : 0;

function log(msg: string) {
  console.log(`[${new Date().toLocaleTimeString()}] ${msg}`);
}

// ── Step 1: Import from YC OSS API ──

interface YCCompany {
  name: string;
  slug: string;
  website: string;
  one_liner: string;
  long_description: string;
  batch: string;
  status: string;
  industries: string[];
  tags: string[];
  stage: string;
  team_size: number;
  isHiring: boolean;
  top_company: boolean;
  all_locations: string;
  small_logo_thumb_url: string;
  url: string;
  subindustry: string;
}

async function importCompanies() {
  log("Fetching from YC OSS API...");
  const res = await fetch("https://yc-oss.github.io/api/companies/all.json");
  if (!res.ok) throw new Error(`API returned ${res.status}`);

  let companies: YCCompany[] = await res.json();
  companies = companies.filter((c) => c.status === "Active");
  log(`${companies.length} active companies`);

  if (LIMIT > 0) {
    companies = companies.slice(0, LIMIT);
    log(`Limited to ${LIMIT}`);
  }

  let imported = 0;
  let updated = 0;

  for (const c of companies) {
    try {
      const [existing] = await db
        .select({ id: ycCompanies.id })
        .from(ycCompanies)
        .where(eq(ycCompanies.slug, c.slug))
        .limit(1);

      const values = {
        name: c.name,
        slug: c.slug,
        batch: c.batch || null,
        description: c.one_liner || null,
        oneLiner: c.one_liner || null,
        longDescription: c.long_description || null,
        industries: c.industries || [],
        tags: c.tags || [],
        stage: c.stage || null,
        status: c.status || null,
        teamSize: c.team_size || null,
        website: c.website || null,
        ycUrl: c.url || null,
        logoUrl: c.small_logo_thumb_url || null,
        location: c.all_locations || null,
        isHiring: c.isHiring ?? false,
      };

      if (existing) {
        await db.update(ycCompanies).set(values).where(eq(ycCompanies.slug, c.slug));
        updated++;
      } else {
        await db.insert(ycCompanies).values(values);
        imported++;
      }
    } catch {}

    if ((imported + updated) % 200 === 0) {
      log(`  ${imported + updated}/${companies.length}`);
    }
  }

  log(`Import: ${imported} new, ${updated} updated`);
}

// ── Step 2: Generate embeddings ──

const NOISE_INDUSTRIES = new Set(["b2b", "b2c", "saas"]);

function buildSummary(c: typeof ycCompanies.$inferSelect): string {
  const cleanIndustries = (c.industries || [])
    .filter((i) => !NOISE_INDUSTRIES.has(i.toLowerCase()));

  const parts = [
    // Industries first and repeated — primary matching signal
    cleanIndustries.length
      ? `Industry: ${cleanIndustries.join(", ")}. Domain: ${cleanIndustries.join(", ")}.`
      : null,
    c.name,
    c.oneLiner,
    c.longDescription,
    c.tags?.length ? `Focus areas: ${c.tags.join(", ")}` : null,
    // Tech last, minimal weight
    c.techStack?.length ? `Tech: ${c.techStack.join(", ")}` : null,
  ];
  return parts.filter(Boolean).join("\n");
}

async function embedCompanies() {
  if (!process.env.OPENAI_API_KEY) {
    log("ERROR: OPENAI_API_KEY required for embeddings");
    return;
  }

  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

  const query = db.select().from(ycCompanies).where(isNull(ycCompanies.embedding));
  const toEmbed = LIMIT > 0 ? await query.limit(LIMIT) : await query;
  log(`Embedding ${toEmbed.length} companies...`);

  const BATCH = 100;
  let done = 0;
  let failed = 0;

  for (let i = 0; i < toEmbed.length; i += BATCH) {
    const batch = toEmbed.slice(i, i + BATCH);
    const texts = batch.map((c) => buildSummary(c).slice(0, 8000));

    try {
      const res = await openai.embeddings.create({
        model: "text-embedding-3-small",
        input: texts,
      });

      for (let j = 0; j < batch.length; j++) {
        await db
          .update(ycCompanies)
          .set({ embedding: res.data[j].embedding })
          .where(eq(ycCompanies.id, batch[j].id));
        done++;
      }
    } catch (err) {
      log(`  Batch failed: ${err instanceof Error ? err.message : "unknown"}`);
      failed += batch.length;
    }

    log(`  ${done + failed}/${toEmbed.length}`);
    await new Promise((r) => setTimeout(r, 200));
  }

  log(`Embed: ${done} done, ${failed} failed`);
}

// ── Main ──

async function main() {
  try {
    if (runAll || importOnly) await importCompanies();
    if (runAll || embedOnly) await embedCompanies();
    log("Done!");
  } catch (err) {
    console.error("Fatal:", err);
  } finally {
    await client.end();
  }
}

main();

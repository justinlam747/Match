import {
  pgTable,
  uuid,
  text,
  timestamp,
  jsonb,
  real,
  integer,
  boolean,
  pgEnum,
  customType,
  index,
} from "drizzle-orm/pg-core";

const vector = customType<{ data: number[]; driverData: string }>({
  dataType() {
    return "vector(1536)";
  },
  toDriver(value: number[]) {
    return `[${value.join(",")}]`;
  },
  fromDriver(value: string) {
    return JSON.parse(value) as number[];
  },
});

export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  email: text("email").notNull(),
  avatarUrl: text("avatar_url"),
  avatarSource: text("avatar_source"),
  avatarOptions: jsonb("avatar_options").$type<{ google?: string; linkedin?: string; github?: string }>(),
  tags: text("tags").array().default([]),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const docTypeEnum = pgEnum("doc_type", [
  "resume",
  "portfolio",
  "github",
  "linkedin",
  "website",
  "other",
]);

export const documents = pgTable("documents", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id")
    .references(() => users.id)
    .notNull(),
  type: docTypeEnum("type").notNull(),
  title: text("title").notNull(),
  sourceUrl: text("source_url"),
  rawText: text("raw_text").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (t) => [index("documents_user_id_idx").on(t.userId)]);

export const resumes = pgTable("resumes", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id")
    .references(() => users.id)
    .notNull(),
  name: text("name").notNull().default("Untitled Resume"),
  rawText: text("raw_text").notNull(),
  parsedData: jsonb("parsed_data").$type<ParsedResume>(),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (t) => [index("resumes_user_id_idx").on(t.userId)]);

export const ycCompanies = pgTable("yc_companies", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  slug: text("slug").unique().notNull(),
  batch: text("batch"),
  description: text("description"),
  oneLiner: text("one_liner"),
  longDescription: text("long_description"),
  industries: text("industries").array(),
  tags: text("tags").array(),
  techStack: text("tech_stack").array(),
  stage: text("stage"),
  status: text("status"),
  teamSize: integer("team_size"),
  website: text("website"),
  ycUrl: text("yc_url"),
  logoUrl: text("logo_url"),
  location: text("location"),
  isHiring: boolean("is_hiring").default(false),
  hiringSignals: jsonb("hiring_signals").$type<HiringSignals>(),
  archetype: text("archetype"),
  embedding: vector("embedding"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const resumeEmbeddings = pgTable("resume_embeddings", {
  id: uuid("id").primaryKey().defaultRandom(),
  resumeId: uuid("resume_id")
    .references(() => resumes.id)
    .notNull(),
  embedding: vector("embedding"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (t) => [index("resume_embeddings_resume_id_idx").on(t.resumeId)]);

export const matchScores = pgTable("match_scores", {
  id: uuid("id").primaryKey().defaultRandom(),
  resumeId: uuid("resume_id")
    .references(() => resumes.id)
    .notNull(),
  companyId: uuid("company_id")
    .references(() => ycCompanies.id)
    .notNull(),
  overallScore: real("overall_score").notNull(),
  techScore: real("tech_score").notNull(),
  industryScore: real("industry_score").notNull(),
  stageScore: real("stage_score").notNull(),
  hiringScore: real("hiring_score").notNull(),
  archetype: text("archetype"),
  compensationScore: real("compensation_score"),
  cultureScore: real("culture_score"),
  redFlagScore: real("red_flag_score"),
  northStarScore: real("north_star_score"),
  grade: text("grade"),
  gradeBreakdown: jsonb("grade_breakdown").$type<GradeBreakdown>(),
  explanation: text("explanation"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (t) => [
  index("match_scores_resume_id_idx").on(t.resumeId),
  index("match_scores_company_id_idx").on(t.companyId),
]);

export const aiProviderEnum = pgEnum("ai_provider", ["anthropic", "openai"]);

export const apiKeys = pgTable("api_keys", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id")
    .references(() => users.id)
    .notNull(),
  provider: aiProviderEnum("provider").notNull(),
  encryptedKey: text("encrypted_key").notNull(),
  keyHint: text("key_hint").notNull(), // e.g. "sk-ant-...7x2f"
  iv: text("iv").notNull(),
  authTag: text("auth_tag").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const userProfiles = pgTable("user_profiles", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id")
    .references(() => users.id)
    .notNull()
    .unique(),
  targetRoles: text("target_roles").array().default([]).notNull(),
  targetArchetypes: text("target_archetypes").array().default([]).notNull(),
  professionalNarrative: text("professional_narrative"),
  exitNarrative: text("exit_narrative"),
  compensationTarget: integer("compensation_target"),
  compensationMinimum: integer("compensation_minimum"),
  compensationCurrency: text("compensation_currency").default("USD").notNull(),
  locationPreference: text("location_preference"),
  remotePreference: text("remote_preference"),
  visaStatus: text("visa_status"),
  timezone: text("timezone"),
  signatureStrengths: text("signature_strengths").array().default([]).notNull(),
  portfolioUrls: text("portfolio_urls").array().default([]).notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (t) => [index("user_profiles_user_id_idx").on(t.userId)]);

export type UserProfileRow = typeof userProfiles.$inferSelect;

// Types

export interface ParsedResume {
  name: string;
  email: string;
  skills: {
    languages: string[];
    frameworks: string[];
    tools: string[];
    databases: string[];
    cloud: string[];
    other: string[];
  };
  experience: {
    company: string;
    title: string;
    duration_months: number;
    industry: string;
    highlights: string[];
    tech_used: string[];
  }[];
  education: {
    school: string;
    degree: string;
    field: string;
    year: number;
  };
  industries_worked_in: string[];
  seniority_level: "intern" | "junior" | "mid" | "senior";
  years_of_experience: number;
  standout_signals: string[];
}

export interface HiringSignals {
  has_careers_page?: boolean;
  recent_job_posts?: number;
  eng_roles_open?: boolean;
}

export type Grade = "A" | "B" | "C" | "D" | "E" | "F";

export interface GradeBreakdown {
  tech?: Grade;
  industry?: Grade;
  stage?: Grade;
  hiring?: Grade;
  compensation?: Grade;
  culture?: Grade;
  redFlag?: Grade;
  northStar?: Grade;
}

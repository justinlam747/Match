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

export const emailStatusEnum = pgEnum("email_status", [
  "draft",
  "edited",
  "sent",
  "opened",
  "replied",
  "bounced",
]);

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
  extractedData: jsonb("extracted_data"),
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
  fileUrl: text("file_url"),
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
  isTopCompany: boolean("is_top_company").default(false),
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

export const contacts = pgTable("contacts", {
  id: uuid("id").primaryKey().defaultRandom(),
  companyId: uuid("company_id")
    .references(() => ycCompanies.id)
    .notNull(),
  name: text("name").notNull(),
  title: text("title"),
  email: text("email"),
  emailVerified: boolean("email_verified").default(false),
  source: text("source"),
  linkedinUrl: text("linkedin_url"),
  foundAt: timestamp("found_at").defaultNow(),
}, (t) => [index("contacts_company_id_idx").on(t.companyId)]);

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

export const emailProviderEnum = pgEnum("email_provider", ["gmail", "outlook"]);

export const emailConnections = pgTable("email_connections", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id")
    .references(() => users.id)
    .notNull(),
  provider: emailProviderEnum("provider").notNull(),
  emailAddress: text("email_address").notNull(),
  accessTokenEnc: text("access_token_enc").notNull(),
  accessTokenIv: text("access_token_iv").notNull(),
  accessTokenTag: text("access_token_tag").notNull(),
  refreshTokenEnc: text("refresh_token_enc").notNull(),
  refreshTokenIv: text("refresh_token_iv").notNull(),
  refreshTokenTag: text("refresh_token_tag").notNull(),
  tokenExpiresAt: timestamp("token_expires_at").notNull(),
  connectedAt: timestamp("connected_at").defaultNow().notNull(),
});

export const emails = pgTable("emails", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id")
    .references(() => users.id)
    .notNull(),
  contactId: uuid("contact_id")
    .references(() => contacts.id)
    .notNull(),
  matchScoreId: uuid("match_score_id").references(() => matchScores.id),
  subject: text("subject").notNull(),
  body: text("body").notNull(),
  status: emailStatusEnum("status").default("draft").notNull(),
  sequencePosition: integer("sequence_position").default(1),
  sentAt: timestamp("sent_at"),
  openedAt: timestamp("opened_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (t) => [
  index("emails_user_id_idx").on(t.userId),
  index("emails_contact_id_idx").on(t.contactId),
]);

export const userPreferences = pgTable("user_preferences", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id")
    .references(() => users.id)
    .notNull()
    .unique(),
  theme: text("theme").default("system").notNull(), // "light" | "dark" | "system"
  emailTone: text("email_tone").default("professional").notNull(), // "professional" | "casual" | "friendly"
  minMatchScore: real("min_match_score").default(0.5).notNull(),
  notifyOnNewMatches: boolean("notify_on_new_matches").default(true).notNull(),
  notifyOnEmailReplies: boolean("notify_on_email_replies").default(true).notNull(),
  preferredProvider: aiProviderEnum("preferred_provider"),
  scoreWeights: jsonb("score_weights").$type<ScoreWeights>(),
  titleFilterPositive: text("title_filter_positive").array(),
  titleFilterNegative: text("title_filter_negative").array(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const agentStatusEnum = pgEnum("agent_status", [
  "pending",
  "running",
  "completed",
  "failed",
  "paused",
]);

export const agentRuns = pgTable("agent_runs", {
  id: uuid("id").primaryKey().defaultRandom(),
  agentType: text("agent_type").notNull(),
  userId: text("user_id").notNull(),
  status: agentStatusEnum("status").default("pending").notNull(),
  input: jsonb("input").$type<Record<string, unknown>>().default({}),
  state: jsonb("state").$type<Record<string, unknown>>().default({}),
  output: jsonb("output").$type<Record<string, unknown>>(),
  error: text("error"),
  parentRunId: uuid("parent_run_id"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  completedAt: timestamp("completed_at"),
}, (t) => [
  index("agent_runs_user_id_idx").on(t.userId),
  index("agent_runs_status_idx").on(t.status),
  index("agent_runs_parent_run_id_idx").on(t.parentRunId),
]);

export const userConfig = pgTable("user_config", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id")
    .references(() => users.id)
    .notNull()
    .unique(),
  emailsPerDay: integer("emails_per_day").default(20).notNull(),
  apiCallsPerHour: integer("api_calls_per_hour").default(60).notNull(),
  maxResumes: integer("max_resumes").default(5).notNull(),
  maxMatchesPerScan: integer("max_matches_per_scan").default(50).notNull(),
  featureFlags: jsonb("feature_flags").$type<FeatureFlags>().default({}),
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

export const atsTypeEnum = pgEnum("ats_type", ["greenhouse", "ashby", "lever", "custom"]);

export const portals = pgTable("portals", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").references(() => users.id),
  name: text("name").notNull(),
  careersUrl: text("careers_url").notNull(),
  apiEndpoint: text("api_endpoint"),
  atsType: atsTypeEnum("ats_type").notNull(),
  scanMethod: text("scan_method"),
  notes: text("notes"),
  isActive: boolean("is_active").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (t) => [
  index("portals_user_id_idx").on(t.userId),
  index("portals_ats_type_idx").on(t.atsType),
]);

export const portalJobs = pgTable("portal_jobs", {
  id: uuid("id").primaryKey().defaultRandom(),
  portalId: uuid("portal_id")
    .references(() => portals.id)
    .notNull(),
  title: text("title").notNull(),
  url: text("url").notNull().unique(),
  description: text("description"),
  location: text("location"),
  postedAt: timestamp("posted_at"),
  discoveredAt: timestamp("discovered_at").defaultNow().notNull(),
  isActive: boolean("is_active").default(true).notNull(),
}, (t) => [
  index("portal_jobs_portal_id_idx").on(t.portalId),
  index("portal_jobs_discovered_at_idx").on(t.discoveredAt),
]);

export const portalScanHistory = pgTable("portal_scan_history", {
  id: uuid("id").primaryKey().defaultRandom(),
  portalId: uuid("portal_id")
    .references(() => portals.id)
    .notNull(),
  scannedAt: timestamp("scanned_at").defaultNow().notNull(),
  jobsFound: integer("jobs_found").default(0).notNull(),
  newJobs: integer("new_jobs").default(0).notNull(),
  error: text("error"),
}, (t) => [index("portal_scan_history_portal_id_idx").on(t.portalId)]);

export type PortalRow = typeof portals.$inferSelect;
export type PortalJobRow = typeof portalJobs.$inferSelect;
export type PortalScanHistoryRow = typeof portalScanHistory.$inferSelect;

export const starStories = pgTable("star_stories", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").notNull(),
  matchId: uuid("match_id"),
  archetype: text("archetype"),
  jdRequirement: text("jd_requirement").notNull(),
  situation: text("situation").notNull(),
  task: text("task").notNull(),
  action: text("action").notNull(),
  result: text("result").notNull(),
  reflection: text("reflection").notNull(),
  tags: text("tags").array().default([]).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (t) => [
  index("star_stories_user_id_idx").on(t.userId),
  index("star_stories_match_id_idx").on(t.matchId),
]);

export type StarStoryRow = typeof starStories.$inferSelect;

export const tailoredResumes = pgTable("tailored_resumes", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").notNull(),
  matchId: uuid("match_id"),
  sourceResumeId: uuid("source_resume_id"),
  jdLanguage: text("jd_language").default("en").notNull(),
  keywords: text("keywords").array().default([]).notNull(),
  coveragePercent: integer("coverage_percent").default(0).notNull(),
  tailoredData: jsonb("tailored_data").notNull(),
  pdfUrl: text("pdf_url"),
  pageSize: text("page_size").default("LETTER").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (t) => [
  index("tailored_resumes_user_id_idx").on(t.userId),
  index("tailored_resumes_match_id_idx").on(t.matchId),
]);

export type TailoredResumeRow = typeof tailoredResumes.$inferSelect;

export const batchJobs = pgTable("batch_jobs", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").notNull(),
  status: text("status").default("pending").notNull(), // pending | running | completed | failed
  totalItems: integer("total_items").default(0).notNull(),
  completedItems: integer("completed_items").default(0).notNull(),
  failedItems: integer("failed_items").default(0).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  completedAt: timestamp("completed_at"),
}, (t) => [index("batch_jobs_user_id_idx").on(t.userId)]);

export const batchJobItems = pgTable("batch_job_items", {
  id: uuid("id").primaryKey().defaultRandom(),
  batchId: uuid("batch_id")
    .references(() => batchJobs.id)
    .notNull(),
  url: text("url").notNull(),
  status: text("status").default("pending").notNull(), // pending | fetching | extracted | scored | failed
  matchId: uuid("match_id"),
  jdCacheKey: text("jd_cache_key"),
  error: text("error"),
  startedAt: timestamp("started_at"),
  completedAt: timestamp("completed_at"),
}, (t) => [
  index("batch_job_items_batch_id_idx").on(t.batchId),
  index("batch_job_items_status_idx").on(t.status),
]);

export const jdCache = pgTable("jd_cache", {
  /** sha256 of the URL — primary key so upserts are cheap. */
  urlHash: text("url_hash").primaryKey(),
  url: text("url").notNull(),
  title: text("title"),
  company: text("company"),
  description: text("description").notNull(),
  requirements: text("requirements").array().default([]).notNull(),
  location: text("location"),
  remotePolicy: text("remote_policy"),
  compensationText: text("compensation_text"),
  fetchedAt: timestamp("fetched_at").defaultNow().notNull(),
});

export type BatchJobRow = typeof batchJobs.$inferSelect;
export type BatchJobItemRow = typeof batchJobItems.$inferSelect;
export type JdCacheRow = typeof jdCache.$inferSelect;

export interface EvaluationBlocks {
  /** Block A — Role summary */
  a?: {
    archetype: string;
    domain: string;
    function: string;
    seniority: string;
    remotePolicy: string | null;
    teamSize: string | null;
  };
  /** Block B — CV match mapping */
  b?: {
    mappings: Array<{
      requirement: string;
      evidence: string;
      gap: "none" | "nice-to-have" | "hard-blocker";
      mitigation?: string;
    }>;
  };
  /** Block C — Level & strategy */
  c?: {
    detectedLevel: string;
    naturalLevel: string;
    sellUpPlan: string;
    downlevelFallback: string;
  };
  /** Block D — Compensation analysis */
  d?: {
    marketRange: string;
    sources: string[];
    verdict: "below" | "within" | "above" | "unknown";
  };
  /** Block E — Personalization plan */
  e?: {
    resumeChanges: string[];
    linkedinChanges: string[];
  };
  /** Block F — Interview prep */
  f?: {
    starStoryCount: number;
    caseStudy: string;
    redFlags: string[];
  };
}

export const evaluationReports = pgTable("evaluation_reports", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").notNull(),
  matchId: uuid("match_id"),
  batchItemId: uuid("batch_item_id"),
  archetype: text("archetype"),
  grade: text("grade"),
  blocks: jsonb("blocks").$type<EvaluationBlocks>().notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (t) => [
  index("evaluation_reports_user_id_idx").on(t.userId),
  index("evaluation_reports_match_id_idx").on(t.matchId),
  index("evaluation_reports_batch_item_id_idx").on(t.batchItemId),
]);

export type EvaluationReportRow = typeof evaluationReports.$inferSelect;

export const llmLogs = pgTable("llm_logs", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: text("user_id"),
  provider: text("provider").notNull(), // anthropic | openai | groq | local
  model: text("model").notNull(),
  endpoint: text("endpoint").notNull(), // chat | embedding | score
  inputTokens: integer("input_tokens").default(0).notNull(),
  outputTokens: integer("output_tokens").default(0).notNull(),
  costCents: real("cost_cents").default(0).notNull(),
  latencyMs: integer("latency_ms").default(0).notNull(),
  status: text("status").default("success").notNull(), // success | error
  error: text("error"),
  metadata: jsonb("metadata").$type<Record<string, unknown>>(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (t) => [
  index("llm_logs_created_at_idx").on(t.createdAt),
  index("llm_logs_user_id_idx").on(t.userId),
]);

// Types

export interface FeatureFlags {
  betaScoring?: boolean;
  bulkEmail?: boolean;
  advancedFilters?: boolean;
}

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

export interface ScoreWeights {
  tech?: number;
  industry?: number;
  stage?: number;
  hiring?: number;
  compensation?: number;
  culture?: number;
  redFlag?: number;
  northStar?: number;
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

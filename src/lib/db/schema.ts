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
} from "drizzle-orm/pg-core";

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
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const resumes = pgTable("resumes", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id")
    .references(() => users.id)
    .notNull(),
  rawText: text("raw_text").notNull(),
  parsedData: jsonb("parsed_data").$type<ParsedResume>(),
  fileUrl: text("file_url"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const ycCompanies = pgTable("yc_companies", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  slug: text("slug").unique().notNull(),
  batch: text("batch"),
  description: text("description"),
  industries: text("industries").array(),
  techStack: text("tech_stack").array(),
  stage: text("stage"),
  teamSize: integer("team_size"),
  website: text("website"),
  ycUrl: text("yc_url"),
  hiringSignals: jsonb("hiring_signals").$type<HiringSignals>(),
  lastScraped: timestamp("last_scraped"),
});

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
});

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
  explanation: text("explanation"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
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
});

export const auditActionEnum = pgEnum("audit_action", [
  "resume.uploaded",
  "resume.parsed",
  "companies.scraped",
  "companies.enriched",
  "matches.scored",
  "contacts.found",
  "email.drafted",
  "email.edited",
  "email.sent",
  "email.opened",
  "email.bounced",
  "email.complained",
  "user.signed_in",
  "user.signed_out",
]);

export const auditLogs = pgTable("audit_logs", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").references(() => users.id),
  action: auditActionEnum("action").notNull(),
  entityType: text("entity_type").notNull(),
  entityId: text("entity_id"),
  metadata: jsonb("metadata").$type<Record<string, unknown>>(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

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

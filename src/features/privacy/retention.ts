import type { PrivacyDataCategory } from "./consent";

export type RetentionConfig = {
  rawCvDays: number;
  rawMediaHours: number;
  transcriptDays: number;
  scorecardDays: number;
  consentRecordDays: number;
  auditLogDays: number;
  exportRequestDays: number;
  deletionRequestDays: number;
};

export type RetentionEnv = Partial<Record<string, string | undefined>>;

export type RetainedDataObject = {
  dataCategory: PrivacyDataCategory;
  createdAt: string;
  transcriptionCompletedAt?: string;
  scoringCompletedAt?: string;
  processedAt?: string;
  deletedAt?: string | null;
  legalHold?: boolean;
};

export const DEFAULT_RETENTION_CONFIG: RetentionConfig = {
  rawCvDays: 30,
  rawMediaHours: 24,
  transcriptDays: 365,
  scorecardDays: 365,
  consentRecordDays: 2555,
  auditLogDays: 2555,
  exportRequestDays: 30,
  deletionRequestDays: 2555,
};

export function parseRetentionConfig(env: RetentionEnv): RetentionConfig {
  return {
    rawCvDays: readPositiveInteger(
      env,
      "RETENTION_DAYS_RAW_CV",
      DEFAULT_RETENTION_CONFIG.rawCvDays,
    ),
    rawMediaHours: readPositiveInteger(
      env,
      "RETENTION_HOURS_RAW_MEDIA",
      DEFAULT_RETENTION_CONFIG.rawMediaHours,
    ),
    transcriptDays: readPositiveInteger(
      env,
      "RETENTION_DAYS_TRANSCRIPTS",
      DEFAULT_RETENTION_CONFIG.transcriptDays,
    ),
    scorecardDays: readPositiveInteger(
      env,
      "RETENTION_DAYS_SCORECARDS",
      DEFAULT_RETENTION_CONFIG.scorecardDays,
    ),
    consentRecordDays: readPositiveInteger(
      env,
      "RETENTION_DAYS_CONSENT_RECORDS",
      DEFAULT_RETENTION_CONFIG.consentRecordDays,
    ),
    auditLogDays: readPositiveInteger(
      env,
      "RETENTION_DAYS_AUDIT_LOGS",
      DEFAULT_RETENTION_CONFIG.auditLogDays,
    ),
    exportRequestDays: readPositiveInteger(
      env,
      "RETENTION_DAYS_EXPORT_REQUESTS",
      DEFAULT_RETENTION_CONFIG.exportRequestDays,
    ),
    deletionRequestDays: readPositiveInteger(
      env,
      "RETENTION_DAYS_DELETION_REQUESTS",
      DEFAULT_RETENTION_CONFIG.deletionRequestDays,
    ),
  };
}

export function getRetentionDeadline(
  object: RetainedDataObject,
  config: RetentionConfig = DEFAULT_RETENTION_CONFIG,
): Date {
  const anchor = getRetentionAnchor(object);

  switch (object.dataCategory) {
    case "raw_cv":
      return addDays(anchor, config.rawCvDays);
    case "raw_interview_media":
      return addHours(anchor, config.rawMediaHours);
    case "interview_transcript":
      return addDays(anchor, config.transcriptDays);
    case "scorecard":
    case "company_match":
    case "human_review":
    case "match_explanation":
      return addDays(anchor, config.scorecardDays);
    case "consent_records":
      return addDays(anchor, config.consentRecordDays);
    case "audit_metadata":
      return addDays(anchor, config.auditLogDays);
    case "candidate_profile":
    case "resume_parse":
      return addDays(anchor, config.transcriptDays);
  }
}

export function isRetentionDeletionDue(
  object: RetainedDataObject,
  now: string,
  config: RetentionConfig = DEFAULT_RETENTION_CONFIG,
): boolean {
  if (object.legalHold || object.deletedAt) {
    return false;
  }

  return parseDate(now).getTime() >= getRetentionDeadline(object, config).getTime();
}

function getRetentionAnchor(object: RetainedDataObject): Date {
  if (object.dataCategory !== "raw_interview_media") {
    return parseDate(object.createdAt);
  }

  const processingDates = [
    object.processedAt,
    object.transcriptionCompletedAt,
    object.scoringCompletedAt,
  ]
    .filter((value): value is string => Boolean(value))
    .map(parseDate);

  if (processingDates.length === 0) {
    return parseDate(object.createdAt);
  }

  return new Date(Math.max(...processingDates.map((date) => date.getTime())));
}

function readPositiveInteger(
  env: RetentionEnv,
  key: string,
  fallback: number,
): number {
  const value = env[key];

  if (value === undefined || value.trim() === "") {
    return fallback;
  }

  const parsed = Number(value);

  if (!Number.isInteger(parsed) || parsed <= 0) {
    throw new Error(`${key} must be a positive integer`);
  }

  return parsed;
}

function addDays(date: Date, days: number): Date {
  return new Date(date.getTime() + days * 24 * 60 * 60 * 1000);
}

function addHours(date: Date, hours: number): Date {
  return new Date(date.getTime() + hours * 60 * 60 * 1000);
}

function parseDate(value: string): Date {
  const parsed = new Date(value);

  if (Number.isNaN(parsed.getTime())) {
    throw new Error(`Invalid date: ${value}`);
  }

  return parsed;
}

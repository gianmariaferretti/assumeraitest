import {
  candidateProfileSchema,
  type AppliedCandidateProfileCorrection,
  type CandidateProfile,
  type CandidateProfileConfirmation,
  type ConfirmCandidateProfileRequest,
  type IdFactory,
  type ResumeParseDraft
} from "./contracts";
import { assertNoProtectedTraitInferences, assertNoScoreFields, assertSafeProfilePath } from "./safety";

export interface ConfirmCandidateProfileOptions {
  readonly now?: Date | string;
  readonly idFactory?: IdFactory;
}

function defaultIdFactory(prefix: string): string {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
}

function asIsoString(value: Date | string | undefined): string {
  if (value instanceof Date) {
    return value.toISOString();
  }

  return value ?? new Date().toISOString();
}

function cloneProfile(profile: CandidateProfile): CandidateProfile {
  return structuredClone(profile);
}

function getPathValue(target: unknown, fieldPath: string): unknown {
  let cursor: unknown = target;

  for (const segment of fieldPath.split(".")) {
    if (cursor === null || typeof cursor !== "object") {
      return undefined;
    }

    cursor = (cursor as Record<string, unknown>)[segment];
  }

  return cursor;
}

function setPathValue(target: Record<string, unknown>, fieldPath: string, value: unknown): void {
  const segments = fieldPath.split(".");
  let cursor: Record<string, unknown> = target;

  for (const segment of segments.slice(0, -1)) {
    const nextValue = cursor[segment];

    if (nextValue === null || typeof nextValue !== "object") {
      throw new Error(`Candidate correction field_path "${fieldPath}" does not exist on the parsed profile.`);
    }

    cursor = nextValue as Record<string, unknown>;
  }

  cursor[segments[segments.length - 1]] = value;
}

export function confirmCandidateProfile(
  draft: ResumeParseDraft,
  request: ConfirmCandidateProfileRequest,
  options: ConfirmCandidateProfileOptions = {}
): CandidateProfileConfirmation {
  if (request.candidate_id !== draft.candidate_id) {
    throw new Error("Candidate confirmation request does not match the parsed profile candidate_id.");
  }

  const idFactory = options.idFactory ?? defaultIdFactory;
  const confirmedAt = asIsoString(request.confirmed_at ?? options.now);
  const profile = cloneProfile(draft.profile);
  const corrections: AppliedCandidateProfileCorrection[] = [];

  for (const correction of request.corrections ?? []) {
    assertSafeProfilePath(correction.field_path);
    assertNoProtectedTraitInferences(correction.corrected_value);
    assertNoScoreFields(correction.corrected_value);

    const previousValue = getPathValue(profile, correction.field_path);

    setPathValue(profile as unknown as Record<string, unknown>, correction.field_path, correction.corrected_value);

    corrections.push({
      correction_id: idFactory("profile_correction"),
      field_path: correction.field_path,
      previous_value: previousValue,
      corrected_value: correction.corrected_value,
      reason: correction.reason,
      corrected_at: confirmedAt
    });
  }

  const confirmedProfile: CandidateProfile = {
    ...profile,
    confirmed_by_candidate: true,
    updated_at: confirmedAt,
    confirmation_metadata: {
      status: "confirmed",
      confirmed_at: confirmedAt,
      confirmed_by: request.confirmed_by,
      correction_count: corrections.length,
      correction_ids: corrections.map((correction) => correction.correction_id),
      audit_event_id: request.audit_event_id
    }
  };

  assertNoProtectedTraitInferences(confirmedProfile);
  assertNoScoreFields(confirmedProfile);

  return {
    confirmation_id: idFactory("profile_confirmation"),
    parse_id: draft.parse_id,
    candidate_id: draft.candidate_id,
    status: "confirmed",
    profile: candidateProfileSchema.parse(confirmedProfile),
    corrections,
    confirmed_by: request.confirmed_by,
    confirmed_at: confirmedAt,
    audit_event_id: request.audit_event_id
  };
}

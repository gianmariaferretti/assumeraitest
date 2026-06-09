import {
  RoleCalibration,
  RoleProfile,
  ValidationIssue,
  validateRoleProfile,
} from "./role-profile";

export interface CalibrationAuditEvent {
  audit_event_id: string;
  event_type: "role_calibration.changed";
  actor_type: "employer_user";
  actor_id: string;
  occurred_at: string;
  target_type: "role";
  target_id: string;
  summary: string;
  details: {
    previous_version: string;
    new_version: string;
    changed_fields: Array<keyof CalibrationChangePatch>;
  };
  correlation_id: string;
}

export type CalibrationChangePatch = Partial<{
  score_bars: Record<string, number>;
  weights: Record<string, number>;
  required_evidence: string[];
  interview_modules: string[];
}>;

export interface CalibrationChangeContext {
  actor_id: string;
  occurred_at: string;
  correlation_id: string;
  audit_event_id?: string;
}

export interface CalibrationChangeResult {
  role: RoleProfile;
  auditEvent: CalibrationAuditEvent;
}

export function createCalibrationChange(
  input: unknown,
  patch: CalibrationChangePatch,
  context: CalibrationChangeContext,
): CalibrationChangeResult {
  const validatedRole = validateRoleProfile(input);
  if (!validatedRole.ok) {
    throw new Error(formatValidationIssues(validatedRole.issues));
  }

  validateContext(context);

  const changedFields = findChangedFields(validatedRole.value.calibration, patch);
  if (changedFields.length === 0) {
    throw new Error("calibration.no_changes: Calibration patch must change at least one field.");
  }

  const previousVersion = validatedRole.value.calibration.version;
  const newVersion = nextCalibrationVersion(previousVersion);
  const auditEventId =
    context.audit_event_id ?? buildAuditEventId(validatedRole.value.role_id, newVersion, context.occurred_at);

  const updatedRole: RoleProfile = deepClone({
    ...validatedRole.value,
    calibration: {
      ...validatedRole.value.calibration,
      ...patch,
      version: newVersion,
      created_by: context.actor_id,
      created_at: context.occurred_at,
      audit_event_id: auditEventId,
    },
    updated_at: context.occurred_at,
  });

  const validatedUpdatedRole = validateRoleProfile(updatedRole);
  if (!validatedUpdatedRole.ok) {
    throw new Error(formatValidationIssues(validatedUpdatedRole.issues));
  }

  return {
    role: validatedUpdatedRole.value,
    auditEvent: {
      audit_event_id: auditEventId,
      event_type: "role_calibration.changed",
      actor_type: "employer_user",
      actor_id: context.actor_id,
      occurred_at: context.occurred_at,
      target_type: "role",
      target_id: validatedRole.value.role_id,
      summary: `Role calibration changed from ${previousVersion} to ${newVersion}.`,
      details: {
        previous_version: previousVersion,
        new_version: newVersion,
        changed_fields: changedFields,
      },
      correlation_id: context.correlation_id,
    },
  };
}

export function nextCalibrationVersion(version: string): string {
  const match = /^(.*?)(\d+)$/.exec(version);
  if (!match) {
    return `${version}-v1`;
  }

  const [, prefix, numericVersion] = match;
  return `${prefix}${Number(numericVersion) + 1}`;
}

function findChangedFields(
  calibration: RoleCalibration,
  patch: CalibrationChangePatch,
): Array<keyof CalibrationChangePatch> {
  return (Object.keys(patch) as Array<keyof CalibrationChangePatch>).filter(
    (key) => JSON.stringify(calibration[key]) !== JSON.stringify(patch[key]),
  );
}

function validateContext(context: CalibrationChangeContext) {
  if (!context.actor_id?.trim()) {
    throw new Error("calibration.actor_required: Calibration changes require an employer user actor.");
  }

  if (!context.occurred_at?.trim()) {
    throw new Error("calibration.timestamp_required: Calibration changes require an occurred_at timestamp.");
  }

  if (!context.correlation_id?.trim()) {
    throw new Error("calibration.correlation_required: Calibration changes require a correlation ID.");
  }
}

function buildAuditEventId(roleId: string, version: string, occurredAt: string) {
  return `audit_${sanitizeIdPart(roleId)}_${sanitizeIdPart(version)}_${sanitizeIdPart(occurredAt)}`;
}

function sanitizeIdPart(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "");
}

function formatValidationIssues(issues: ValidationIssue[]) {
  return issues.map((issue) => `${issue.code}: ${issue.path}`).join("; ");
}

function deepClone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

import type { CandidateResumeProfileReviewField } from "@/features/candidate-flow/resume-profile-pipeline";
import {
  resolveCandidateFlowCopy,
  type CandidateFlowCopy
} from "@/features/interview-flow/candidate-flow-copy";
import type { CandidateInterviewLanguageCode } from "@/features/interview-flow";

export type MinimalProfileReviewSourceField = Pick<
  CandidateResumeProfileReviewField,
  "confidence" | "field_path" | "input_kind" | "label" | "value"
>;

export interface MinimalProfileReviewField extends MinimalProfileReviewSourceField {
  readonly label: string;
}

export interface MinimalProfileReviewGroup {
  readonly id: string;
  readonly title: string;
  readonly description: string;
  readonly fields: readonly MinimalProfileReviewField[];
}

export interface MinimalProfileReviewRequiredField {
  readonly field_path: string;
  readonly label: string;
}

export type MinimalProfileReviewRequiredFieldValidation =
  | { readonly ok: true; readonly missingFields: readonly [] }
  | {
      readonly ok: false;
      readonly missingFields: readonly MinimalProfileReviewRequiredField[];
      readonly message: string;
    };

interface MinimalProfileReviewGroupDefinition {
  readonly id: string;
  readonly fieldPaths: readonly string[];
}

export const minimalProfileReviewRequiredFieldPaths = [
  "contact.full_name",
  "contact.email",
  "preferences.target_roles",
  "preferences.locations",
  "preferences.work_modes"
] as const;

export type MinimalProfileReviewRequiredFieldPath =
  (typeof minimalProfileReviewRequiredFieldPaths)[number];

const staticReviewGroupDefinitions: readonly MinimalProfileReviewGroupDefinition[] = [
  {
    id: "contact",
    fieldPaths: ["contact.full_name", "contact.email", "contact.location"]
  },
  {
    id: "preferences",
    fieldPaths: [
      "preferences.target_roles",
      "preferences.locations",
      "preferences.work_modes"
    ]
  },
  {
    id: "top-skills",
    fieldPaths: ["skills"]
  },
  {
    id: "languages",
    fieldPaths: ["languages"]
  }
];

export function selectMinimalProfileReviewGroups(
  fields: readonly MinimalProfileReviewSourceField[],
  language?: CandidateInterviewLanguageCode
): MinimalProfileReviewGroup[] {
  const copy = resolveCandidateFlowCopy(language);
  const fieldByPath = new Map(fields.map((field) => [field.field_path, field]));
  const contact = buildStaticGroup(staticReviewGroupDefinitions[0], fieldByPath, copy);
  const preferences = buildStaticGroup(staticReviewGroupDefinitions[1], fieldByPath, copy);
  const employmentHistory = buildDynamicGroup(
    "employment-history",
    fields,
    "experience",
    copy
  );
  const education = buildDynamicGroup(
    "education",
    fields,
    "education",
    copy
  );
  const topSkills = buildStaticGroup(staticReviewGroupDefinitions[2], fieldByPath, copy);
  const languages = buildStaticGroup(staticReviewGroupDefinitions[3], fieldByPath, copy);

  return [contact, preferences, employmentHistory, education, topSkills, languages].filter(
    (group): group is MinimalProfileReviewGroup =>
      group !== undefined && group.fields.length > 0
  );
}

export function buildMinimalProfileReviewFormValues(
  formData: FormData,
  fields: readonly MinimalProfileReviewSourceField[]
): Record<string, string> {
  const values: Record<string, string> = {};

  for (const group of selectMinimalProfileReviewGroups(fields)) {
    for (const field of group.fields) {
      const submittedValues = uniqueStrings([
        ...formData.getAll(field.field_path),
        ...formData.getAll(`${field.field_path}.custom`)
      ]
        .filter((value): value is string => typeof value === "string")
        .map((value) => value.trim())
        .filter(Boolean));

      if (
        formData.has(field.field_path) ||
        formData.has(`${field.field_path}.custom`)
      ) {
        values[field.field_path] = submittedValues.join(", ");
      }
    }
  }

  return values;
}

export function isMinimalProfileReviewRequiredField(
  fieldPath: string
): fieldPath is MinimalProfileReviewRequiredFieldPath {
  return minimalProfileReviewRequiredFieldPaths.some((requiredPath) => requiredPath === fieldPath);
}

export function validateMinimalProfileReviewRequiredFields(
  values: Readonly<Record<string, string | undefined>>,
  fields: readonly MinimalProfileReviewSourceField[],
  language?: CandidateInterviewLanguageCode
): MinimalProfileReviewRequiredFieldValidation {
  const copy = resolveCandidateFlowCopy(language);
  const visibleFieldByPath = new Map(
    selectMinimalProfileReviewGroups(fields, language).flatMap((group) =>
      group.fields.map((field) => [field.field_path, field] as const)
    )
  );
  const missingFields = minimalProfileReviewRequiredFieldPaths
    .map((fieldPath) => visibleFieldByPath.get(fieldPath))
    .filter((field): field is MinimalProfileReviewField => field !== undefined)
    .filter((field) => (values[field.field_path] ?? "").trim().length === 0)
    .map((field) => ({
      field_path: field.field_path,
      label: field.label
    }));

  if (missingFields.length === 0) {
    return { ok: true, missingFields: [] };
  }

  return {
    ok: false,
    missingFields,
    message: `${copy.profileConfirm.requiredFieldsMessagePrefix} ${missingFields
      .map((field) => field.label)
      .join(", ")}.`
  };
}

export function formatProfileReviewConfidence(
  confidence: number | null,
  language?: CandidateInterviewLanguageCode
): string {
  if (confidence === null || !Number.isFinite(confidence)) {
    return resolveCandidateFlowCopy(language).profileConfirm.confidenceReview;
  }

  const normalized = confidence > 0 && confidence <= 1 ? confidence * 100 : confidence;
  const roundedConfidence = Math.round(Math.min(100, Math.max(0, normalized)));

  return `${roundedConfidence}%`;
}

function uniqueStrings(values: readonly string[]): string[] {
  return [...new Set(values)];
}

function buildStaticGroup(
  definition: MinimalProfileReviewGroupDefinition | undefined,
  fieldByPath: ReadonlyMap<string, MinimalProfileReviewSourceField>,
  copy: CandidateFlowCopy
): MinimalProfileReviewGroup | undefined {
  if (!definition) {
    return undefined;
  }
  const groupCopy = readStaticGroupCopy(definition.id, copy);

  return {
    id: definition.id,
    title: groupCopy.title,
    description: groupCopy.description,
    fields: definition.fieldPaths
      .map((fieldPath) => fieldByPath.get(fieldPath))
      .filter((field): field is MinimalProfileReviewSourceField => field !== undefined)
      .map((field) => ({
        ...field,
        label: copy.profileConfirm.fieldLabels[field.field_path] ?? field.label
      }))
  };
}

function buildDynamicGroup(
  id: string,
  fields: readonly MinimalProfileReviewSourceField[],
  prefix: "education" | "experience",
  copy: CandidateFlowCopy
): MinimalProfileReviewGroup {
  const groupCopy =
    prefix === "education"
      ? copy.profileConfirm.reviewGroups.education
      : copy.profileConfirm.reviewGroups.employmentHistory;

  return {
    id,
    title: groupCopy.title,
    description: groupCopy.description,
    fields: fields
      .filter((field) => field.field_path.startsWith(`${prefix}.`))
      .sort((left, right) => compareProfileFieldPaths(left.field_path, right.field_path))
      .map((field) => ({
        ...field,
        label: localizeDynamicFieldLabel(field, copy)
      }))
  };
}

function readStaticGroupCopy(id: string, copy: CandidateFlowCopy) {
  switch (id) {
    case "contact":
      return copy.profileConfirm.reviewGroups.contact;
    case "preferences":
      return copy.profileConfirm.reviewGroups.preferences;
    case "top-skills":
      return copy.profileConfirm.reviewGroups.topSkills;
    case "languages":
      return copy.profileConfirm.reviewGroups.languages;
    default:
      return { title: id, description: "" };
  }
}

function localizeDynamicFieldLabel(
  field: MinimalProfileReviewSourceField,
  copy: CandidateFlowCopy
): string {
  const { name } = parseIndexedFieldPath(field.field_path);

  return copy.profileConfirm.dynamicFieldLabels[name] ?? field.label;
}

function compareProfileFieldPaths(left: string, right: string): number {
  const leftParts = parseIndexedFieldPath(left);
  const rightParts = parseIndexedFieldPath(right);

  if (leftParts.index !== rightParts.index) {
    return leftParts.index - rightParts.index;
  }

  return fieldOrder(leftParts.name) - fieldOrder(rightParts.name);
}

function parseIndexedFieldPath(fieldPath: string): { index: number; name: string } {
  const [, index = "0", name = ""] =
    /^(?:education|experience)\.(\d+)\.(.+)$/.exec(fieldPath) ?? [];

  return {
    index: Number.parseInt(index, 10),
    name
  };
}

function fieldOrder(name: string): number {
  const order = [
    "title",
    "company",
    "start_date",
    "end_date",
    "responsibilities",
    "measurable_impact",
    "tools",
    "institution",
    "degree",
    "field",
    "grades",
    "honors",
    "projects"
  ];
  const index = order.indexOf(name);

  return index === -1 ? order.length : index;
}

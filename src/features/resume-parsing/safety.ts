const forbiddenProtectedKeys = new Map<string, string>([
  ["age", "age"],
  ["chronologicalage", "chronological age"],
  ["dateofbirth", "date of birth"],
  ["birthdate", "birth date"],
  ["dob", "date of birth"],
  ["gender", "gender"],
  ["sex", "sex"],
  ["race", "race"],
  ["ethnicity", "ethnicity"],
  ["religion", "religion"],
  ["disability", "disability"],
  ["health", "health"],
  ["pregnancy", "pregnancy"],
  ["caregiving", "caregiving"],
  ["caregivingstatus", "caregiving status"],
  ["familystatus", "family status"],
  ["maritalstatus", "marital status"],
  ["sexualorientation", "sexual orientation"],
  ["nationality", "nationality"],
  ["citizenship", "citizenship"],
  ["nativecountry", "native country"],
  ["accent", "accent"],
  ["personality", "personality"],
  ["emotion", "emotion"],
  ["facialexpression", "facial expression"],
  ["facialexpressions", "facial expressions"],
  ["biometric", "biometric trait"],
  ["biometrics", "biometric traits"],
  ["protectedtrait", "protected trait"],
  ["protectedtraits", "protected traits"],
  ["protectedattribute", "protected attribute"],
  ["protectedattributes", "protected attributes"],
  ["sensitiveinference", "sensitive inference"],
  ["sensitiveinferences", "sensitive inferences"]
]);

const forbiddenScoreKeys = new Set([
  "score",
  "scores",
  "qualityscore",
  "overallresumescreenscore",
  "confidencescore",
  "matchscore",
  "formula",
  "recommendations",
  "riskflags"
]);

const unsafePathSegments = new Set(["__proto__", "prototype", "constructor"]);
const candidateEditableProfileRoots = new Set([
  "contact",
  "education",
  "experience",
  "skills",
  "languages",
  "certifications",
  "portfolio",
  "preferences"
]);

function normalizeKey(key: string): string {
  return key.toLowerCase().replace(/[^a-z0-9]/g, "");
}

function findForbiddenProtectedLabel(normalizedKey: string): string | undefined {
  const exactMatch = forbiddenProtectedKeys.get(normalizedKey);

  if (exactMatch) {
    return exactMatch;
  }

  for (const [forbiddenKey, label] of forbiddenProtectedKeys.entries()) {
    if (forbiddenKey.length >= 5 && normalizedKey.includes(forbiddenKey)) {
      return label;
    }
  }

  return undefined;
}

function hasForbiddenScoreKey(normalizedKey: string): boolean {
  if (forbiddenScoreKeys.has(normalizedKey)) {
    return true;
  }

  return Array.from(forbiddenScoreKeys).some((forbiddenKey) => forbiddenKey.length >= 5 && normalizedKey.includes(forbiddenKey));
}

function walkObjectKeys(value: unknown, callback: (key: string, path: string) => void, path = "$"): void {
  if (Array.isArray(value)) {
    value.forEach((item, index) => walkObjectKeys(item, callback, `${path}.${index}`));
    return;
  }

  if (value === null || typeof value !== "object") {
    return;
  }

  for (const [key, nested] of Object.entries(value as Record<string, unknown>)) {
    const nextPath = `${path}.${key}`;
    callback(key, nextPath);
    walkObjectKeys(nested, callback, nextPath);
  }
}

export function assertNoProtectedTraitInferences(value: unknown): void {
  walkObjectKeys(value, (key, path) => {
    const normalized = normalizeKey(key);
    const forbiddenLabel = findForbiddenProtectedLabel(normalized);

    if (forbiddenLabel) {
      throw new Error(`Resume parser output includes disallowed protected-attribute field "${key}" at ${path} (${forbiddenLabel}).`);
    }
  });
}

export function assertNoScoreFields(value: unknown): void {
  walkObjectKeys(value, (key, path) => {
    if (isAllowedGovernedEnrichmentScorePath(path)) {
      return;
    }

    if (hasForbiddenScoreKey(normalizeKey(key))) {
      throw new Error(`Resume parser output must not include score field "${key}" at ${path}.`);
    }
  });
}

function isAllowedGovernedEnrichmentScorePath(path: string): boolean {
  return /^\$\.profile\.education\.\d+\.university_signal\.score$/.test(path) ||
    /^\$\.education\.\d+\.university_signal\.score$/.test(path);
}

export function assertSafeProfilePath(fieldPath: string): void {
  if (!fieldPath.trim()) {
    throw new Error("Candidate correction field_path must not be empty.");
  }

  const segments = fieldPath.split(".");

  for (const segment of segments) {
    if (!segment || unsafePathSegments.has(segment)) {
      throw new Error(`Candidate correction field_path "${fieldPath}" is unsafe.`);
    }

    const normalizedSegment = normalizeKey(segment);
    const forbiddenLabel = findForbiddenProtectedLabel(normalizedSegment);

    if (forbiddenLabel) {
      throw new Error(`Candidate correction field_path "${fieldPath}" targets disallowed protected attribute (${forbiddenLabel}).`);
    }

    if (hasForbiddenScoreKey(normalizedSegment)) {
      throw new Error(`Candidate correction field_path "${fieldPath}" targets scoring data, which is out of scope for profile confirmation.`);
    }
  }

  if (!candidateEditableProfileRoots.has(segments[0])) {
    throw new Error(`Candidate correction field_path "${fieldPath}" is not a candidate-editable profile field.`);
  }
}

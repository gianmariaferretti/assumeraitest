export type ResumeParserProviderPreference = "anthropic" | "auto" | "local";

type ResumeParserProviderEnv = Readonly<Record<string, string | undefined>>;

export function normalizeResumeParserProvider(
  value: string | undefined
): ResumeParserProviderPreference | undefined {
  const normalized = stripOptionalEnvQuotes(value).toLowerCase();

  if (
    normalized === "anthropic" ||
    normalized === "auto" ||
    normalized === "local"
  ) {
    return normalized;
  }

  return undefined;
}

export function hasAnthropicResumeParserKey(
  env: ResumeParserProviderEnv = process.env
): boolean {
  return stripOptionalEnvQuotes(env.ANTHROPIC_API_KEY).length > 0;
}

export function shouldForceLocalResumeParserForCandidateUpload(
  env: ResumeParserProviderEnv = process.env
): boolean {
  return normalizeResumeParserProvider(env.RESUME_PARSER_PROVIDER) === "local";
}

function stripOptionalEnvQuotes(value: string | undefined): string {
  const trimmed = value?.trim() ?? "";

  if (trimmed.length >= 2) {
    const first = trimmed.at(0);
    const last = trimmed.at(-1);

    if ((first === `"` && last === `"`) || (first === `'` && last === `'`)) {
      return trimmed.slice(1, -1).trim();
    }
  }

  return trimmed;
}

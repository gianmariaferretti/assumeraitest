export const DEFAULT_RAW_CV_RETENTION_DAYS = 30;

export function resolveRawCvRetentionDays(env: Record<string, string | undefined> = process.env): number {
  const configuredValue = env.RETENTION_DAYS_RAW_CV;

  if (configuredValue === undefined || configuredValue.trim() === "") {
    return DEFAULT_RAW_CV_RETENTION_DAYS;
  }

  const parsedValue = Number(configuredValue);

  if (!Number.isInteger(parsedValue) || parsedValue < 0) {
    return DEFAULT_RAW_CV_RETENTION_DAYS;
  }

  return parsedValue;
}


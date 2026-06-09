export const LIVE_INTERVIEW_RESPONSE_WINDOW_SECONDS = 120;
export const LIVE_INTERVIEW_SECOND_CHANCE_LIMIT = 1;
export const RESPONSE_WINDOW_AUTOCONTINUE_SECONDS = 8;

const TIMEOUT_RESPONSE_PLACEHOLDER =
  "No spoken response was captured before the 2-minute response window expired.";

export interface ResponseSecondChanceInput {
  readonly usedSecondChances: number;
}

export function canUseResponseSecondChance({
  usedSecondChances
}: ResponseSecondChanceInput): boolean {
  return usedSecondChances < LIVE_INTERVIEW_SECOND_CHANCE_LIMIT;
}

export function formatResponseWindowRemaining(seconds: number): string {
  const clampedSeconds = Math.max(0, Math.ceil(seconds));
  const minutes = Math.floor(clampedSeconds / 60);
  const remainder = clampedSeconds % 60;

  return `${minutes}:${remainder.toString().padStart(2, "0")}`;
}

export function createTimedOutResponseText(transcript: string): string {
  const trimmedTranscript = transcript.trim();
  return trimmedTranscript || TIMEOUT_RESPONSE_PLACEHOLDER;
}

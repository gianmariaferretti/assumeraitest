import type { DimensionDraft, MatchingScoreInput } from "../engine-types";
import { average, clamp, isNumber } from "../engine-utils";
import { getInterviewEvidenceFit } from "./interview-evidence-fit";
import { getRoleSkillFit } from "./role-skill-fit";

export function getCompanyBarFit(input: MatchingScoreInput): DimensionDraft {
  const bars = Object.values(input.role.calibration.score_bars ?? {});
  const averageBar = bars.length ? average(bars) : 75;
  const upstreamScores = [
    input.resumeScorecard?.overall_resume_screen_score,
    input.interviewScorecard?.overall_interview_score,
  ].filter(isNumber);
  const availableScore = upstreamScores.length ? average(upstreamScores) : average([getRoleSkillFit(input).score, getInterviewEvidenceFit(input).score]);
  const score = averageBar ? clamp((availableScore / averageBar) * 75, 0, 100) : availableScore;

  return {
    score,
    confidence: upstreamScores.length ? 75 : 55,
    evidence: [
      `Compared available candidate evidence with role calibration ${input.role.calibration.version}.`,
    ],
    missing_data: upstreamScores.length ? [] : ["Resume or interview scorecard evidence is incomplete."],
  };
}

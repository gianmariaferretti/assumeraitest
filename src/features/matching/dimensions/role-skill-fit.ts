import type { DimensionDraft, MatchingScoreInput } from "../engine-types";
import {
  candidateHasSkill,
  collectEvidenceForSkills,
  confidenceFromEvidence,
} from "../engine-utils";

export function getRoleSkillFit(input: MatchingScoreInput): DimensionDraft {
  const requiredSkills = input.role.requirements.required_skills ?? [];
  const niceToHaveSkills = input.role.requirements.nice_to_have_skills ?? [];
  const matchedRequired = requiredSkills.filter((skill) => candidateHasSkill(input.candidate, skill));
  const matchedNice = niceToHaveSkills.filter((skill) => candidateHasSkill(input.candidate, skill));
  const requiredScore = requiredSkills.length
    ? (matchedRequired.length / requiredSkills.length) * 75
    : 75;
  const niceScore = niceToHaveSkills.length ? (matchedNice.length / niceToHaveSkills.length) * 25 : 15;
  const upstreamScore = input.resumeScorecard?.scores?.SkillFitScore?.score;
  const score = upstreamScore ?? requiredScore + niceScore;
  const missingRequired = requiredSkills.filter((skill) => !matchedRequired.includes(skill));

  return {
    score,
    confidence: confidenceFromEvidence(input.candidate.skills.length + matchedRequired.length),
    evidence: [
      matchedRequired.length
        ? `Matched required skills: ${matchedRequired.join(", ")}.`
        : "No required-skill evidence matched the role.",
      matchedNice.length ? `Matched nice-to-have skills: ${matchedNice.join(", ")}.` : "",
      ...collectEvidenceForSkills(input.candidate, [...matchedRequired, ...matchedNice]),
    ],
    missing_data: missingRequired.map((skill) => `Required skill evidence missing: ${skill}.`),
  };
}

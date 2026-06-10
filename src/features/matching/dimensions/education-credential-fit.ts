import type { DimensionDraft, MatchingScoreInput } from "../engine-types";
import { average, containsNormalized, isNumber, isString, roundScore } from "../engine-utils";

export function getEducationCredentialFit(input: MatchingScoreInput): DimensionDraft {
  const requiredCertifications = input.role.requirements.certifications ?? [];
  const missingCertifications = requiredCertifications.filter(
    (certification) => !containsNormalized(input.candidate.certifications ?? [], certification),
  );
  const needsUniversityEnrichment = input.candidate.education.some(
    (education) =>
      education.university_signal?.enrichment_needed ||
      education.enrichment_needed ||
      education.university_signal?.scoring_approved === false ||
      education.institution_canonical?.toLowerCase() === "unknown" ||
      (education.university_signal?.confidence ?? education.ranking_confidence ?? 100) < 25,
  );

  if (needsUniversityEnrichment) {
    return {
      score: 50,
      confidence: 45,
      evidence: ["Unknown university uses a neutral prior, not a negative signal."],
      missing_data: ["University enrichment is needed; education is held at a neutral prior."],
    };
  }

  return {
    score: missingCertifications.length
      ? 35
      : roundScore(
          average([
            70,
            ...input.candidate.education
              .map((education) => education.university_signal?.score)
              .filter(isNumber),
          ]),
        ),
    confidence: roundScore(
      average([
        70,
        ...input.candidate.education
          .map((education) => education.university_signal?.confidence)
          .filter(isNumber),
      ]),
    ),
    evidence: input.candidate.education
      .flatMap((education) => [
        education.degree,
        education.field,
        ...(education.projects ?? []),
        ...(education.university_signal?.evidence ?? []),
      ])
      .filter(isString),
    missing_data: missingCertifications.map(
      (certification) => `Credential evidence missing: ${certification}.`,
    ),
  };
}

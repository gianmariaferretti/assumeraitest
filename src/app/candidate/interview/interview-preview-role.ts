import type { RoleProfileInput } from "@/features/interview-flow";
import type { RoleProfile as ResumeScoringRoleProfile } from "@/features/scoring/resume/resume-score";

export const candidateInterviewPreviewRoleForScoring: ResumeScoringRoleProfile = {
  role_id: "role_fake_tech_risk_001",
  company_id: "company_fake_ey_like_001",
  title: "Tech Risk Analyst",
  status: "open",
  seniority: "junior-mid",
  role_type: "consulting",
  location_constraints: ["Italy", "Remote EU"],
  work_modes: ["hybrid", "remote"],
  requirements: {
    required_skills: ["SQL", "Risk analysis", "Client communication"],
    nice_to_have_skills: ["Python", "Power BI", "AI governance"],
    required_languages: [{ language: "English", minimum_level: "B2" }],
    certifications: [],
    hard_gates: [
      {
        gate_type: "language",
        description: "English B2 or higher for client communication",
        lawful_basis_note: "Role requires English client documentation and meetings",
        role_essential: true
      }
    ]
  },
  calibration: {
    version: "role-calibration-v0",
    score_bars: {
      English: 80,
      RiskAnalysis: 75,
      ClientCommunication: 80
    },
    weights: {
      RoleSkillFit: 0.22,
      ExperienceDomainFit: 0.18,
      InterviewEvidenceFit: 0.15,
      LanguageLocationAvailabilityFit: 0.12,
      CandidatePreferenceFit: 0.1,
      CompanyBarFit: 0.1,
      GrowthPotentialFit: 0.07,
      EducationCredentialFit: 0.04,
      MatchConfidence: 0.02
    },
    required_evidence: ["client communication", "structured analysis"],
    interview_modules: ["motivation", "language", "domain", "case"],
    created_by: "employer_user_fixture",
    created_at: "2026-05-17T10:00:00Z",
    audit_event_id: "audit_fixture_role_tech_risk_001"
  },
  created_at: "2026-05-17T10:00:00Z",
  updated_at: "2026-05-17T10:00:00Z"
};

export const candidateInterviewPreviewRole: RoleProfileInput = {
  role_id: candidateInterviewPreviewRoleForScoring.role_id,
  title: candidateInterviewPreviewRoleForScoring.title,
  role_type: candidateInterviewPreviewRoleForScoring.role_type,
  seniority: candidateInterviewPreviewRoleForScoring.seniority,
  requirements: {
    required_skills: candidateInterviewPreviewRoleForScoring.requirements.required_skills,
    nice_to_have_skills: candidateInterviewPreviewRoleForScoring.requirements.nice_to_have_skills,
    required_languages: candidateInterviewPreviewRoleForScoring.requirements.required_languages,
    hard_gates: candidateInterviewPreviewRoleForScoring.requirements.hard_gates
  },
  calibration: {
    version: candidateInterviewPreviewRoleForScoring.calibration.version,
    required_evidence: candidateInterviewPreviewRoleForScoring.calibration.required_evidence,
    interview_modules: candidateInterviewPreviewRoleForScoring.calibration.interview_modules
  }
};

import { createResumeUploadConfig } from "@/features/resume-ingestion";
import { shouldForceLocalResumeParserForCandidateUpload } from "@/features/candidate-flow/resume-parser-provider-config";
import type { CandidateInterviewLanguageCode } from "@/features/interview-flow";

import {
  ResumeUploadForm,
  type ResumeUploadInitialProgressStep
} from "./ResumeUploadForm";

export function CandidateJourney({
  initialInterviewLanguage,
  initialProgressStep = "privacy"
}: {
  readonly initialInterviewLanguage?: CandidateInterviewLanguageCode;
  readonly initialProgressStep?: ResumeUploadInitialProgressStep;
} = {}) {
  const defaultDisableClaudeForTesting =
    shouldForceLocalResumeParserForCandidateUpload(process.env);
  const config = createResumeUploadConfig({
    RETENTION_DAYS_RAW_CV: process.env.RETENTION_DAYS_RAW_CV,
    RESUME_UPLOAD_ALLOWED_EXTENSIONS: process.env.RESUME_UPLOAD_ALLOWED_EXTENSIONS,
    RESUME_UPLOAD_ALLOWED_MIME_TYPES: process.env.RESUME_UPLOAD_ALLOWED_MIME_TYPES,
    RESUME_UPLOAD_MAX_BYTES: process.env.RESUME_UPLOAD_MAX_BYTES
  });

  return (
    <main className="candidate-journey">
      <ResumeUploadForm
        allowedExtensions={config.allowedExtensions}
        defaultDisableClaudeForTesting={defaultDisableClaudeForTesting}
        initialInterviewLanguage={initialInterviewLanguage}
        initialProgressStep={initialProgressStep}
        rawCvRetentionDays={config.rawCvRetentionDays}
      />
    </main>
  );
}

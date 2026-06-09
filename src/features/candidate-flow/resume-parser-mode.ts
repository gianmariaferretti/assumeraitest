export type ResumeParserRuntimeMode = "auto" | "local";

export const resumeParserModeFieldName = "resume_parser_mode";

export function readResumeParserModeFromFormData(
  formData: FormData
): ResumeParserRuntimeMode {
  return formData.get(resumeParserModeFieldName) === "local" ? "local" : "auto";
}

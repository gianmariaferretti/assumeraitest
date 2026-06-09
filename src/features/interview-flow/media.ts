import type { InterviewMode, InterviewSession } from "./types";

export interface InterviewMediaProvider {
  mode: InterviewMode;
  start(session: InterviewSession): Promise<{ transcriptSource: "typed_text" | "transcribed_media" }>;
  cleanupRawMedia(session: InterviewSession): Promise<{ rawMediaDeleted: boolean }>;
}

export const textOnlyInterviewMediaProvider: InterviewMediaProvider = {
  mode: "text",
  async start() {
    return { transcriptSource: "typed_text" };
  },
  async cleanupRawMedia() {
    return { rawMediaDeleted: true };
  }
};

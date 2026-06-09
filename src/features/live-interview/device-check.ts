export const interviewDeviceCheckPath = "/candidate/interview/device-check" as const;
export const interviewStartPath = "/candidate/interview" as const;

export const interviewDeviceCheckAffirmations = [
  "You can do this.",
  "We believe in you.",
  "Your setup looks ready.",
  "Take one calm breath.",
  "Go make your case."
] as const;

export type InterviewDeviceCheckCapabilityId = "camera" | "microphone";

export type InterviewDeviceCheckCapabilityStatus = "ready" | "needs-test";

export interface InterviewDeviceCheckCapability {
  readonly id: InterviewDeviceCheckCapabilityId;
  readonly label: string;
  readonly actionLabel: string;
  readonly readyLabel: string;
  readonly status: InterviewDeviceCheckCapabilityStatus;
}

export interface InterviewDeviceCheckState {
  readonly title: string;
  readonly readyToStart: boolean;
  readonly affirmations: typeof interviewDeviceCheckAffirmations;
  readonly capabilities: readonly InterviewDeviceCheckCapability[];
  readonly startPath: typeof interviewStartPath;
}

export function createInterviewDeviceCheckState({
  cameraReady,
  microphoneReady
}: {
  readonly cameraReady: boolean;
  readonly microphoneReady: boolean;
}): InterviewDeviceCheckState {
  return {
    title: "Check your camera and microphone.",
    readyToStart: cameraReady && microphoneReady,
    affirmations: interviewDeviceCheckAffirmations,
    capabilities: [
      {
        id: "camera",
        label: "Camera",
        actionLabel: "Test camera",
        readyLabel: "Camera ready",
        status: cameraReady ? "ready" : "needs-test"
      },
      {
        id: "microphone",
        label: "Microphone",
        actionLabel: "Test microphone",
        readyLabel: "Microphone ready",
        status: microphoneReady ? "ready" : "needs-test"
      }
    ],
    startPath: interviewStartPath
  };
}

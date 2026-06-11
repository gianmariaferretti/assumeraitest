"use client";

import { useEffect, useMemo, useRef, useState } from "react";

import {
  createInterviewDeviceCheckState,
  type InterviewDeviceCheckCapabilityId
} from "@/features/live-interview";
import {
  resolveCandidateFlowCopy
} from "@/features/interview-flow/candidate-flow-copy";
import type { CandidateInterviewLanguageCode } from "@/features/interview-flow";

import { AnimatedTextCycle } from "./AnimatedTextCycle";
import styles from "./InterviewDevicePrep.module.css";

type DeviceStatus = "idle" | "testing" | "ready" | "blocked";

const COMPLETE_ACTION = "/candidate/interview/device-check/complete";
type WindowWithPrefixedAudioContext = Window &
  typeof globalThis & {
    readonly webkitAudioContext?: typeof AudioContext;
  };

export function InterviewDevicePrep({
  language
}: {
  readonly language?: CandidateInterviewLanguageCode;
}) {
  const copy = resolveCandidateFlowCopy(language).deviceCheck;
  const videoRef = useRef<HTMLVideoElement>(null);
  const cameraStreamRef = useRef<MediaStream | null>(null);
  const microphoneStreamRef = useRef<MediaStream | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const meterFrameRef = useRef<number | null>(null);
  const isMountedRef = useRef(false);
  const [cameraStatus, setCameraStatus] = useState<DeviceStatus>("idle");
  const [microphoneStatus, setMicrophoneStatus] = useState<DeviceStatus>("idle");
  const [cameraMessage, setCameraMessage] = useState(copy.camera.notStarted);
  const [microphoneMessage, setMicrophoneMessage] = useState(copy.microphone.notStarted);
  const [microphoneLevel, setMicrophoneLevel] = useState(0);
  const view = useMemo(
    () =>
      createInterviewDeviceCheckState({
        cameraReady: cameraStatus === "ready",
        microphoneReady: microphoneStatus === "ready"
      }),
    [cameraStatus, microphoneStatus]
  );

  useEffect(() => {
    const video = videoRef.current;
    if (video) {
      video.srcObject = cameraStreamRef.current;
    }
  }, [cameraStatus]);

  useEffect(
    () => {
      isMountedRef.current = true;

      return () => {
        isMountedRef.current = false;
        stopStream(cameraStreamRef.current);
        stopStream(microphoneStreamRef.current);
        if (meterFrameRef.current !== null) {
          window.cancelAnimationFrame(meterFrameRef.current);
        }
        void audioContextRef.current?.close();
      };
    },
    []
  );

  async function testCamera() {
    if (!navigator.mediaDevices?.getUserMedia) {
      setCameraStatus("blocked");
      setCameraMessage(copy.camera.unavailable);
      return;
    }

    setCameraStatus("testing");
    setCameraMessage(copy.camera.opening);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: false,
        video: { facingMode: "user" }
      });
      if (!isMountedRef.current) {
        stopStream(stream);
        return;
      }
      stopStream(cameraStreamRef.current);
      cameraStreamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      setCameraStatus("ready");
      setCameraMessage(copy.camera.ready);
    } catch {
      stopStream(cameraStreamRef.current);
      cameraStreamRef.current = null;
      setCameraStatus("blocked");
      setCameraMessage(copy.camera.blocked);
    }
  }

  async function testMicrophone() {
    if (!navigator.mediaDevices?.getUserMedia) {
      setMicrophoneStatus("blocked");
      setMicrophoneMessage(copy.microphone.unavailable);
      return;
    }

    setMicrophoneStatus("testing");
    setMicrophoneMessage(copy.microphone.listening);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: true,
        video: false
      });
      if (!isMountedRef.current) {
        stopStream(stream);
        return;
      }
      stopStream(microphoneStreamRef.current);
      microphoneStreamRef.current = stream;
      startMicrophoneMeter(stream);
      setMicrophoneStatus("ready");
      setMicrophoneMessage(copy.microphone.ready);
    } catch {
      stopStream(microphoneStreamRef.current);
      microphoneStreamRef.current = null;
      setMicrophoneLevel(0);
      setMicrophoneStatus("blocked");
      setMicrophoneMessage(copy.microphone.blocked);
    }
  }

  function startMicrophoneMeter(stream: MediaStream) {
    if (meterFrameRef.current !== null) {
      window.cancelAnimationFrame(meterFrameRef.current);
    }
    void audioContextRef.current?.close();

    const AudioContextConstructor =
      window.AudioContext ??
      (window as WindowWithPrefixedAudioContext).webkitAudioContext;
    if (!AudioContextConstructor) {
      setMicrophoneLevel(1);
      return;
    }

    const audioContext = new AudioContextConstructor();
    const analyser = audioContext.createAnalyser();
    const source = audioContext.createMediaStreamSource(stream);

    analyser.fftSize = 256;
    const values = new Uint8Array(analyser.frequencyBinCount);
    source.connect(analyser);
    audioContextRef.current = audioContext;

    const tick = () => {
      analyser.getByteTimeDomainData(values);
      const peak = values.reduce(
        (largest, value) => Math.max(largest, Math.abs(value - 128)),
        0
      );
      setMicrophoneLevel(Math.min(1, peak / 42));
      meterFrameRef.current = window.requestAnimationFrame(tick);
    };

    tick();
  }

  return (
    <section className={styles.stage} aria-labelledby="interview-device-check-title">
      <div className={styles.copy}>
        <h1 id="interview-device-check-title">{copy.title}</h1>
      </div>

      <div className={styles.affirmation} aria-live="polite">
        <AnimatedTextCycle words={copy.affirmations} />
      </div>

      <div className={styles.device} data-camera={cameraStatus}>
        <div className={styles.cameraDot} aria-hidden="true" />
        <div className={styles.preview}>
          <video
            ref={videoRef}
            aria-label={copy.camera.previewAria}
            autoPlay
            muted
            playsInline
          />
          {cameraStatus !== "ready" ? (
            <div className={styles.previewPlaceholder}>
              <span>{copy.camera.previewLabel}</span>
              <strong>
                {cameraStatus === "testing" ? copy.camera.openingShort : copy.camera.notTested}
              </strong>
            </div>
          ) : null}
        </div>

        <div className={styles.microphoneDock} aria-label={copy.microphone.meterAria}>
          {Array.from({ length: 18 }, (_, index) => {
            const active = microphoneLevel * 18 >= index + 1;
            return <span data-active={active ? "true" : "false"} key={index} />;
          })}
        </div>
      </div>

      <div className={styles.controls}>
        {view.capabilities.map((capability) => (
          <DeviceCheckControl
            key={capability.id}
            capabilityId={capability.id}
            label={capability.id === "camera" ? copy.camera.label : copy.microphone.label}
            status={capability.status}
            statusMessage={capability.id === "camera" ? cameraMessage : microphoneMessage}
            actionLabel={
              capability.id === "camera"
                ? copy.camera.actionLabel
                : copy.microphone.actionLabel
            }
            needsTestLabel={copy.needsTest}
            readyLabel={
              capability.id === "camera"
                ? copy.camera.readyLabel
                : copy.microphone.readyLabel
            }
            testingLabel={copy.testing}
            isTesting={
              capability.id === "camera"
                ? cameraStatus === "testing"
                : microphoneStatus === "testing"
            }
            onTest={capability.id === "camera" ? testCamera : testMicrophone}
          />
        ))}
      </div>

      <section aria-labelledby="interview-mode-title" className={styles.actions}>
        <h2 id="interview-mode-title">{copy.modeTitle}</h2>
        <p>{copy.modeIntro}</p>

        {/* Voice: completes the device check and starts in voice mode. */}
        <form action={COMPLETE_ACTION} method="post">
          <input name="interview_mode" type="hidden" value="voice" />
          <button disabled={!view.readyToStart} type="submit">
            {copy.modeVoice} — {copy.startInterview}
          </button>
          <span>{view.readyToStart ? copy.ready : copy.testBoth}</span>
          <small>{copy.modeVoiceDetail}</small>
        </form>

        {/* Text: a first-class equivalent mode; no microphone test required. */}
        <form action="/candidate/interview/mode" method="post">
          <input name="interview_mode" type="hidden" value="text" />
          <button type="submit">
            {copy.modeText} — {copy.startTextInterview}
          </button>
          <small>{copy.modeTextDetail}</small>
          <details>
            <summary>{copy.accommodationLabel}</summary>
            <p>{copy.accommodationDetail}</p>
            <textarea
              aria-label={copy.accommodationLabel}
              maxLength={2000}
              name="accommodation_request"
              placeholder={copy.accommodationPlaceholder}
              rows={3}
            />
          </details>
        </form>
      </section>
    </section>
  );
}

function DeviceCheckControl({
  actionLabel,
  capabilityId,
  isTesting,
  label,
  needsTestLabel,
  onTest,
  readyLabel,
  status,
  statusMessage,
  testingLabel
}: {
  readonly actionLabel: string;
  readonly capabilityId: InterviewDeviceCheckCapabilityId;
  readonly isTesting: boolean;
  readonly label: string;
  readonly needsTestLabel: string;
  readonly onTest: () => void;
  readonly readyLabel: string;
  readonly status: "ready" | "needs-test";
  readonly statusMessage: string;
  readonly testingLabel: string;
}) {
  return (
    <article className={styles.control} data-status={status}>
      <div>
        <span>{label}</span>
        <strong>{status === "ready" ? readyLabel : needsTestLabel}</strong>
      </div>
      <button
        aria-describedby={`${capabilityId}-device-status`}
        disabled={isTesting}
        onClick={onTest}
        type="button"
      >
        {isTesting ? testingLabel : actionLabel}
      </button>
      <span className={styles.srOnly} id={`${capabilityId}-device-status`}>
        {statusMessage}
      </span>
    </article>
  );
}

function stopStream(stream: MediaStream | null) {
  stream?.getTracks().forEach((track) => track.stop());
}

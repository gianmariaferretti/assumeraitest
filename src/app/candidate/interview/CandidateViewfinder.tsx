"use client";

import { type ReactNode, useEffect, useRef, useState } from "react";

import {
  resolveCandidateFlowCopy
} from "@/features/interview-flow/candidate-flow-copy";
import type { CandidateInterviewLanguageCode } from "@/features/interview-flow";

interface CandidateViewfinderProps {
  readonly children?: ReactNode;
  readonly isComplete: boolean;
  readonly isPaused: boolean;
  readonly language?: CandidateInterviewLanguageCode;
  readonly responseTimeRemainingLabel?: string | null;
}

export function CandidateViewfinder({
  children,
  isComplete,
  isPaused,
  language,
  responseTimeRemainingLabel
}: CandidateViewfinderProps) {
  const copy = resolveCandidateFlowCopy(language).interview;
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [micVolume, setMicVolume] = useState(0);

  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const isMountedRef = useRef(false);

  async function initStream() {
    setError(null);
    try {
      const userStream = await navigator.mediaDevices.getUserMedia({
        video: { width: 320, height: 240, facingMode: "user" },
        audio: true
      });
      if (!isMountedRef.current) {
        stopStream(userStream);
        return;
      }
      stopStream(streamRef.current);
      setStream(userStream);
      streamRef.current = userStream;

      if (videoRef.current) {
        videoRef.current.srcObject = userStream;
      }

      const audioTracks = userStream.getAudioTracks();
      if (audioTracks.length > 0) {
        setupAudioAnalyser(userStream);
      }
    } catch (caught) {
      if (!isMountedRef.current) {
        return;
      }
      console.error("Failed to get media devices:", caught);
      setError(
        caught instanceof Error
          ? caught.message
          : copy.deviceCheckFallbackMessage
      );
    }
  }

  function setupAudioAnalyser(mediaStream: MediaStream) {
    try {
      if (audioContextRef.current) {
        void audioContextRef.current.close();
      }

      const AudioContextClass =
        window.AudioContext ||
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (window as any).webkitAudioContext;
      if (!AudioContextClass) {
        return;
      }

      const audioCtx = new AudioContextClass();
      audioContextRef.current = audioCtx;

      const source = audioCtx.createMediaStreamSource(mediaStream);
      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 64;
      analyserRef.current = analyser;

      source.connect(analyser);

      const bufferLength = analyser.frequencyBinCount;
      const dataArray = new Uint8Array(bufferLength);

      function updateVolume() {
        if (!analyserRef.current) {
          return;
        }
        analyserRef.current.getByteFrequencyData(dataArray);

        let total = 0;
        for (let index = 0; index < bufferLength; index += 1) {
          total += dataArray[index];
        }
        const average = bufferLength > 0 ? total / bufferLength : 0;
        const percentage = Math.min(100, Math.round((average / 255) * 150));
        setMicVolume(percentage);

        animationFrameRef.current = requestAnimationFrame(updateVolume);
      }

      updateVolume();
    } catch (caught) {
      console.warn("Failed to initialize audio context", caught);
    }
  }

  useEffect(() => {
    if (!stream) {
      return;
    }

    const videoTracks = stream.getVideoTracks();
    const audioTracks = stream.getAudioTracks();

    if (isPaused || isComplete) {
      videoTracks.forEach((track) => {
        track.enabled = false;
      });
      audioTracks.forEach((track) => {
        track.enabled = false;
      });
      setMicVolume(0);
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    } else {
      videoTracks.forEach((track) => {
        track.enabled = true;
      });
      audioTracks.forEach((track) => {
        track.enabled = true;
      });
      if (audioTracks.length > 0) {
        setupAudioAnalyser(stream);
      }
    }
  }, [isPaused, isComplete, stream]);

  useEffect(() => {
    isMountedRef.current = true;
    void initStream();

    return () => {
      isMountedRef.current = false;
      stopStream(streamRef.current);
      streamRef.current = null;
      if (audioContextRef.current) {
        void audioContextRef.current.close();
      }
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const isMutedOrDisabled = isPaused || isComplete;

  return (
    <div className="candidate-viewfinder-card" data-muted={isMutedOrDisabled}>
      <div className="viewfinder-header-row">
        <span>{copy.viewfinderYou}</span>
      </div>

      {responseTimeRemainingLabel ? (
        <div className="response-window-countdown" aria-label={copy.viewfinderTimeRemaining}>
          <span>{copy.viewfinderTimeLeft} </span>
          <strong>{responseTimeRemainingLabel}</strong>
        </div>
      ) : null}

      <div className="video-viewport">
        {error ? (
          <div className="media-error-overlay">
            <p className="error-text">{copy.viewfinderBlocked}</p>
            <button className="retry-media-btn" onClick={initStream} type="button">
              {copy.viewfinderRetry}
            </button>
          </div>
        ) : isMutedOrDisabled ? (
          <div className="media-muted-overlay">
            <p className="mute-text">{copy.viewfinderMuted}</p>
            <small className="mute-sub">
              {isComplete ? copy.viewfinderSessionDone : copy.viewfinderPaused}
            </small>
          </div>
        ) : null}

        <video
          ref={videoRef}
          autoPlay
          muted
          playsInline
          className="candidate-video-element"
        />

        {!error && !isMutedOrDisabled ? (
          <div className="mic-feedback-overlay">
            <span className="mic-icon-mini">{copy.viewfinderMic}</span>
            <div className="volume-meter-track">
              <div
                className="volume-meter-fill"
                style={{ width: `${micVolume}%` }}
              />
            </div>
          </div>
        ) : null}

        {children ? <div className="candidate-camera-controls">{children}</div> : null}
      </div>
    </div>
  );
}

function stopStream(stream: MediaStream | null) {
  stream?.getTracks().forEach((track) => {
    track.stop();
  });
}

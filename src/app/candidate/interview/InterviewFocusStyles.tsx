"use client";

export function InterviewFocusStyles() {
  return (
    <style>{`
      .interview-focus-shell {
        background: #f9fafb;
        color: #111c19;
        min-height: 100dvh;
        padding: 16px;
        font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, sans-serif;
      }

      .interview-focus-frame {
        display: flex;
        flex-direction: column;
        gap: 12px;
        margin: 0 auto;
        max-width: 900px;
        width: 100%;
      }

      .interview-focus-top {
        display: flex;
        justify-content: space-between;
        align-items: center;
        border-bottom: 1px solid rgba(17, 28, 25, 0.06);
        padding-bottom: 6px;
        margin-bottom: 2px;
      }

      .interview-focus-top h1 {
        font-size: 1.1rem;
        font-weight: 800;
        margin: 2px 0 0 0;
        color: #111c19;
      }

      .video-feeds-container {
        position: relative;
        margin-top: 24px;
        margin-bottom: 4px;
      }

      .floating-question-card {
        position: absolute;
        top: 0;
        left: 50%;
        transform: translate(-50%, -50%);
        background: #ffffff;
        border: 1px solid rgba(17, 28, 25, 0.08);
        border-radius: 12px;
        padding: 8px 16px;
        width: 90%;
        max-width: 480px;
        text-align: center;
        box-shadow: 0 12px 30px rgba(17, 28, 25, 0.04);
        z-index: 10;
      }

      .question-label {
        display: block;
        font-size: 0.65rem;
        font-weight: 700;
        color: #5d6965;
        letter-spacing: 0.05em;
        margin-bottom: 2px;
      }

      .question-text {
        margin: 0;
        font-size: 0.8rem;
        line-height: 1.4;
        font-weight: 600;
        color: #111c19;
      }

      .question-preparation-card {
        display: grid;
        gap: 2px;
      }

      .interview-call-grid {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 12px;
        margin-bottom: 0;
      }

      .avatar-video-feed,
      .candidate-viewfinder-card {
        position: relative;
        aspect-ratio: 16 / 10;
        width: 100%;
        background: #f3f4f6;
        border-radius: 24px;
        overflow: hidden;
        box-shadow: 0 8px 24px rgba(17, 28, 25, 0.02), 0 2px 6px rgba(17, 28, 25, 0.01);
        border: 1px solid rgba(17, 28, 25, 0.08);
        transition: transform 200ms ease, box-shadow 200ms ease, border-color 200ms ease;
      }

      .avatar-video-feed:hover,
      .candidate-viewfinder-card:hover {
        transform: scale(1.002);
        box-shadow: 0 10px 25px rgba(17, 28, 25, 0.03);
        border-color: rgba(16, 185, 129, 0.2);
      }

      .avatar-image {
        width: 100%;
        height: 100%;
        object-fit: cover;
      }

      .video-overlay {
        position: absolute;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(249, 250, 251, 0.85);
        backdrop-filter: blur(8px);
        display: flex;
        flex-direction: column;
        justify-content: center;
        align-items: center;
        z-index: 9;
        color: #111c19;
      }

      .video-overlay span {
        font-size: 0.85rem;
        font-weight: 700;
      }

      .video-overlay small {
        opacity: 0.8;
        font-size: 0.7rem;
        margin-top: 2px;
        color: #5d6965;
      }

      .avatar-name-tag {
        position: absolute;
        bottom: 0;
        left: 0;
        width: 100%;
        background: linear-gradient(to top, rgba(249, 250, 251, 0.9) 0%, rgba(249, 250, 251, 0) 100%);
        padding: 12px 10px 8px;
        z-index: 8;
        display: flex;
        flex-direction: column;
        color: #111c19;
        pointer-events: none;
      }

      .avatar-name-tag strong {
        font-size: 0.8rem;
        font-weight: 700;
      }

      .avatar-name-tag span {
        font-size: 0.65rem;
        opacity: 0.8;
        color: #5d6965;
      }

      .viewfinder-header-row {
        position: absolute;
        bottom: 0;
        left: 0;
        width: 100%;
        background: linear-gradient(to top, rgba(249, 250, 251, 0.9) 0%, rgba(249, 250, 251, 0) 100%);
        padding: 12px 10px 8px;
        z-index: 8;
        display: flex;
        align-items: center;
        justify-content: space-between;
        color: #111c19;
        pointer-events: none;
      }

      .viewfinder-header-row span {
        font-size: 0.8rem;
        font-weight: 700;
      }

      .video-viewport {
        width: 100%;
        height: 100%;
        position: relative;
      }

      .candidate-video-element {
        width: 100%;
        height: 100%;
        object-fit: cover;
        transform: scaleX(-1);
      }

      .media-error-overlay,
      .media-muted-overlay {
        position: absolute;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(243, 244, 246, 0.92);
        display: flex;
        flex-direction: column;
        justify-content: center;
        align-items: center;
        text-align: center;
        padding: 12px;
        z-index: 7;
        color: #111c19;
      }

      .error-text, .mute-text {
        font-size: 0.8rem;
        font-weight: 700;
        margin: 0;
      }

      .mute-sub {
        font-size: 0.65rem;
        opacity: 0.7;
        margin-top: 2px;
        color: #5d6965;
      }

      .retry-media-btn {
        background: #111c19;
        border: none;
        color: #ffffff;
        font-size: 0.7rem;
        font-weight: 700;
        padding: 5px 10px;
        border-radius: 6px;
        margin-top: 6px;
        cursor: pointer;
        transition: background 180ms ease;
      }

      .retry-media-btn:hover {
        background: #202825;
      }

      .mic-feedback-overlay {
        position: absolute;
        bottom: 8px;
        right: 8px;
        background: rgba(255, 255, 255, 0.9);
        border: 1px solid rgba(17, 28, 25, 0.1);
        border-radius: 6px;
        padding: 3px 5px;
        display: flex;
        align-items: center;
        gap: 4px;
        z-index: 9;
      }

      .mic-icon-mini {
        font-size: 0.7rem;
      }

      .volume-meter-track {
        background: rgba(17, 28, 25, 0.1);
        width: 36px;
        height: 4px;
        border-radius: 99px;
        overflow: hidden;
      }

      .volume-meter-fill {
        height: 100%;
        background: #10b981;
        border-radius: 99px;
        transition: width 0.05s ease;
      }

      .interaction-desk-layout {
        display: grid;
        grid-template-columns: 1fr 240px;
        gap: 12px;
        margin-bottom: 4px;
      }

      .desk-left-panel,
      .desk-right-panel {
        display: flex;
        flex-direction: column;
        gap: 12px;
      }

      .question-focus-desk-card {
        background: #ffffff;
        border: 1px solid rgba(17, 28, 25, 0.08);
        border-radius: 12px;
        padding: 12px;
        box-shadow: 0 8px 24px rgba(17, 28, 25, 0.02), 0 2px 6px rgba(17, 28, 25, 0.01);
        display: flex;
        flex-direction: column;
        justify-content: center;
        min-height: 100px;
      }

      .answer-section {
        display: flex;
        flex-direction: column;
        gap: 8px;
      }

      .captured-response-readonly {
        background: #ffffff;
        border: 1px solid rgba(17, 28, 25, 0.12);
        border-radius: 12px;
        color: #111c19;
        display: grid;
        gap: 6px;
        min-height: 58px;
        padding: 8px 10px;
      }

      .readonly-response-heading {
        align-items: center;
        display: flex;
        justify-content: space-between;
        gap: 10px;
      }

      .readonly-response-heading span,
      .readonly-response-heading strong {
        color: #5d6965;
        font-size: 0.65rem;
        font-weight: 700;
      }

      .captured-response-readonly p {
        color: #111c19;
        font-size: 0.8rem;
        line-height: 1.4;
        margin: 0;
        min-height: 2.7em;
        white-space: pre-wrap;
      }

      .interview-error-banner {
        background: rgba(156, 47, 39, 0.05);
        border: 1px solid rgba(156, 47, 39, 0.15);
        border-radius: 6px;
        color: #9c2f27;
        font-size: 0.72rem;
        font-weight: 700;
        margin: 0;
        padding: 4px 8px;
      }

      .submit-section {
        display: flex;
        justify-content: flex-end;
        align-items: center;
      }

      .submit-answer-btn {
        align-items: center;
        background: #10b981;
        border: none;
        border-radius: 99px;
        color: #ffffff;
        cursor: pointer;
        display: inline-flex;
        font-weight: 700;
        justify-content: center;
        min-height: 26px;
        padding: 5px 12px;
        font-size: 0.72rem;
        transition: background 180ms ease, transform 180ms ease, box-shadow 180ms ease;
      }

      .submit-answer-btn:hover:not(:disabled) {
        background: #059669;
        transform: translateY(-1px);
        box-shadow: 0 4px 12px rgba(16, 185, 129, 0.2);
      }

      .submit-answer-btn:disabled,
      .control-btn:disabled {
        background: rgba(17, 28, 25, 0.04) !important;
        color: rgba(17, 28, 25, 0.4) !important;
        border-color: rgba(17, 28, 25, 0.08) !important;
        opacity: 1 !important;
        cursor: not-allowed;
      }

      .control-btn.btn-primary:disabled {
        background: #a1aba7 !important;
        color: #ffffff !important;
        border-color: #a1aba7 !important;
      }

      .controls-card {
        background: #ffffff;
        border: 1px solid rgba(17, 28, 25, 0.08);
        border-radius: 12px;
        padding: 8px;
        box-shadow: 0 8px 24px rgba(17, 28, 25, 0.02), 0 2px 6px rgba(17, 28, 25, 0.01);
      }

      .controls-card h3 {
        margin: 0 0 6px;
        font-size: 0.65rem;
        text-transform: uppercase;
        color: #5d6965;
        letter-spacing: 0.05em;
        font-weight: 800;
      }

      .presence-controls-grid {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 4px;
      }

      .control-btn {
        align-items: center;
        border: 1px solid rgba(17, 28, 25, 0.12);
        border-radius: 99px;
        cursor: pointer;
        display: inline-flex;
        font-weight: 700;
        justify-content: center;
        min-height: 24px;
        padding: 3px 6px;
        font-size: 0.68rem;
        transition: all 180ms ease;
        background: #ffffff;
        color: #111c19;
        width: 100%;
      }

      .control-btn:hover:not(:disabled) {
        background: rgba(17, 28, 25, 0.03);
        border-color: #111c19;
      }

      .control-btn.btn-primary {
        background: #111c19;
        color: #ffffff;
        border-color: #111c19;
      }

      .control-btn.btn-primary:hover:not(:disabled) {
        background: #202825;
      }

      .control-btn.btn-outline {
        border-color: rgba(17, 28, 25, 0.12);
        background: transparent;
      }

      .control-btn.btn-danger {
        border: none;
        background: transparent;
        color: #9c2f27;
        box-shadow: none;
      }

      .control-btn.btn-danger:hover:not(:disabled) {
        background: rgba(156, 47, 39, 0.06);
      }

      .safety-disclosure-panel {
        background: rgba(16, 185, 129, 0.04);
        border: 1px solid rgba(16, 185, 129, 0.1);
        border-radius: 10px;
        padding: 8px 10px;
        display: flex;
        gap: 8px;
        align-items: flex-start;
        box-shadow: 0 4px 12px rgba(17, 28, 25, 0.01);
      }

      .disclosure-text strong {
        display: block;
        font-size: 0.7rem;
        font-weight: 700;
        color: #111c19;
        margin-bottom: 1px;
      }

      .disclosure-text p {
        margin: 0;
        font-size: 0.65rem;
        line-height: 1.4;
        color: #5d6965;
      }

      .transcript-container {
        position: relative;
        border: 1.5px solid #a9bfa6;
        border-radius: 24px;
        padding: 16px;
        margin-top: 24px;
        background: #ffffff;
        box-shadow: 0 8px 24px rgba(17, 28, 25, 0.02);
      }

      .transcript-title {
        position: absolute;
        bottom: 0;
        left: 50%;
        transform: translate(-50%, 50%);
        background: #f9fafb;
        padding: 0 12px;
        font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, sans-serif;
        font-size: 0.8rem;
        font-weight: 800;
        color: #5d6965;
        text-transform: lowercase;
        letter-spacing: 0.05em;
      }

      .transcript-content {
        padding: 4px;
      }

      .chat-transcript-timeline {
        display: flex;
        flex-direction: column;
        gap: 16px;
        max-height: 200px;
        overflow-y: auto;
        padding-right: 4px;
      }

      .chat-bubble-row {
        display: flex;
        flex-direction: column;
        align-items: flex-start;
        width: 100%;
        padding-bottom: 12px;
        border-bottom: 1px solid rgba(17, 28, 25, 0.05);
      }

      .chat-bubble-row:last-child {
        border-bottom: none;
        padding-bottom: 0;
      }

      .chat-bubble-meta {
        display: flex;
        align-items: center;
        gap: 8px;
        margin-bottom: 4px;
        font-size: 0.75rem;
      }

      .chat-bubble-meta strong {
        color: #111c19;
        font-weight: 700;
      }

      .bubble-time {
        color: #8fa099;
        font-size: 0.68rem;
      }

      .chat-bubble-payload {
        font-size: 0.8rem;
        line-height: 1.5;
        color: #202825;
        background: transparent !important;
        border: none !important;
        padding: 0 !important;
        margin: 0;
        box-shadow: none !important;
        border-radius: 0 !important;
      }

      .chat-bubble-payload p {
        margin: 0;
      }

      .empty-transcript-state {
        text-align: center;
        padding: 16px 0;
        color: #8fa099;
        font-size: 0.75rem;
      }

      .question-complete-ui,
      .question-transition-ui {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        text-align: center;
        padding: 8px 0;
        margin: auto;
        max-width: 360px;
      }

      .question-complete-ui h2,
      .question-transition-ui h2 {
        font-size: 1rem;
        margin: 0 0 4px;
        line-height: 1.3;
        font-weight: 800;
      }

      .complete-detail,
      .transition-detail {
        color: #5d6965;
        line-height: 1.4;
        font-size: 0.75rem;
        margin: 0 0 12px;
      }

      .question-actions-row {
        display: flex;
        gap: 8px;
        justify-content: center;
      }

      .action-btn-primary {
        background: #111c19;
        border: 1px solid #111c19;
        color: #ffffff;
        border-radius: 999px;
        padding: 5px 12px;
        font-weight: 700;
        cursor: pointer;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        min-height: 28px;
        font-size: 0.75rem;
        transition:
          background 180ms ease,
          transform 180ms ease;
      }

      .action-btn-primary:hover {
        background: #202825;
        transform: translateY(-1px);
      }

      .action-btn-secondary {
        background: transparent;
        border: 1px solid rgba(17, 28, 25, 0.15);
        color: #111c19;
        border-radius: 999px;
        padding: 5px 12px;
        font-weight: 700;
        cursor: pointer;
        min-height: 28px;
        font-size: 0.75rem;
        transition: background 180ms ease;
      }

      .action-btn-secondary:hover {
        background: rgba(17, 28, 25, 0.03);
      }

      .transition-eyebrow {
        font-size: 0.6rem;
        font-weight: 800;
        text-transform: uppercase;
        color: #059669;
        letter-spacing: 0.05em;
        margin-bottom: 2px;
      }

      @media (max-width: 820px) {
        .video-feeds-container {
          margin-top: 48px;
        }

        .floating-question-card {
          width: 95%;
          padding: 8px 16px;
        }

        .interview-call-grid {
          grid-template-columns: 1fr;
          gap: 12px;
        }

        .avatar-video-feed,
        .candidate-viewfinder-card {
          border-radius: 24px;
        }

        .interaction-desk-layout {
          grid-template-columns: 1fr;
          gap: 12px;
        }

        .chat-bubble-row {
          max-width: 100%;
        }

        .presence-controls-grid {
          grid-template-columns: 1fr 1fr;
        }
      }

      /* Apple-style glass interview shell */
      .interview-focus-shell {
        --interview-ink: #111c19;
        --interview-muted: #5f6965;
        --interview-soft: #f5f7f2;
        --interview-warm: #fbf8ee;
        --interview-line: rgba(17, 28, 25, 0.11);
        --interview-focus: #365d8d;
        background:
          radial-gradient(circle at 16% 8%, rgba(255, 255, 255, 0.95) 0, rgba(255, 255, 255, 0) 34%),
          linear-gradient(135deg, #ffffff 0%, #f6f7f5 50%, #eef2f0 100%);
        box-sizing: border-box;
        color: var(--interview-ink);
        display: flex;
        flex-direction: column;
        font-family:
          -apple-system,
          BlinkMacSystemFont,
          "SF Pro Display",
          "SF Pro Text",
          "Segoe UI",
          ui-sans-serif,
          system-ui,
          sans-serif;
        height: calc(100dvh - 64px);
        max-height: calc(100dvh - 64px);
        min-height: 680px;
        overflow: hidden;
        padding: 12px 18px 18px;
        position: relative;
        isolation: isolate;
      }

      .interview-backdrop {
        background:
          linear-gradient(115deg, rgba(255, 255, 255, 0.72), rgba(255, 255, 255, 0)),
          radial-gradient(circle at 80% 18%, rgba(54, 93, 141, 0.12), rgba(54, 93, 141, 0) 28%);
        inset: 0;
        pointer-events: none;
        position: absolute;
        z-index: -1;
      }

      .interview-focus-shell .candidate-progress-rail {
        flex: 0 0 auto;
        margin: 0 auto 10px;
        position: relative;
      }

      .interview-focus-shell .candidate-progress-rail ol {
        gap: 6px;
      }

      .interview-focus-shell .candidate-progress-rail li {
        background: rgba(255, 255, 255, 0.54);
        border: 1px solid rgba(255, 255, 255, 0.72);
        border-radius: 999px;
        box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.72);
        min-height: 24px;
      }

      .interview-focus-shell .candidate-progress-rail li[data-state="current"] {
        background: rgba(17, 28, 25, 0.92);
        border-color: rgba(17, 28, 25, 0.18);
      }

      .interview-focus-shell .candidate-progress-rail li[data-state="complete"] {
        background: rgba(245, 247, 242, 0.82);
        border-color: rgba(17, 28, 25, 0.08);
        color: var(--interview-ink);
      }

      .interview-focus-shell .candidate-progress-step-content,
      .interview-focus-shell .candidate-progress-rail a {
        min-height: 24px;
        padding: 3px 7px;
      }

      .interview-focus-shell .candidate-progress-step-number {
        background: rgba(17, 28, 25, 0.06);
        height: 14px;
        width: 14px;
      }

      .interview-focus-shell .candidate-progress-rail strong {
        font-size: 0.58rem;
        letter-spacing: 0;
      }

      .interview-focus-frame {
        display: flex;
        flex: 1 1 auto;
        flex-direction: column;
        gap: 10px;
        margin: 0 auto;
        max-width: 1440px;
        min-height: 0;
        position: relative;
        width: 100%;
      }

      .interview-focus-top {
        align-items: flex-end;
        border-bottom: 0;
        display: flex;
        flex: 0 0 auto;
        justify-content: space-between;
        margin: 0;
        padding: 0 4px;
      }

      .session-kicker {
        color: var(--interview-muted);
        display: block;
        font-size: 0.72rem;
        font-weight: 700;
        letter-spacing: 0;
        margin-bottom: 2px;
      }

      .interview-focus-top h1 {
        color: var(--interview-ink);
        font-size: 1.35rem;
        font-weight: 760;
        line-height: 1.12;
        margin: 0;
      }

      .interview-focus-top p {
        color: var(--interview-muted);
        font-size: 0.76rem;
        font-weight: 650;
        margin: 0 0 2px;
      }

      .conversation-stage {
        flex: 1 1 auto;
        min-height: 0;
        position: relative;
      }

      .interview-call-grid {
        display: grid;
        gap: 22px;
        grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
        height: 100%;
        margin: 0;
        min-height: 0;
      }

      .avatar-video-feed,
      .candidate-viewfinder-card {
        aspect-ratio: auto;
        background:
          linear-gradient(145deg, rgba(255, 255, 255, 0.74), rgba(245, 247, 242, 0.58)),
          rgba(255, 255, 255, 0.42);
        border: 1px solid rgba(255, 255, 255, 0.74);
        border-radius: 34px;
        box-shadow:
          inset 0 1px 0 rgba(255, 255, 255, 0.88),
          0 30px 80px rgba(17, 28, 25, 0.12),
          0 8px 24px rgba(17, 28, 25, 0.06);
        height: 100%;
        min-height: 0;
        overflow: hidden;
        position: relative;
        transform: translateZ(0);
        transition:
          border-color 180ms ease,
          box-shadow 180ms ease,
          transform 180ms ease;
        width: 100%;
      }

      .avatar-video-feed:hover,
      .candidate-viewfinder-card:hover {
        border-color: rgba(255, 255, 255, 0.9);
        box-shadow:
          inset 0 1px 0 rgba(255, 255, 255, 0.92),
          0 34px 86px rgba(17, 28, 25, 0.14),
          0 10px 28px rgba(17, 28, 25, 0.07);
        transform: translateY(-1px);
      }

      .avatar-image,
      .candidate-video-element,
      .video-viewport {
        height: 100%;
        width: 100%;
      }

      .avatar-image,
      .candidate-video-element {
        display: block;
        object-fit: cover;
      }

      .candidate-video-element {
        transform: scaleX(-1);
      }

      .video-viewport {
        position: relative;
      }

      .avatar-name-tag,
      .viewfinder-header-row {
        align-items: flex-end;
        background: linear-gradient(to top, rgba(17, 28, 25, 0.54), rgba(17, 28, 25, 0));
        bottom: 0;
        color: #ffffff;
        display: flex;
        justify-content: space-between;
        left: 0;
        min-height: 112px;
        padding: 52px 24px 22px;
        pointer-events: none;
        position: absolute;
        right: 0;
        width: 100%;
        z-index: 2;
      }

      .avatar-name-tag {
        align-items: flex-start;
        flex-direction: column;
        justify-content: flex-end;
      }

      .avatar-name-tag span,
      .viewfinder-header-row span {
        color: rgba(255, 255, 255, 0.76);
        font-size: 0.72rem;
        font-weight: 650;
        letter-spacing: 0;
      }

      .avatar-name-tag strong {
        color: #ffffff;
        font-size: 1rem;
        font-weight: 760;
        line-height: 1.1;
      }

      .viewfinder-header-row span {
        color: #ffffff;
        font-size: 1rem;
        font-weight: 760;
      }

      .video-overlay,
      .media-error-overlay,
      .media-muted-overlay {
        align-items: center;
        background: rgba(255, 255, 255, 0.66);
        backdrop-filter: blur(22px) saturate(150%);
        -webkit-backdrop-filter: blur(22px) saturate(150%);
        color: var(--interview-ink);
        display: flex;
        flex-direction: column;
        inset: 0;
        justify-content: center;
        padding: 24px;
        position: absolute;
        text-align: center;
        z-index: 5;
      }

      .video-overlay span,
      .error-text,
      .mute-text {
        font-size: 1rem;
        font-weight: 760;
        margin: 0;
      }

      .video-overlay small,
      .mute-sub {
        color: var(--interview-muted);
        font-size: 0.78rem;
        margin-top: 5px;
      }

      .candidate-viewfinder-card .media-error-overlay,
      .candidate-viewfinder-card .media-muted-overlay {
        align-items: flex-end;
        justify-content: flex-start;
        padding: 86px 42px 24px;
        text-align: right;
      }

      .retry-media-btn,
      .submit-answer-btn,
      .action-btn-primary,
      .action-btn-secondary,
      .control-btn {
        align-items: center;
        border-radius: 999px;
        cursor: pointer;
        display: inline-flex;
        font-size: 0.78rem;
        font-weight: 720;
        justify-content: center;
        letter-spacing: 0;
        min-height: 34px;
        text-decoration: none;
        transition:
          background 180ms ease,
          border-color 180ms ease,
          color 180ms ease,
          opacity 180ms ease,
          transform 180ms ease;
        user-select: none;
        white-space: nowrap;
      }

      .retry-media-btn,
      .submit-answer-btn,
      .action-btn-primary,
      .control-btn.btn-primary {
        background: rgba(17, 28, 25, 0.94);
        border: 1px solid rgba(17, 28, 25, 0.94);
        color: #ffffff;
      }

      .retry-media-btn {
        margin-top: 12px;
        padding: 0 18px;
      }

      .retry-media-btn:hover,
      .submit-answer-btn:hover:not(:disabled),
      .action-btn-primary:hover,
      .control-btn.btn-primary:hover:not(:disabled) {
        background: #26312e;
        border-color: #26312e;
        transform: translateY(-1px);
      }

      .mic-feedback-overlay {
        align-items: center;
        background: rgba(255, 255, 255, 0.68);
        backdrop-filter: blur(18px) saturate(150%);
        -webkit-backdrop-filter: blur(18px) saturate(150%);
        border: 1px solid rgba(255, 255, 255, 0.78);
        border-radius: 999px;
        bottom: 18px;
        box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.8);
        display: flex;
        gap: 8px;
        padding: 6px 9px;
        position: absolute;
        right: 18px;
        z-index: 6;
      }

      .mic-icon-mini {
        color: var(--interview-muted);
        font-size: 0.62rem;
        font-weight: 760;
        letter-spacing: 0;
      }

      .volume-meter-track {
        background: rgba(17, 28, 25, 0.1);
        border-radius: 999px;
        height: 4px;
        overflow: hidden;
        width: 42px;
      }

      .volume-meter-fill {
        background: var(--interview-focus);
        border-radius: inherit;
        height: 100%;
        transition: width 80ms ease;
      }

      .legacy-interview-panel {
        background: rgba(255, 255, 255, 0.66);
        backdrop-filter: blur(26px) saturate(160%);
        -webkit-backdrop-filter: blur(26px) saturate(160%);
        border: 1px solid rgba(255, 255, 255, 0.76);
        border-radius: 28px;
        box-shadow:
          inset 0 1px 0 rgba(255, 255, 255, 0.92),
          0 28px 80px rgba(17, 28, 25, 0.17),
          0 8px 24px rgba(17, 28, 25, 0.07);
        display: grid;
        gap: 12px;
        left: 50%;
        max-height: min(480px, 78%);
        overflow: hidden;
        padding: 18px;
        position: absolute;
        top: 53%;
        transform: translate(-50%, -50%);
        transition:
          padding 180ms ease,
          width 180ms ease,
          background 180ms ease;
        width: min(560px, calc(100% - 52px));
        z-index: 8;
      }

      .legacy-interview-panel.is-collapsed {
        background: rgba(255, 255, 255, 0.72);
        gap: 13px;
        max-height: none;
        padding: 16px;
        width: min(520px, calc(100% - 52px));
      }

      .current-question-block {
        align-items: flex-start;
        display: grid;
        gap: 12px;
        grid-template-columns: minmax(0, 1fr) auto;
      }

      .legacy-interview-panel.is-collapsed .current-question-block {
        align-items: center;
      }

      .question-label,
      .readonly-response-heading span,
      .readonly-response-heading strong,
      .transcript-title,
      .transcript-privacy-label,
      .transition-eyebrow,
      .completion-label {
        color: var(--interview-muted);
        font-size: 0.68rem;
        font-weight: 760;
        letter-spacing: 0;
        text-transform: none;
      }

      .transcript-title {
        background: transparent;
        bottom: auto;
        left: auto;
        padding: 0;
        position: static;
        transform: none;
      }

      .question-text {
        color: var(--interview-ink);
        font-size: 0.96rem;
        font-weight: 720;
        line-height: 1.36;
        margin: 0;
      }

      .question-preparation-card {
        background: rgba(245, 247, 242, 0.5);
        border: 1px solid rgba(17, 28, 25, 0.08);
        border-radius: 18px;
        display: grid;
        gap: 4px;
        padding: 12px;
      }

      .legacy-interview-panel.is-collapsed .question-text {
        font-size: 0.92rem;
        line-height: 1.32;
      }

      .panel-toggle-button {
        background: rgba(255, 255, 255, 0.58);
        border: 1px solid rgba(17, 28, 25, 0.1);
        border-radius: 999px;
        color: var(--interview-ink);
        cursor: pointer;
        font-size: 0.72rem;
        font-weight: 720;
        min-height: 32px;
        padding: 0 13px;
        white-space: nowrap;
        transition:
          background-color 180ms ease,
          border-color 180ms ease,
          transform 180ms ease;
      }

      .panel-toggle-button:hover {
        background: rgba(255, 255, 255, 0.84);
        border-color: rgba(17, 28, 25, 0.18);
        transform: translateY(-1px);
      }

      .panel-toggle-button:active {
        transform: translateY(0);
      }

      .transcript-container {
        background: rgba(245, 247, 242, 0.48);
        border: 1px solid rgba(17, 28, 25, 0.08);
        border-radius: 18px;
        box-shadow: none;
        margin: 0;
        min-height: 92px;
        overflow: hidden;
        padding: 12px;
        position: relative;
      }

      .transcript-heading-row {
        align-items: center;
        display: flex;
        justify-content: space-between;
        gap: 12px;
        margin-bottom: 8px;
      }

      .transcript-privacy-label {
        color: rgba(95, 105, 101, 0.82);
        font-size: 0.62rem;
      }

      .transcript-content {
        padding: 0;
      }

      .chat-transcript-timeline {
        display: grid;
        gap: 10px;
        max-height: 116px;
        overflow-y: auto;
        overscroll-behavior: contain;
        padding-right: 4px;
      }

      .chat-bubble-row {
        border-bottom: 1px solid rgba(17, 28, 25, 0.06);
        display: grid;
        gap: 3px;
        padding-bottom: 9px;
        width: 100%;
      }

      .chat-bubble-row:last-child {
        border-bottom: 0;
        padding-bottom: 0;
      }

      .chat-bubble-meta {
        align-items: center;
        color: var(--interview-muted);
        display: flex;
        font-size: 0.68rem;
        gap: 8px;
      }

      .chat-bubble-meta strong {
        color: var(--interview-ink);
        font-weight: 760;
      }

      .bubble-time {
        color: rgba(95, 105, 101, 0.74);
        font-size: 0.64rem;
      }

      .chat-bubble-payload {
        background: transparent;
        border: 0;
        border-radius: 0;
        box-shadow: none;
        color: #26312e;
        font-size: 0.78rem;
        line-height: 1.45;
        margin: 0;
        padding: 0;
      }

      .chat-bubble-payload p,
      .empty-transcript-state p,
      .safety-disclosure-line {
        margin: 0;
      }

      .empty-transcript-state {
        color: var(--interview-muted);
        font-size: 0.76rem;
        padding: 10px 0 2px;
        text-align: left;
      }

      .answer-section {
        display: grid;
        gap: 8px;
      }

      .captured-response-readonly {
        background: rgba(255, 255, 255, 0.74);
        border: 1px solid rgba(17, 28, 25, 0.13);
        border-radius: 18px;
        box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.72);
        color: var(--interview-ink);
        display: grid;
        gap: 7px;
        min-height: 68px;
        padding: 11px 12px;
      }

      .readonly-response-heading {
        align-items: center;
        display: flex;
        gap: 10px;
        justify-content: space-between;
      }

      .readonly-response-heading strong {
        color: rgba(95, 105, 101, 0.82);
        font-size: 0.62rem;
      }

      .captured-response-readonly p {
        color: var(--interview-ink);
        font-size: 0.84rem;
        line-height: 1.42;
        margin: 0;
        min-height: 2.8em;
        white-space: pre-wrap;
      }

      .voice-transcription-control {
        align-items: center;
        display: flex;
        flex-wrap: wrap;
        gap: 8px;
      }

      .voice-transcription-btn {
        background: rgba(255, 255, 255, 0.72);
        border: 1px solid rgba(17, 28, 25, 0.12);
        border-radius: 999px;
        color: var(--interview-ink);
        cursor: pointer;
        font: inherit;
        font-size: 0.74rem;
        font-weight: 750;
        min-height: 32px;
        padding: 0 14px;
        transition:
          background 180ms ease,
          border-color 180ms ease,
          transform 180ms ease;
      }

      .voice-transcription-btn:hover:not(:disabled) {
        background: rgba(255, 255, 255, 0.9);
        border-color: rgba(17, 28, 25, 0.2);
        transform: translateY(-1px);
      }

      .voice-transcription-btn:disabled {
        background: rgba(17, 28, 25, 0.06);
        border-color: rgba(17, 28, 25, 0.07);
        color: rgba(17, 28, 25, 0.42);
        cursor: not-allowed;
      }

      .voice-transcription-control span {
        color: var(--interview-muted);
        font-size: 0.72rem;
        line-height: 1.35;
      }

      .voice-transcription-control span[data-status="error"] {
        color: #8d2f29;
        font-weight: 700;
      }

      .interview-error-banner {
        background: rgba(156, 47, 39, 0.07);
        border: 1px solid rgba(156, 47, 39, 0.16);
        border-radius: 14px;
        color: #8d2f29;
        font-size: 0.74rem;
        font-weight: 700;
        margin: 0;
        padding: 8px 10px;
      }

      .submit-section {
        display: flex;
        justify-content: flex-end;
      }

      .submit-answer-btn {
        padding: 0 18px;
      }

      .submit-answer-btn:disabled,
      .control-btn:disabled,
      .control-btn.btn-primary:disabled {
        background: rgba(17, 28, 25, 0.06) !important;
        border-color: rgba(17, 28, 25, 0.07) !important;
        color: rgba(17, 28, 25, 0.42) !important;
        cursor: not-allowed;
        transform: none !important;
      }

      .controls-card {
        background: transparent;
        border: 0;
        border-radius: 0;
        box-shadow: none;
        padding: 0;
      }

      .presence-controls-grid {
        display: grid;
        gap: 7px;
        grid-template-columns: repeat(4, minmax(0, 1fr));
      }

      .control-btn,
      .action-btn-secondary {
        background: rgba(255, 255, 255, 0.58);
        border: 1px solid rgba(17, 28, 25, 0.1);
        color: var(--interview-ink);
        min-width: 0;
        padding: 0 12px;
      }

      .control-btn:hover:not(:disabled),
      .action-btn-secondary:hover {
        background: rgba(255, 255, 255, 0.82);
        border-color: rgba(17, 28, 25, 0.18);
        transform: translateY(-1px);
      }

      .control-btn.btn-danger {
        color: #8d2f29;
      }

      .safety-disclosure-line {
        color: var(--interview-muted);
        font-size: 0.66rem;
        line-height: 1.35;
      }

      .question-complete-ui,
      .question-transition-ui {
        align-items: center;
        display: flex;
        flex-direction: column;
        gap: 10px;
        justify-content: center;
        min-height: 250px;
        text-align: center;
      }

      .question-complete-ui h2,
      .question-transition-ui h2 {
        color: var(--interview-ink);
        font-size: 1.18rem;
        font-weight: 760;
        line-height: 1.22;
        margin: 0;
      }

      .complete-detail,
      .transition-detail {
        color: var(--interview-muted);
        font-size: 0.84rem;
        line-height: 1.42;
        margin: 0;
        max-width: 36rem;
      }

      .question-actions-row {
        display: flex;
        flex-wrap: wrap;
        gap: 8px;
        justify-content: center;
      }

      .action-btn-primary,
      .action-btn-secondary {
        padding: 0 18px;
      }

      .legacy-interview-panel {
        display: none;
      }

      .conversation-stage {
        position: relative;
      }

      .interview-call-grid {
        min-height: min(650px, calc(100dvh - 178px));
        position: relative;
      }

      .floating-question-card,
      .question-preparation-card {
        animation: questionArrive 340ms cubic-bezier(0.16, 1, 0.3, 1) both;
        background: rgba(255, 255, 255, 0.76);
        backdrop-filter: blur(24px) saturate(160%);
        -webkit-backdrop-filter: blur(24px) saturate(160%);
        border: 1px solid rgba(255, 255, 255, 0.82);
        border-radius: 26px;
        box-shadow:
          inset 0 1px 0 rgba(255, 255, 255, 0.88),
          0 18px 48px rgba(17, 28, 25, 0.13);
        left: 50%;
        padding: 14px 16px;
        position: absolute;
        top: 16px;
        transform: translateX(-50%);
        width: min(560px, calc(100% - 72px));
        z-index: 9;
      }

      .floating-question-card {
        align-items: flex-start;
        display: grid;
        gap: 12px;
        grid-template-columns: minmax(0, 1fr) auto;
        text-align: left;
      }

      .question-preparation-card {
        text-align: center;
        width: min(360px, calc(100% - 72px));
      }

      .response-dock {
        --candidate-controls-width: min(390px, calc(100% - 36px));
        animation: dockFloatIn 260ms cubic-bezier(0.16, 1, 0.3, 1) both;
        background: rgba(255, 255, 255, 0.78);
        backdrop-filter: blur(24px) saturate(160%);
        -webkit-backdrop-filter: blur(24px) saturate(160%);
        border: 1px solid rgba(255, 255, 255, 0.84);
        border-radius: 24px;
        bottom: 18px;
        box-shadow:
          inset 0 1px 0 rgba(255, 255, 255, 0.9),
          0 18px 46px rgba(17, 28, 25, 0.14);
        display: grid;
        gap: 8px;
        grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
        left: auto;
        max-height: 206px;
        overflow: hidden;
        padding: 10px;
        position: absolute;
        right: calc(18px + var(--candidate-controls-width) + 16px);
        transform: none;
        width: min(680px, calc(100% - var(--candidate-controls-width) - 76px));
        z-index: 8;
      }

      .candidate-camera-controls {
        background: rgba(255, 255, 255, 0.78);
        backdrop-filter: blur(22px) saturate(160%);
        -webkit-backdrop-filter: blur(22px) saturate(160%);
        border: 1px solid rgba(255, 255, 255, 0.84);
        border-radius: 24px;
        bottom: 18px;
        box-shadow:
          inset 0 1px 0 rgba(255, 255, 255, 0.88),
          0 16px 38px rgba(17, 28, 25, 0.16);
        max-width: 390px;
        padding: 8px;
        position: absolute;
        right: 18px;
        width: min(390px, calc(100% - 36px));
        z-index: 12;
      }

      .candidate-viewfinder-card .response-window-countdown {
        align-items: center;
        background: rgba(17, 28, 25, 0.88);
        border: 1px solid rgba(255, 255, 255, 0.24);
        border-radius: 999px;
        box-shadow: 0 12px 28px rgba(17, 28, 25, 0.24);
        color: #ffffff;
        display: inline-flex;
        gap: 8px;
        padding: 7px 10px;
        position: absolute;
        right: 18px;
        top: 18px;
        z-index: 14;
      }

      .candidate-viewfinder-card .response-window-countdown span {
        color: rgba(255, 255, 255, 0.72);
        font-size: 0.62rem;
        font-weight: 720;
      }

      .candidate-viewfinder-card .response-window-countdown strong {
        color: #ffffff;
        font-size: 0.78rem;
        font-variant-numeric: tabular-nums;
        font-weight: 860;
      }

      .camera-control-stack {
        display: grid;
        gap: 6px;
      }

      .candidate-control-row {
        display: grid;
        gap: 6px;
        grid-template-columns: minmax(0, 1.2fr) minmax(0, 1fr);
      }

      .candidate-camera-controls .voice-transcription-control {
        display: grid;
        gap: 5px;
        grid-template-columns: auto minmax(0, 1fr);
      }

      .candidate-camera-controls .voice-transcription-btn {
        background: rgba(17, 28, 25, 0.94);
        border-color: rgba(17, 28, 25, 0.94);
        color: #ffffff;
        font-size: 0.68rem;
        font-weight: 760;
        min-height: 32px;
        padding: 0 12px;
      }

      .candidate-camera-controls .voice-transcription-btn:hover:not(:disabled) {
        background: rgba(17, 28, 25, 0.98);
        border-color: rgba(17, 28, 25, 0.98);
        color: #ffffff;
        transform: translateY(-1px);
      }

      .candidate-camera-controls .voice-transcription-btn:disabled {
        background: rgba(17, 28, 25, 0.08);
        border-color: rgba(17, 28, 25, 0.08);
        color: rgba(17, 28, 25, 0.5);
      }

      .candidate-camera-controls .voice-transcription-control span {
        font-size: 0.66rem;
      }

      .response-window-expired-card {
        background: rgba(255, 247, 247, 0.86);
        border: 1px solid rgba(178, 52, 44, 0.22);
        border-radius: 14px;
        color: #8f211a;
        display: grid;
        gap: 7px;
        padding: 9px 10px;
      }

      .response-window-expired-card strong {
        color: #781a15;
        font-size: 0.72rem;
        font-weight: 820;
      }

      .response-window-expired-card span {
        color: #982a22;
        font-size: 0.68rem;
        font-weight: 680;
        line-height: 1.35;
      }

      .response-window-expired-actions {
        display: grid;
        gap: 6px;
        grid-template-columns: repeat(2, minmax(0, 1fr));
      }

      .candidate-camera-controls .submit-answer-btn,
      .candidate-camera-controls .control-btn {
        border-radius: 999px;
        font-size: 0.66rem;
        font-weight: 760;
        min-height: 32px;
        padding: 0 8px;
      }

      .candidate-session-options {
        color: rgba(17, 28, 25, 0.74);
      }

      .candidate-session-options summary {
        align-items: center;
        cursor: pointer;
        display: inline-flex;
        font-size: 0.66rem;
        font-weight: 760;
        gap: 6px;
        min-height: 26px;
        padding: 0 4px;
      }

      .candidate-session-options summary::-webkit-details-marker {
        display: none;
      }

      .candidate-session-options summary::after {
        content: "+";
        font-weight: 820;
      }

      .candidate-session-options[open] summary::after {
        content: "-";
      }

      .candidate-session-options-grid {
        display: grid;
        gap: 6px;
        grid-template-columns: minmax(0, 1.2fr) minmax(0, 0.8fr);
        padding-top: 6px;
      }

      .interview-status-card {
        align-items: center;
        animation: dockRise 260ms cubic-bezier(0.16, 1, 0.3, 1) both;
        background: rgba(255, 255, 255, 0.8);
        backdrop-filter: blur(24px) saturate(160%);
        -webkit-backdrop-filter: blur(24px) saturate(160%);
        border: 1px solid rgba(255, 255, 255, 0.84);
        border-radius: 28px;
        box-shadow:
          inset 0 1px 0 rgba(255, 255, 255, 0.9),
          0 18px 46px rgba(17, 28, 25, 0.14);
        display: flex;
        flex-direction: column;
        gap: 10px;
        left: 50%;
        max-width: 420px;
        padding: 20px;
        position: absolute;
        text-align: center;
        top: 50%;
        transform: translate(-50%, -50%);
        width: min(420px, calc(100% - 64px));
        z-index: 10;
      }

      @keyframes questionArrive {
        from {
          opacity: 0;
          transform: translate(-50%, -14px) scale(0.985);
        }
        to {
          opacity: 1;
          transform: translate(-50%, 0) scale(1);
        }
      }

      @keyframes dockRise {
        from {
          opacity: 0;
          transform: translate(-50%, 12px) scale(0.985);
        }
        to {
          opacity: 1;
          transform: translate(-50%, 0) scale(1);
        }
      }

      @keyframes dockFloatIn {
        from {
          opacity: 0;
          transform: translateY(12px) scale(0.985);
        }
        to {
          opacity: 1;
          transform: translateY(0) scale(1);
        }
      }

      @media (max-height: 760px) and (min-width: 861px) {
        .interview-focus-shell {
          min-height: 0;
          padding: 8px 14px 12px;
        }

        .interview-focus-shell .candidate-progress-rail {
          margin-bottom: 7px;
        }

        .interview-focus-top h1 {
          font-size: 1.12rem;
        }

        .session-kicker,
        .interview-focus-top p {
          font-size: 0.66rem;
        }

        .legacy-interview-panel {
          gap: 8px;
          max-height: 86%;
          padding: 13px;
          top: 52%;
        }

        .legacy-interview-panel.is-collapsed {
          gap: 10px;
          padding: 13px;
          width: min(500px, calc(100% - 52px));
        }

        .transcript-container {
          min-height: 72px;
          padding: 9px;
        }

        .chat-transcript-timeline {
          max-height: 78px;
        }

        .safety-disclosure-line {
          display: none;
        }
      }

      @media (max-width: 860px) {
        .app-nav {
          display: none;
        }

        .interview-focus-shell {
          --mobile-interview-frame-height: min(760px, calc(100dvh - 80px));
          align-items: center;
          background: #f5f6f7;
          display: grid;
          min-height: 100dvh;
          max-height: 100dvh;
          overflow: hidden;
          padding: 10px;
        }

        .interview-focus-top {
          display: none;
        }

        .interview-focus-shell .candidate-progress-rail {
          background: transparent;
          border: 0;
          border-radius: 0;
          box-shadow: none;
          display: block;
          left: 50%;
          margin: 0;
          max-width: calc(100vw - 32px);
          padding: 0;
          position: fixed;
          top: 16px;
          transform: translateX(-50%);
          width: fit-content;
          z-index: 30;
        }

        .interview-focus-shell .candidate-progress-mobile-status {
          display: none;
        }

        .interview-focus-shell .candidate-progress-rail ol {
          display: flex;
          gap: 6px;
          grid-template-columns: none;
          justify-content: center;
        }

        .interview-focus-shell .candidate-progress-rail li,
        .interview-focus-shell .candidate-progress-rail:is(:hover, :focus-within) li {
          flex: 0 0 30px;
          min-height: 30px;
          width: 30px;
        }

        .interview-focus-shell .candidate-progress-step-content,
        .interview-focus-shell .candidate-progress-rail a,
        .interview-focus-shell .candidate-progress-rail:is(:hover, :focus-within) a,
        .interview-focus-shell .candidate-progress-rail:is(:hover, :focus-within) .candidate-progress-step-content {
          justify-content: center;
          min-height: 30px;
          padding: 5px;
        }

        .interview-focus-shell .candidate-progress-rail strong {
          max-width: 0;
          opacity: 0;
        }

        .interview-focus-shell .candidate-progress-step-number {
          height: 17px;
          width: 17px;
        }

        .interview-focus-frame {
          display: block;
          gap: 0;
          height: var(--mobile-interview-frame-height);
          margin: 0 auto;
          max-width: 430px;
          width: min(430px, 100%);
        }

        .conversation-stage {
          height: 100%;
          position: relative;
        }

        .interview-call-grid {
          background: #111c19;
          border: 1px solid rgba(17, 28, 25, 0.08);
          border-radius: 34px;
          box-shadow:
            0 22px 60px rgba(17, 28, 25, 0.14),
            0 6px 18px rgba(17, 28, 25, 0.06);
          display: block;
          height: 100%;
          min-height: 0;
          overflow: hidden;
          position: relative;
        }

        .avatar-video-feed {
          border: 0;
          border-radius: inherit;
          box-shadow: none;
          height: 100%;
          inset: 0;
          min-height: 0;
          position: absolute;
          width: 100%;
        }

        .avatar-video-feed:hover {
          border-color: transparent;
          box-shadow: none;
          transform: none;
        }

        .avatar-image {
          height: 100%;
          object-fit: cover;
          object-position: center;
          width: 100%;
        }

        .avatar-video-feed::after {
          background: linear-gradient(
            180deg,
            rgba(17, 28, 25, 0) 56%,
            rgba(17, 28, 25, 0.58) 100%
          );
          bottom: 0;
          content: "";
          left: 0;
          pointer-events: none;
          position: absolute;
          right: 0;
          top: 0;
          z-index: 3;
        }

        .avatar-name-tag {
          display: none;
        }

        .candidate-viewfinder-card {
          aspect-ratio: 4 / 3;
          background: #dfe4e2;
          border: 1px solid rgba(255, 255, 255, 0.74);
          border-radius: 24px;
          bottom: 18px;
          box-shadow: 0 18px 38px rgba(17, 28, 25, 0.26);
          height: auto;
          left: auto;
          max-height: 118px;
          min-height: 0;
          overflow: hidden;
          position: absolute;
          right: 16px;
          top: auto;
          transform: none;
          width: min(136px, 36%);
          z-index: 12;
        }

        .candidate-viewfinder-card:hover {
          border-color: rgba(255, 255, 255, 0.82);
          box-shadow: 0 18px 38px rgba(17, 28, 25, 0.26);
          transform: none;
        }

        .candidate-viewfinder-card .response-window-countdown {
          gap: 4px;
          padding: 5px 7px;
          right: 8px;
          top: 8px;
        }

        .candidate-viewfinder-card .response-window-countdown span {
          display: none;
        }

        .candidate-viewfinder-card .response-window-countdown strong {
          font-size: 0.66rem;
        }

        .candidate-viewfinder-card .viewfinder-header-row,
        .candidate-viewfinder-card .mic-feedback-overlay {
          display: none;
        }

        .candidate-video-element,
        .video-viewport {
          height: 100%;
        }

        .candidate-video-element {
          object-fit: cover;
        }

        .media-error-overlay,
        .media-muted-overlay {
          border-radius: inherit;
          padding: 8px;
        }

        .floating-question-card,
        .question-preparation-card {
          animation: questionArriveMobile 280ms cubic-bezier(0.16, 1, 0.3, 1) both;
          border-radius: 18px;
          left: 14px;
          margin: 0;
          padding: 10px 11px;
          position: absolute;
          right: 14px;
          top: 12px;
          transform: none;
          width: auto;
          z-index: 14;
        }

        .floating-question-card {
          align-items: start;
          gap: 8px;
          grid-template-columns: minmax(0, 1fr) auto;
        }

        .question-preparation-card {
          text-align: center;
        }

        .question-text {
          font-size: 0.78rem;
          line-height: 1.24;
        }

        .panel-toggle-button {
          align-self: start;
          font-size: 0.64rem;
          justify-self: end;
          min-height: 32px;
          padding: 0 11px;
        }

        .candidate-camera-controls {
          background: transparent;
          backdrop-filter: none;
          -webkit-backdrop-filter: none;
          border: 0;
          box-shadow: none;
          bottom: calc((100dvh - var(--mobile-interview-frame-height)) / 2 + 24px);
          left: max(18px, calc((100vw - 430px) / 2 + 28px));
          max-width: 226px;
          padding: 0;
          position: fixed;
          right: auto;
          width: min(226px, calc(100vw - min(136px, 36%) - 54px));
          z-index: 13;
        }

        .camera-control-stack {
          gap: 8px;
        }

        .candidate-camera-controls .voice-transcription-control {
          align-items: center;
          background: rgba(255, 255, 255, 0.84);
          backdrop-filter: blur(18px) saturate(150%);
          -webkit-backdrop-filter: blur(18px) saturate(150%);
          border: 1px solid rgba(255, 255, 255, 0.78);
          border-radius: 999px;
          box-shadow: 0 10px 24px rgba(17, 28, 25, 0.12);
          display: grid;
          gap: 6px;
          grid-template-columns: auto minmax(0, 1fr);
          padding: 5px;
          width: min(226px, 100%);
        }

        .candidate-camera-controls .voice-transcription-btn {
          font-size: 0.62rem;
          min-height: 32px;
          padding: 0 11px;
          white-space: nowrap;
        }

        .candidate-camera-controls .voice-transcription-control span {
          font-size: 0.62rem;
          line-height: 1.2;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .candidate-control-row {
          display: grid;
          gap: 8px;
          grid-template-columns: minmax(0, 1.2fr) minmax(0, 1fr);
          width: min(226px, 100%);
        }

        .candidate-session-options {
          background: rgba(255, 255, 255, 0.76);
          border: 1px solid rgba(255, 255, 255, 0.74);
          border-radius: 16px;
          padding: 4px 6px;
          width: min(226px, 100%);
        }

        .candidate-session-options summary {
          font-size: 0.62rem;
          min-height: 24px;
        }

        .candidate-session-options-grid {
          grid-template-columns: 1fr;
        }

        .candidate-camera-controls .submit-answer-btn,
        .candidate-camera-controls .control-btn {
          font-size: 0.62rem;
          line-height: 1.05;
          min-height: 42px;
          padding: 0 6px;
        }

        .candidate-camera-controls .control-btn.btn-danger {
          background: rgba(255, 255, 255, 0.74);
          border: 1px solid rgba(255, 255, 255, 0.7);
          color: #8d2f29;
        }

        .candidate-camera-controls .submit-answer-btn:disabled,
        .candidate-camera-controls .control-btn:disabled {
          background: rgba(255, 255, 255, 0.74) !important;
          border-color: rgba(255, 255, 255, 0.7) !important;
          color: rgba(17, 28, 25, 0.58) !important;
          opacity: 1;
        }

        .response-dock {
          bottom: 124px;
          grid-template-columns: 1fr;
          left: 14px;
          margin: 0;
          max-height: min(42dvh, 280px);
          overflow: auto;
          position: absolute;
          right: 14px;
          top: auto;
          transform: none;
          width: auto;
          z-index: 15;
        }

        .transcript-container {
          min-height: 0;
          padding: 10px;
        }

        .chat-transcript-timeline {
          max-height: 108px;
        }

        .captured-response-readonly {
          min-height: 0;
          padding: 10px;
        }

        .interview-status-card {
          left: 18px;
          position: absolute;
          right: 18px;
          top: 50%;
          transform: translateY(-50%);
          width: auto;
          z-index: 16;
        }

        @keyframes questionArriveMobile {
          from {
            opacity: 0;
            transform: translateY(-10px) scale(0.985);
          }
          to {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }

      }
    `}</style>
  );
}


"use client";

import { useCallback, useState } from "react";

/**
 * In-browser code editor with a LOGGED AI-assistant pane (Phase 0 modality
 * shell for the coding work-sample module).
 *
 * Strategic stance: we assess WITH AI, not against it. The candidate may use
 * the assistant; every prompt/response is captured as a transcript so the
 * work-sample scorer can grade collaboration-with-AI, not memorization. This
 * shell defines that logging contract and the editing surface. Sandbox test
 * execution and the live model call are INJECTED (`onRunTests`, `onAskAi`) so
 * Phase 0 stays offline-safe and deterministic in tests; the real sandbox and
 * model wiring land with the module in Phase 1.
 */

export interface AiTurn {
  readonly role: "candidate" | "assistant";
  readonly text: string;
  readonly at: string;
}

export interface CodeEditorPanelProps {
  readonly initialCode: string;
  readonly language: "python" | "typescript" | "javascript";
  /** Injected sandbox runner; returns a short result summary. */
  readonly onRunTests?: (code: string) => Promise<string>;
  /** Injected AI call; returns the assistant reply for a candidate prompt. */
  readonly onAskAi?: (prompt: string, code: string) => Promise<string>;
  /** Receives the full transcript whenever it grows (for server-side logging). */
  readonly onTranscript?: (transcript: readonly AiTurn[]) => void;
  /** Receives the latest code on every change (for server-side persistence). */
  readonly onCodeChange?: (code: string) => void;
}

export function CodeEditorPanel({
  initialCode,
  language,
  onRunTests,
  onAskAi,
  onTranscript,
  onCodeChange,
}: CodeEditorPanelProps) {
  const [code, setCode] = useState(initialCode);
  const [prompt, setPrompt] = useState("");
  const [transcript, setTranscript] = useState<AiTurn[]>([]);
  const [testResult, setTestResult] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const updateCode = useCallback(
    (value: string) => {
      setCode(value);
      onCodeChange?.(value);
    },
    [onCodeChange],
  );

  const appendTurns = useCallback(
    (turns: readonly AiTurn[]) => {
      setTranscript((current) => {
        const next = [...current, ...turns];
        onTranscript?.(next);
        return next;
      });
    },
    [onTranscript],
  );

  const askAi = useCallback(async () => {
    const question = prompt.trim();
    if (question.length === 0 || !onAskAi) {
      return;
    }
    setBusy(true);
    const now = new Date().toISOString();
    try {
      const reply = await onAskAi(question, code);
      appendTurns([
        { role: "candidate", text: question, at: now },
        { role: "assistant", text: reply, at: new Date().toISOString() },
      ]);
      setPrompt("");
    } finally {
      setBusy(false);
    }
  }, [appendTurns, code, onAskAi, prompt]);

  const runTests = useCallback(async () => {
    if (!onRunTests) {
      return;
    }
    setBusy(true);
    try {
      setTestResult(await onRunTests(code));
    } finally {
      setBusy(false);
    }
  }, [code, onRunTests]);

  return (
    <section className="grid grid-cols-1 gap-4 lg:grid-cols-2">
      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <span className="text-xs font-medium uppercase tracking-wide text-slate-500">
            {language}
          </span>
          <button
            type="button"
            onClick={runTests}
            disabled={busy || !onRunTests}
            className="rounded-lg bg-slate-900 px-3 py-1.5 text-sm font-medium text-white disabled:opacity-50"
          >
            Run tests
          </button>
        </div>
        <textarea
          value={code}
          onChange={(event) => updateCode(event.target.value)}
          spellCheck={false}
          className="h-80 w-full rounded-lg border border-slate-300 bg-slate-50 p-3 font-mono text-sm"
        />
        {testResult ? (
          <pre className="whitespace-pre-wrap rounded-lg bg-slate-900 p-3 text-xs text-slate-100">
            {testResult}
          </pre>
        ) : null}
      </div>

      <div className="flex flex-col gap-3">
        <p className="text-xs text-slate-500">
          AI assistant — your conversation is recorded and reviewed as part of the
          exercise. We assess how you work with AI, not whether you avoid it.
        </p>
        <ol className="flex h-64 flex-col gap-2 overflow-y-auto rounded-lg border border-slate-200 p-3">
          {transcript.map((turn, index) => (
            <li
              key={`${turn.at}-${index}`}
              className={turn.role === "candidate" ? "text-sm text-slate-900" : "text-sm text-violet-700"}
            >
              <span className="font-medium">{turn.role === "candidate" ? "You" : "AI"}:</span>{" "}
              {turn.text}
            </li>
          ))}
        </ol>
        <div className="flex gap-2">
          <input
            value={prompt}
            onChange={(event) => setPrompt(event.target.value)}
            placeholder="Ask the assistant…"
            className="flex-1 rounded-lg border border-slate-300 px-3 py-1.5 text-sm"
          />
          <button
            type="button"
            onClick={askAi}
            disabled={busy || !onAskAi}
            className="rounded-lg bg-violet-600 px-3 py-1.5 text-sm font-medium text-white disabled:opacity-50"
          >
            Ask
          </button>
        </div>
      </div>
    </section>
  );
}

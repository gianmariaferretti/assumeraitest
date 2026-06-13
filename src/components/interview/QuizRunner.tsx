"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import type {
  QuizForm,
  QuizItemPublic,
} from "@/features/scoring/module-scoring";

/**
 * Timed quiz runner (Phase 0 modality) for deterministic/interactive modules.
 *
 * The runner only ever receives the PUBLIC item projection — it never sees an
 * answer key (grading is server-side). It collects the candidate's answers and
 * emits them on submit; it does NOT send timestamps, because timing is
 * server-authoritative (the submit route stamps issued_at/answered_at). The
 * on-screen countdown is a courtesy for the candidate, not the source of truth.
 */

export interface QuizRunnerAnswer {
  readonly item_id: string;
  /** Shape depends on item type; validated + graded server-side. */
  readonly answer: unknown;
}

export function QuizRunner({
  form,
  onSubmit,
}: {
  readonly form: QuizForm;
  readonly onSubmit: (answers: readonly QuizRunnerAnswer[]) => void;
}) {
  const [answers, setAnswers] = useState<Record<string, unknown>>({});
  const [secondsLeft, setSecondsLeft] = useState(form.module_time_limit_seconds);

  const setAnswer = useCallback((itemId: string, value: unknown) => {
    setAnswers((current) => ({ ...current, [itemId]: value }));
  }, []);

  const submit = useCallback(() => {
    onSubmit(form.items.map((item) => ({ item_id: item.item_id, answer: answers[item.item_id] })));
  }, [answers, form.items, onSubmit]);

  // Courtesy countdown; the server enforces the real deadline.
  useEffect(() => {
    if (secondsLeft <= 0) {
      submit();
      return;
    }
    const timer = setTimeout(() => setSecondsLeft((value) => value - 1), 1000);
    return () => clearTimeout(timer);
  }, [secondsLeft, submit]);

  const minutes = useMemo(() => Math.floor(secondsLeft / 60), [secondsLeft]);
  const seconds = useMemo(() => secondsLeft % 60, [secondsLeft]);

  return (
    <section className="flex flex-col gap-6">
      <header className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-slate-900">Assessment</h2>
        <span
          aria-live="polite"
          className="rounded-full bg-slate-100 px-3 py-1 text-sm font-medium text-slate-700"
        >
          {minutes}:{String(seconds).padStart(2, "0")}
        </span>
      </header>

      <ol className="flex flex-col gap-6">
        {form.items.map((item, index) => (
          <li key={item.item_id} className="rounded-xl border border-slate-200 bg-white p-5">
            <p className="mb-3 text-sm font-medium text-slate-900">
              {index + 1}. {item.stem}
            </p>
            <QuizItemInput
              item={item}
              value={answers[item.item_id]}
              onChange={(value) => setAnswer(item.item_id, value)}
            />
          </li>
        ))}
      </ol>

      <button
        type="button"
        onClick={submit}
        className="self-end rounded-lg bg-violet-600 px-4 py-2 text-sm font-medium text-white hover:bg-violet-700"
      >
        Submit
      </button>
    </section>
  );
}

function QuizItemInput({
  item,
  value,
  onChange,
}: {
  readonly item: QuizItemPublic;
  readonly value: unknown;
  readonly onChange: (value: unknown) => void;
}) {
  if (item.type === "single_choice") {
    return (
      <fieldset className="flex flex-col gap-2">
        {(item.options ?? []).map((option) => (
          <label key={option.id} className="flex items-center gap-2 text-sm text-slate-700">
            <input
              type="radio"
              name={item.item_id}
              checked={value === option.id}
              onChange={() => onChange(option.id)}
            />
            {option.label}
          </label>
        ))}
      </fieldset>
    );
  }

  if (item.type === "multi_choice") {
    const selected = Array.isArray(value) ? (value as string[]) : [];
    return (
      <fieldset className="flex flex-col gap-2">
        {(item.options ?? []).map((option) => (
          <label key={option.id} className="flex items-center gap-2 text-sm text-slate-700">
            <input
              type="checkbox"
              checked={selected.includes(option.id)}
              onChange={(event) =>
                onChange(
                  event.target.checked
                    ? [...selected, option.id]
                    : selected.filter((id) => id !== option.id),
                )
              }
            />
            {option.label}
          </label>
        ))}
      </fieldset>
    );
  }

  if (item.type === "numeric_entry") {
    return (
      <input
        type="number"
        value={typeof value === "number" ? value : ""}
        onChange={(event) => onChange(event.target.value === "" ? undefined : Number(event.target.value))}
        className="w-40 rounded-lg border border-slate-300 px-3 py-1.5 text-sm"
      />
    );
  }

  // ordering / matching / hotspot get richer inputs as those modules land;
  // Phase 0 ships the choice + numeric inputs the MVP modules use.
  return (
    <p className="text-xs text-slate-400">
      This item type is presented by a dedicated widget in a later phase.
    </p>
  );
}

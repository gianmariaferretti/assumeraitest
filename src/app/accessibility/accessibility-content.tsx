"use client";

import { useI18n } from "@/lib/i18n";

export function AccessibilityContent() {
  const { t } = useI18n();
  const copy = t.accessibility;

  return (
    <main className="mx-auto max-w-3xl px-6 py-16">
      <h1 className="text-3xl font-semibold">{copy.title}</h1>
      <p className="mt-4 text-lg">{copy.intro}</p>

      <section aria-labelledby="accessibility-text-mode" className="mt-10">
        <h2 className="text-xl font-semibold" id="accessibility-text-mode">
          {copy.textModeTitle}
        </h2>
        <p className="mt-2">{copy.textModeBody}</p>
      </section>

      <section aria-labelledby="accessibility-accommodation" className="mt-8">
        <h2 className="text-xl font-semibold" id="accessibility-accommodation">
          {copy.accommodationTitle}
        </h2>
        <p className="mt-2">{copy.accommodationBody}</p>
      </section>

      <section aria-labelledby="accessibility-asr" className="mt-8">
        <h2 className="text-xl font-semibold" id="accessibility-asr">
          {copy.asrTitle}
        </h2>
        <p className="mt-2">{copy.asrBody}</p>
      </section>

      <section aria-labelledby="accessibility-contact" className="mt-8">
        <h2 className="text-xl font-semibold" id="accessibility-contact">
          {copy.contactTitle}
        </h2>
        <p className="mt-2">{copy.contactBody}</p>
      </section>
    </main>
  );
}

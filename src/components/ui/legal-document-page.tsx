type LegalSection = {
  title: string;
  body: string[];
  bullets?: string[];
};

type LegalDocumentPageProps = {
  eyebrow: string;
  title: string;
  description: string;
  updated: string;
  sections: LegalSection[];
};

function sectionId(title: string) {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

export function LegalDocumentPage({
  eyebrow,
  title,
  description,
  updated,
  sections,
}: LegalDocumentPageProps) {
  return (
    <div
      className="min-h-screen bg-[linear-gradient(180deg,var(--page-bg-soft)_0%,var(--page-bg)_46%,var(--page-bg-soft)_100%)] text-[color:var(--page-text)]"
      style={{ fontFamily: "var(--font-geist-sans), sans-serif" }}
    >
      <section className="mx-auto max-w-[1120px] px-6 pb-14 pt-28 sm:pb-16 sm:pt-32">
        <p className="text-xs font-bold uppercase leading-none tracking-[0.28em] text-[color:var(--page-accent-strong)]">
          {eyebrow}
        </p>
        <h1 className="mt-5 max-w-4xl text-4xl font-bold leading-[1.02] text-[#0b2146] sm:text-6xl">
          {title}
        </h1>
        <p className="mt-6 max-w-3xl text-base font-medium leading-7 text-[color:var(--page-text-muted)] sm:text-lg">
          {description}
        </p>
        <p className="mt-6 text-sm font-semibold text-[color:var(--page-text)]">
          Last updated: {updated}
        </p>
      </section>

      <div className="mx-auto grid max-w-[1120px] gap-10 px-6 pb-24 lg:grid-cols-[15rem_minmax(0,1fr)] lg:gap-14">
        <aside className="lg:sticky lg:top-24 lg:self-start" aria-label="Legal page sections">
          <nav className="border-l border-[color:var(--page-border)] pl-4">
            <ol className="space-y-3">
              {sections.map((section) => (
                <li key={section.title}>
                  <a
                    href={`#${sectionId(section.title)}`}
                    className="text-sm font-semibold leading-5 text-[color:var(--page-text-muted)] transition-colors hover:text-[color:var(--page-accent-strong)]"
                  >
                    {section.title}
                  </a>
                </li>
              ))}
            </ol>
          </nav>
        </aside>

        <article className="space-y-10">
          {sections.map((section, index) => (
            <section
              id={sectionId(section.title)}
              key={section.title}
              className="scroll-mt-28 border-t border-[color:var(--page-border)] pt-8"
            >
              <p className="text-sm font-bold text-[color:var(--page-accent-strong)]">
                {String(index + 1).padStart(2, "0")}
              </p>
              <h2 className="mt-3 text-2xl font-bold leading-tight text-[#0b2146] sm:text-3xl">
                {section.title}
              </h2>
              <div className="mt-5 space-y-4 text-base font-medium leading-7 text-[color:var(--page-text-muted)]">
                {section.body.map((paragraph) => (
                  <p key={paragraph}>{paragraph}</p>
                ))}
              </div>
              {section.bullets ? (
                <ul className="mt-5 grid gap-3 sm:grid-cols-2">
                  {section.bullets.map((bullet) => (
                    <li
                      key={bullet}
                      className="rounded-[8px] border border-[color:var(--page-border)] bg-[color:var(--page-surface)] px-4 py-3 text-sm font-semibold leading-6 text-[color:var(--page-text)]"
                    >
                      {bullet}
                    </li>
                  ))}
                </ul>
              ) : null}
            </section>
          ))}
        </article>
      </div>
    </div>
  );
}

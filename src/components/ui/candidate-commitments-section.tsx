export type CandidateCommitmentsCopy = {
  eyebrow: string;
  heading: string;
  items: Array<{
    body: string;
    label: string;
    title: string;
  }>;
};

export function CandidateCommitmentsSection({
  copy,
}: {
  copy: CandidateCommitmentsCopy;
}) {
  return (
    <section className="bg-white px-5 py-16 text-[#1d1d1f] sm:px-8 sm:py-20 lg:px-12 lg:py-24">
      <div className="mx-auto max-w-[1200px]">
        <div className="grid gap-6 border-y border-[#d2d2d7] py-8 lg:grid-cols-[0.82fr_1.18fr] lg:gap-12 lg:py-12">
          <div>
            <p className="text-xs font-medium uppercase tracking-[0.18em] text-[#6e6e73]">
              {copy.eyebrow}
            </p>
            <h2 className="mt-4 max-w-[11ch] text-balance text-5xl font-light leading-[0.96] tracking-normal sm:text-6xl lg:text-7xl">
              {copy.heading}
            </h2>
          </div>

          <div className="grid gap-px overflow-hidden rounded-[8px] bg-[#d2d2d7] shadow-[0_18px_44px_rgba(0,0,0,0.06)]">
            {copy.items.map((commitment, index) => (
              <article
                className="relative isolate overflow-hidden bg-[#f5f5f7] px-5 py-6 sm:px-7 sm:py-8"
                key={commitment.label}
              >
                <span
                  aria-hidden="true"
                  className="absolute right-5 top-5 text-6xl font-light leading-none text-white sm:text-7xl"
                >
                  {String(index + 1).padStart(2, "0")}
                </span>
                <div className="relative z-10 max-w-3xl">
                  <p className="mb-4 inline-flex rounded-full border border-[#d2d2d7] bg-white px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-[#6e6e73]">
                    {commitment.label}
                  </p>
                  <h3 className="text-2xl font-semibold leading-tight text-[#040817] sm:text-3xl">
                    {commitment.title}
                  </h3>
                  <p className="mt-4 max-w-2xl text-[0.95rem] font-normal leading-7 text-[#6e6e73] sm:text-base">
                    {commitment.body}
                  </p>
                </div>
              </article>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

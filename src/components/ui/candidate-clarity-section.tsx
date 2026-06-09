type CandidateClarityItem = {
  body: string;
  title: string;
};

type CandidateClarityColumn = {
  eyebrow: string;
  intro: string;
  items: CandidateClarityItem[];
};

export type CandidateClarityCopy = {
  columns: CandidateClarityColumn[];
  eyebrow: string;
  heading: string;
};

export function CandidateClaritySection({
  copy,
}: {
  copy: CandidateClarityCopy;
}) {
  return (
    <section className="bg-[#f5f5f7] px-5 py-14 text-[#1d1d1f] [font-family:var(--font-geist-sans),sans-serif] sm:px-8 sm:py-16 lg:px-12 lg:py-20">
      <div className="mx-auto max-w-[1040px]">
        <p className="text-xs font-medium uppercase tracking-[0.18em] text-[#6e6e73]">
          {copy.eyebrow}
        </p>
        <h2 className="mt-4 max-w-[820px] text-balance text-4xl font-light leading-[1.0] tracking-normal sm:text-5xl lg:text-6xl">
          {copy.heading}
        </h2>

        <div className="mt-8 grid grid-cols-2 gap-px overflow-hidden rounded-[8px] bg-[#d2d2d7] shadow-[0_18px_44px_rgba(0,0,0,0.06)]">
          {copy.columns.map((column) => (
            <article className="bg-white p-3 sm:p-6 lg:p-7" key={column.eyebrow}>
              <div className="max-w-[34rem]">
                <p className="text-sm font-semibold leading-tight text-[#1d1d1f]">
                  {column.eyebrow}
                </p>
                <p className="mt-2 text-[0.78rem] font-medium leading-5 text-[#6e6e73] sm:text-base sm:leading-6">
                  {column.intro}
                </p>
              </div>

              <div className="mt-4 grid gap-px overflow-hidden rounded-[8px] bg-[#e5e5ea] sm:mt-6">
                {column.items.map((item) => (
                  <div className="bg-white py-3 sm:py-4" key={item.title}>
                    <h3 className="text-[0.9rem] font-semibold leading-tight text-[#1d1d1f] sm:text-lg">
                      {item.title}
                    </h3>
                    <p className="mt-1.5 text-[0.78rem] font-normal leading-5 text-[#6e6e73] sm:text-[0.95rem] sm:leading-6">
                      {item.body}
                    </p>
                  </div>
                ))}
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

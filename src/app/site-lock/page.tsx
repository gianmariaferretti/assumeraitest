import { normalizeSiteLockNext } from "@/lib/site-password";
import type { Metadata } from "next";
import { SiteLockForm } from "./site-lock-form";

export const metadata: Metadata = {
  title: "Private access | Assumerai",
  description: "Enter the access password to view Assumerai.",
};

export default async function SiteLockPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string | string[] }>;
}) {
  const params = await searchParams;
  const rawNext = Array.isArray(params.next) ? params.next[0] : params.next;
  const nextPath = normalizeSiteLockNext(rawNext ?? "/");

  return (
    <div className="fixed inset-0 z-[9999] overflow-y-auto bg-[#11131f] px-5 py-8 text-white">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(255,138,184,0.28),transparent_34%),radial-gradient(circle_at_82%_18%,rgba(130,169,255,0.22),transparent_30%),linear-gradient(135deg,#11131f_0%,#271627_48%,#101826_100%)]" />
      <main className="relative mx-auto flex min-h-[calc(100vh-4rem)] w-full max-w-5xl items-center">
        <section className="grid w-full gap-8 md:grid-cols-[1fr_420px] md:items-center">
          <div className="max-w-2xl">
            <p className="text-sm font-semibold uppercase text-[#ffb8d2]">
              Private preview
            </p>
            <h1 className="mt-4 max-w-xl text-4xl font-semibold leading-tight text-white sm:text-5xl">
              Assumerai is password protected.
            </h1>
            <p className="mt-5 max-w-lg text-base leading-7 text-white/72">
              Enter the shared access password to continue to the live site.
            </p>
          </div>

          <div className="rounded-[8px] border border-white/14 bg-white/[0.09] p-6 shadow-2xl shadow-black/30 backdrop-blur-xl sm:p-7">
            <div className="flex items-center gap-3">
              <div className="flex size-10 items-center justify-center rounded-[8px] bg-white/12 text-[#ffb8d2]">
                AI
              </div>
              <div>
                <p className="text-sm font-semibold text-white">Assumerai</p>
                <p className="text-sm text-white/55">Access required</p>
              </div>
            </div>
            <SiteLockForm nextPath={nextPath} />
          </div>
        </section>
      </main>
    </div>
  );
}


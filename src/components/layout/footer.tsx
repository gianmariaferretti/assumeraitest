"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { ArrowRight } from "lucide-react";
import { useI18n } from "@/lib/i18n";

export function Footer() {
  const { t } = useI18n();
  const pathname = usePathname();

  if (
    pathname === "/login" ||
    pathname === "/signup" ||
    pathname === "/site-lock" ||
    pathname === "/candidate" ||
    pathname.startsWith("/candidate/")
  ) {
    return null;
  }

  return (
    <footer
      className="mt-auto border-t border-[color:var(--page-border)] bg-[radial-gradient(circle_at_88%_0%,var(--page-blue-surface),transparent_34%),radial-gradient(circle_at_8%_100%,var(--page-warm-surface),transparent_30%),linear-gradient(90deg,var(--page-bg-soft)_0%,var(--page-bg)_100%)] px-6 py-10 text-[color:var(--page-text)] sm:py-12"
      style={{ fontFamily: "var(--font-geist-sans), sans-serif" }}
    >
      <div className="mx-auto grid max-w-[1200px] gap-10 lg:grid-cols-[1.55fr_2.2fr_1.25fr] lg:items-start">
        <div className="max-w-sm">
          <Link href="/" className="inline-flex items-center gap-2">
            <span
              className="inline-flex size-9 items-center justify-center overflow-hidden rounded-[10px] bg-gradient-to-br from-cyan-500 to-blue-600 shadow-[0_14px_32px_rgba(37,99,235,0.20)]"
              aria-hidden="true"
            >
              <Image
                src="/logo_assumerai.png"
                alt=""
                width={36}
                height={36}
                className="size-9 scale-[1.58] object-contain"
              />
            </span>
            <span className="text-lg font-bold tracking-[-0.03em] text-[#0b2146]">
              Assumer<span className="text-sky-500">AI</span>
            </span>
          </Link>

          <p className="mt-5 max-w-[21rem] text-sm font-medium leading-6 text-[color:var(--page-text-muted)]">
            {t.footer.tagline}
          </p>
        </div>

        <nav
          aria-label={t.footer.navigationLabel}
          className="grid gap-8 sm:grid-cols-3 lg:gap-12"
        >
          {t.footer.columns.map((column) => (
            <div key={column.title}>
              <h2 className="text-[0.68rem] font-bold uppercase leading-none tracking-[0.34em] text-[color:var(--page-text-muted)]">
                {column.title}
              </h2>
              <ul className="mt-5 space-y-3">
                {column.links.map((link) => (
                  <li key={`${column.title}-${link.label}`}>
                    <Link
                      href={link.href}
                      prefetch={false}
                      className="text-sm font-medium text-[color:var(--page-text)] transition-colors hover:text-[color:var(--page-accent-strong)]"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </nav>

        <div className="max-w-sm lg:justify-self-end">
          <h2 className="text-[0.68rem] font-bold uppercase leading-none tracking-[0.34em] text-[color:var(--page-text-muted)]">
            {t.footer.stayClose}
          </h2>
          <form className="mt-5 flex max-w-[16rem] items-center gap-3">
            <label className="sr-only" htmlFor="footer-email">
              {t.footer.workEmail}
            </label>
            <input
              id="footer-email"
              type="email"
              placeholder="you@work.com"
              className="min-w-0 flex-1 rounded-full border border-[color:var(--page-border)] bg-[var(--page-surface)] px-4 py-3 text-sm font-semibold text-[color:var(--page-text)] shadow-[inset_0_1px_0_rgba(255,255,255,0.8)] outline-none placeholder:text-[color:var(--page-text-muted)] focus:border-[color:var(--page-accent-strong)] focus:bg-[var(--page-surface-strong)]"
            />
            <button
              type="submit"
              className="inline-flex size-10 shrink-0 items-center justify-center rounded-full text-[color:var(--page-text)] shadow-[0_16px_34px_var(--page-shadow),0_0_28px_var(--page-accent-soft)] transition-transform hover:scale-[1.04] active:scale-[0.98]"
              aria-label={t.footer.mailingListLabel}
              style={{ backgroundImage: "var(--page-accent-gradient)" }}
            >
              <ArrowRight className="size-4" aria-hidden="true" strokeWidth={2.4} />
            </button>
          </form>
          <p className="mt-3 max-w-[14rem] text-xs font-medium leading-5 text-[color:var(--page-text-muted)]">
            {t.footer.note}
          </p>
        </div>
      </div>
    </footer>
  );
}

"use client";

import Link from "next/link";
import { Menu, X } from "lucide-react";
import { useEffect, useState } from "react";
import { LanguageSelector } from "@/components/layout/language-selector";
import { useI18n } from "@/lib/i18n";

type NavItem = {
  href: string;
  label: string;
};

type MobileNavMenuProps = {
  accountHref: string;
  gradient: string;
  hasLoadedAuth: boolean;
  isSignedIn: boolean;
  navItems: ReadonlyArray<NavItem>;
  onSignOut: () => Promise<void> | void;
};

export function MobileNavMenu({
  accountHref,
  gradient,
  hasLoadedAuth,
  isSignedIn,
  navItems,
  onSignOut,
}: MobileNavMenuProps) {
  const [isOpen, setIsOpen] = useState(false);
  const { t } = useI18n();

  useEffect(() => {
    if (!isOpen) return;

    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsOpen(false);
      }
    };

    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [isOpen]);

  const closeMenu = () => setIsOpen(false);

  return (
    <div className="lg:hidden">
      <button
        type="button"
        className="inline-flex size-10 items-center justify-center rounded-full border border-white/75 bg-white text-slate-800 shadow-[inset_0_1px_0_rgba(255,255,255,0.78),0_10px_24px_rgba(15,23,42,0.08)] transition-colors hover:bg-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-500"
        aria-label={isOpen ? t.mobileNav.close : t.mobileNav.open}
        aria-controls="mobile-navigation"
        aria-expanded={isOpen}
        onClick={() => setIsOpen((current) => !current)}
      >
        {isOpen ? (
          <X className="size-5" aria-hidden="true" strokeWidth={2.1} />
        ) : (
          <Menu className="size-5" aria-hidden="true" strokeWidth={2.1} />
        )}
      </button>

      {isOpen && (
        <div
          id="mobile-navigation"
          className="absolute left-0 right-0 top-[calc(100%+0.5rem)] overflow-hidden rounded-[1.65rem] border border-white/70 bg-white p-2 shadow-[0_24px_70px_rgba(15,23,42,0.16),inset_0_1px_0_rgba(255,255,255,0.82)]"
        >
          <div className="grid gap-1">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                prefetch={false}
                className="rounded-2xl px-4 py-3 text-[15px] font-semibold text-slate-800 transition-colors hover:bg-slate-100/80 hover:text-slate-950"
                onClick={closeMenu}
              >
                {item.label}
              </Link>
            ))}
          </div>

          <div className="mt-2 border-t border-slate-200/70 pt-2">
            <LanguageSelector onSelect={closeMenu} variant="mobile" />
          </div>

          {hasLoadedAuth && (
            <div className="mt-2 grid grid-cols-2 gap-2 border-t border-slate-200/70 pt-2">
              {isSignedIn ? (
                <>
                  <Link
                    href={accountHref}
                    className="inline-flex items-center justify-center rounded-2xl px-4 py-3 text-[14px] font-semibold transition-opacity hover:opacity-75"
                    onClick={closeMenu}
                  >
                    <span
                      className="bg-clip-text text-transparent"
                      style={{ backgroundImage: gradient }}
                    >
                      {t.common.userAccount}
                    </span>
                  </Link>
                  <button
                    type="button"
                    className="inline-flex items-center justify-center rounded-2xl bg-[#040817] px-4 py-3 text-[14px] font-semibold text-white shadow-[0_14px_30px_rgba(4,8,23,0.18)] transition-transform hover:scale-[1.01] active:scale-[0.99]"
                    onClick={() => {
                      closeMenu();
                      void onSignOut();
                    }}
                  >
                    {t.common.signOut}
                  </button>
                </>
              ) : (
                <>
                  <Link
                    href="/login"
                    className="inline-flex items-center justify-center rounded-2xl px-4 py-3 text-[14px] font-semibold transition-opacity hover:opacity-75"
                    onClick={closeMenu}
                  >
                    <span
                      className="bg-clip-text text-transparent"
                      style={{ backgroundImage: gradient }}
                    >
                      {t.common.signIn}
                    </span>
                  </Link>
                  <Link
                    href="/signup"
                    className="inline-flex items-center justify-center rounded-2xl px-4 py-3 text-[14px] font-semibold text-slate-900 shadow-[inset_0_1px_0_rgba(255,255,255,0.7),0_14px_30px_rgba(168,197,241,0.28)] transition-transform hover:scale-[1.01] active:scale-[0.99]"
                    style={{ backgroundImage: gradient }}
                    onClick={closeMenu}
                  >
                    {t.common.begin}
                  </Link>
                </>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

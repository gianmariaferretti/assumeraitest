"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import { LanguageSelector } from "@/components/layout/language-selector";
import { MobileNavMenu } from "@/components/layout/mobile-nav-menu";
import { createClient } from "@/lib/supabase/client";
import { getProfilePathForRole, getUserAccountRole } from "@/lib/auth/account-role";
import { useI18n } from "@/lib/i18n";
import type { User } from "@supabase/supabase-js";
import { useCallback, useEffect, useMemo, useState } from "react";

const onceGradient =
  "linear-gradient(110deg, #f7c8d9 0%, #e0b8e6 35%, #b9b8ee 65%, #a8c5f1 100%)";

const HIDDEN_HEADER_PATHS = new Set(["/login", "/signup", "/site-lock"]);

function isFocusedAppPath(pathname: string): boolean {
  return pathname === "/candidate" || pathname.startsWith("/candidate/");
}

export function Header() {
  const { t } = useI18n();
  const pathname = usePathname();
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);
  const [hasLoadedAuth, setHasLoadedAuth] = useState(false);
  const [isSignedIn, setIsSignedIn] = useState(false);
  const [accountHref, setAccountHref] = useState("/profile");
  const isHeaderHidden = HIDDEN_HEADER_PATHS.has(pathname) || isFocusedAppPath(pathname);
  const navItems = [
    { href: "/#how", label: t.nav.how },
    { href: "/product/candidates", label: t.nav.candidates },
    { href: "/product/hiring-teams", label: t.nav.companies },
    { href: "/product/pricing", label: t.nav.pricing },
    { href: "/contact", label: t.nav.contact },
  ];

  useEffect(() => {
    if (isHeaderHidden) return;

    let isMounted = true;

    const applyUser = (user: User | null) => {
      if (!isMounted) return;

      setIsSignedIn(Boolean(user));
      setAccountHref(
        user ? getProfilePathForRole(getUserAccountRole(user)) : "/profile",
      );
      setHasLoadedAuth(true);
    };

    const loadUser = async () => {
      const { data: sessionData } = await supabase.auth.getSession();
      if (!sessionData.session) {
        applyUser(null);
        return;
      }

      const { data } = await supabase.auth.getUser();
      applyUser(data.user);
    };

    void loadUser();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      applyUser(session?.user ?? null);
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, [isHeaderHidden, supabase]);

  const handleSignOut = useCallback(async () => {
    setIsSignedIn(false);
    setAccountHref("/profile");
    setHasLoadedAuth(true);

    try {
      await supabase.auth.signOut();
      await fetch("/auth/sign-out", { cache: "no-store" });
    } finally {
      router.refresh();
    }
  }, [router, supabase]);

  if (isHeaderHidden) {
    return null;
  }

  return (
    <header className="fixed inset-x-0 top-3 z-40 px-4">
      <nav
        className="relative mx-auto flex max-w-[1200px] items-center justify-between gap-3 rounded-full border border-white/65 bg-white px-3 py-2.5 shadow-[0_22px_70px_rgba(15,23,42,0.10),inset_0_1px_0_rgba(255,255,255,0.78)]"
        style={{ fontFamily: "var(--font-geist-sans), sans-serif" }}
      >
        <Link href="/" className="flex shrink-0 items-center gap-2 pl-2">
          <span
            className="inline-flex size-9 items-center justify-center overflow-hidden rounded-full shadow-[inset_0_1px_0_rgba(255,255,255,0.78),0_10px_24px_rgba(168,197,241,0.35)] ring-1 ring-white/80"
            style={{ backgroundImage: onceGradient }}
            aria-hidden="true"
          >
            <Image
              src="/logo_assumerai.png"
              alt=""
              width={36}
              height={36}
              className="size-9 scale-[1.58] object-contain"
              preload
            />
          </span>
          <span
            className="notranslate text-[15px] font-bold tracking-tighter text-slate-900 [font-family:var(--font-geist-sans),sans-serif]"
            translate="no"
          >
            {t.brand}
          </span>
        </Link>

        <div className="hidden items-center gap-1 lg:flex">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              prefetch={false}
              className="rounded-full px-3 py-2 text-[13px] font-medium text-slate-700 transition-colors hover:bg-white/55 hover:text-slate-950"
            >
              {item.label}
            </Link>
          ))}
        </div>

        <div className="flex shrink-0 items-center gap-2">
          <LanguageSelector />
          {hasLoadedAuth ? (
            isSignedIn ? (
              <>
                <Link
                  href={accountHref}
                  className="hidden rounded-full px-3 py-2 text-[13px] font-semibold transition-opacity hover:opacity-75 sm:inline-flex"
                >
                  <span
                    className="bg-clip-text text-transparent"
                    style={{ backgroundImage: onceGradient }}
                  >
                    {t.common.userAccount}
                  </span>
                </Link>
                <button
                  type="button"
                  onClick={() => void handleSignOut()}
                  className="inline-flex items-center gap-1.5 rounded-full bg-[#040817] px-4 py-2 text-[13px] font-semibold text-white shadow-[0_14px_30px_rgba(4,8,23,0.18)] transition-transform hover:scale-[1.02] active:scale-[0.98]"
                >
                  {t.common.signOut}
                </button>
              </>
            ) : (
              <>
                <Link
                  href="/login"
                  className="hidden rounded-full px-3 py-2 text-[13px] font-semibold transition-opacity hover:opacity-75 sm:inline-flex"
                >
                  <span
                    className="bg-clip-text text-transparent"
                    style={{ backgroundImage: onceGradient }}
                  >
                    {t.common.signIn}
                  </span>
                </Link>
                <Link
                  href="/signup"
                  className="inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-[13px] font-semibold text-slate-900 shadow-[inset_0_1px_0_rgba(255,255,255,0.7),0_14px_30px_rgba(168,197,241,0.34)] transition-transform hover:scale-[1.02] active:scale-[0.98]"
                  style={{ backgroundImage: onceGradient }}
                >
                  {t.common.begin}
                </Link>
              </>
            )
          ) : (
            <span
              className="hidden h-9 w-[148px] rounded-full bg-slate-100/70 sm:inline-flex"
              aria-hidden="true"
            />
          )}
          <MobileNavMenu
            accountHref={accountHref}
            gradient={onceGradient}
            hasLoadedAuth={hasLoadedAuth}
            isSignedIn={isSignedIn}
            navItems={navItems}
            onSignOut={handleSignOut}
          />
        </div>
      </nav>
    </header>
  );
}

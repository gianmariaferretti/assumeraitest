"use client";

import {
  ArrowLeft,
  Bell,
  Building2,
  LockKeyhole,
  LogOut,
  Mail,
  ShieldCheck,
  UserRound,
  UsersRound,
} from "lucide-react";
import Link from "next/link";
import type { ComponentType } from "react";
import {
  getProfilePathForRole,
  type AccountRole,
} from "@/lib/auth/account-role";
import { useI18n } from "@/lib/i18n";

type ProfileSettingsContentProps = {
  accountRole: AccountRole;
  displayName: string;
  email: string | null;
};

const brandGradient =
  "linear-gradient(110deg, #f7c8d9 0%, #e0b8e6 35%, #b9b8ee 65%, #a8c5f1 100%)";

type IconComponent = ComponentType<{ className?: string; "aria-hidden"?: boolean }>;

const groupIcons = {
  candidate: [UserRound, LockKeyhole, Bell],
  company: [Building2, UsersRound, Bell],
} satisfies Record<AccountRole, IconComponent[]>;

export function ProfileSettingsContent({
  accountRole,
  displayName,
  email,
}: ProfileSettingsContentProps) {
  const { t } = useI18n();
  const settingsCopy = t.profile.settings;
  const roleSettingsCopy = settingsCopy[accountRole];

  return (
    <article className="min-h-screen bg-[#f5f5f7] pt-28 text-[#040817] [font-family:var(--font-geist-sans),sans-serif]">
      <div className="mx-auto flex w-full max-w-[980px] flex-col gap-5 px-4 pb-14 sm:px-6 lg:px-8">
        <Link
          href={getProfilePathForRole(accountRole)}
          className="inline-flex w-fit items-center gap-2 rounded-full px-3 py-2 text-sm font-semibold text-slate-700 transition-colors hover:bg-white hover:text-[#040817]"
        >
          <ArrowLeft className="size-4" aria-hidden="true" />
          {settingsCopy.backLabel}
        </Link>

        <section className="rounded-[8px] bg-white p-6 shadow-[0_24px_70px_rgba(15,23,42,0.08)] ring-1 ring-slate-200/70 sm:p-8">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                {settingsCopy.eyebrow}
              </p>
              <h1 className="mt-2 text-3xl font-semibold tracking-normal text-[#040817] sm:text-4xl">
                {displayName}
              </h1>
              <div className="mt-4 flex items-center gap-2 text-sm font-medium text-slate-600">
                <Mail className="size-4" aria-hidden="true" />
                <span>{email ?? roleSettingsCopy.emailFallback}</span>
              </div>
            </div>
            <div
              className="flex size-12 items-center justify-center rounded-[8px] shadow-[inset_0_1px_0_rgba(255,255,255,0.72),0_16px_34px_rgba(168,197,241,0.34)]"
              style={{ backgroundImage: brandGradient }}
              aria-hidden="true"
            >
              <ShieldCheck className="size-6 text-[#040817]" />
            </div>
          </div>
        </section>

        <section className="grid gap-5">
          {roleSettingsCopy.groups.map((group, index) => {
            const Icon = groupIcons[accountRole][index] ?? UserRound;

            return (
              <div
                key={group.title}
                className="rounded-[8px] border border-slate-200 bg-white p-6 shadow-[0_20px_58px_rgba(15,23,42,0.07)]"
              >
                <div className="flex items-center gap-3">
                  <Icon className="size-5 text-slate-700" aria-hidden="true" />
                  <h2 className="text-xl font-semibold tracking-normal">
                    {group.title}
                  </h2>
                </div>
                <div className="mt-5 grid gap-3">
                  {group.rows.map((row) => (
                    <div
                      key={row}
                      className="flex items-center justify-between rounded-[8px] bg-[#f8fafc] px-4 py-3"
                    >
                      <span className="text-sm font-medium text-slate-700">{row}</span>
                      <span className="text-xs font-semibold text-slate-500">
                        {settingsCopy.activeLabel}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </section>

        <section className="rounded-[8px] border border-slate-200 bg-white p-6 shadow-[0_20px_58px_rgba(15,23,42,0.07)]">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-xl font-semibold tracking-normal">
                {settingsCopy.signOutTitle}
              </h2>
              <p className="mt-2 text-sm leading-6 text-slate-600">
                {settingsCopy.signOutBody}
              </p>
            </div>
            <Link
              href="/auth/sign-out"
              prefetch={false}
              className="inline-flex w-fit items-center gap-2 rounded-full bg-[#040817] px-4 py-2 text-sm font-semibold text-white shadow-[0_16px_34px_rgba(4,8,23,0.18)] transition-transform hover:scale-[1.02] active:scale-[0.98]"
            >
              <LogOut className="size-4" aria-hidden="true" />
              {settingsCopy.signOutCta}
            </Link>
          </div>
        </section>
      </div>
    </article>
  );
}

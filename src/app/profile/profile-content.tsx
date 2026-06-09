"use client";

import {
  CheckCircle2,
  FileText,
  LockKeyhole,
  MessageSquareText,
} from "lucide-react";
import Link from "next/link";
import { useMemo, type ComponentType } from "react";
import {
  getSettingsPathForRole,
  type AccountRole,
} from "@/lib/auth/account-role";
import { useI18n, type Language } from "@/lib/i18n";

type ProfileContentProps = {
  accountRole: AccountRole;
  accountCreatedAt: string | null;
  candidateProcessProgress?: CandidateProcessProgress;
  displayName: string;
  email: string | null;
};

type IconComponent = ComponentType<{ className?: string; "aria-hidden"?: boolean }>;

type CandidateProcessProgress = {
  readonly status: "supabase_persisted" | "local_fallback" | "supabase_unavailable";
  readonly hasResumeDocument: boolean;
  readonly profileConfirmed: boolean;
  readonly disclosureAcknowledged: boolean;
  readonly deviceCheckCompleted: boolean;
  readonly interviewCompleted: boolean;
  readonly hasActiveSharingSnapshot: boolean;
  readonly latestResumeDocumentId?: string;
  readonly latestInterviewSessionId?: string;
};

type ProfileStep = {
  readonly body: string;
  readonly href: string;
  readonly icon?: IconComponent;
  readonly isComplete: boolean;
  readonly label: string;
  readonly statusLabel: string;
  readonly tone: "done" | "current" | "pending" | "private";
};

type CandidateNextAction = {
  readonly href: string;
  readonly label: string;
  readonly helper: string;
};

const brandGradient =
  "linear-gradient(110deg, #f7c8d9 0%, #e0b8e6 35%, #b9b8ee 65%, #a8c5f1 100%)";
const START_INTERVIEW_PROCESS_HREF = "/candidate?selectLanguage=1";

const localeByLanguage = {
  en: "en",
  it: "it-IT",
  fr: "fr-FR",
} satisfies Record<Language, string>;

const candidateProcessText = {
  en: {
    primaryEyebrow: "Candidate workspace",
    primaryTitle: "Start interview",
    primaryBody:
      "Everything here is ordered around the next required step. Your profile stays private until you approve company access.",
    stepsTitle: "Steps completed so far",
    accountDone: "Done",
    cvDone: "Done",
    cvReady: "Start",
    interviewDone: "Done",
    interviewReady: "Ready",
    interviewPending: "Pending",
    visibilityShared: "Sharing active",
    visibilityPrivate: "Private",
    accountBody: "Your signed-in candidate account is ready.",
    cvDoneBody: "Resume intake has started and profile evidence is saved.",
    cvReadyBody: "Start with privacy consent and resume upload.",
    interviewDoneBody: "Interview evidence is complete and ready for review.",
    interviewReadyBody: "Continue with disclosure, device check, and live interview.",
    interviewPendingBody: "Confirm your profile before the interview opens.",
    privateBody: "Employers cannot see your profile until you accept a scoped match.",
    sharedBody: "You have at least one active candidate-approved sharing snapshot.",
    nextUpload: "Upload your resume first.",
    nextProfile: "Review and confirm the parsed profile.",
    nextDisclosure: "Choose language and acknowledge the interview disclosure.",
    nextDevice: "Complete camera and microphone checks.",
    nextInterview: "Answer the live interview questions.",
    nextResults: "Review evidence, matches, and sharing controls.",
    startSetup: "Start the interview process",
    continueSetup: "Continue setup",
    startInterview: "Start interview",
    reviewResults: "Review results",
    completeWord: "complete",
  },
  it: {
    primaryEyebrow: "Workspace candidato",
    primaryTitle: "Avvia colloquio",
    primaryBody:
      "Tutto e ordinato attorno al prossimo passaggio richiesto. Il profilo resta privato finche approvi l'accesso azienda.",
    stepsTitle: "Passaggi completati finora",
    accountDone: "Fatto",
    cvDone: "Fatto",
    cvReady: "Avvia",
    interviewDone: "Fatto",
    interviewReady: "Pronto",
    interviewPending: "In attesa",
    visibilityShared: "Condivisione attiva",
    visibilityPrivate: "Privato",
    accountBody: "Il tuo account candidato e pronto.",
    cvDoneBody: "L'intake CV e iniziato e le evidenze profilo sono salvate.",
    cvReadyBody: "Inizia da privacy, consenso e caricamento CV.",
    interviewDoneBody: "Le evidenze del colloquio sono complete per la revisione.",
    interviewReadyBody: "Continua con disclosure, controllo dispositivi e colloquio live.",
    interviewPendingBody: "Conferma il profilo prima di aprire il colloquio.",
    privateBody: "Le aziende non vedono il profilo finche non accetti un match.",
    sharedBody: "Hai almeno una condivisione approvata dal candidato.",
    nextUpload: "Carica prima il CV.",
    nextProfile: "Rivedi e conferma il profilo estratto.",
    nextDisclosure: "Scegli lingua e accetta la disclosure colloquio.",
    nextDevice: "Completa i controlli camera e microfono.",
    nextInterview: "Rispondi alle domande del colloquio live.",
    nextResults: "Rivedi evidenze, match e controlli di condivisione.",
    startSetup: "Avvia il processo di colloquio",
    continueSetup: "Continua setup",
    startInterview: "Avvia colloquio",
    reviewResults: "Rivedi risultati",
    completeWord: "completati",
  },
  fr: {
    primaryEyebrow: "Espace candidat",
    primaryTitle: "Demarrer entretien",
    primaryBody:
      "Tout est organise autour de la prochaine etape requise. Le profil reste prive tant que vous n'approuvez pas l'acces entreprise.",
    stepsTitle: "Etapes terminees jusqu'ici",
    accountDone: "Fait",
    cvDone: "Fait",
    cvReady: "Demarrer",
    interviewDone: "Fait",
    interviewReady: "Pret",
    interviewPending: "En attente",
    visibilityShared: "Partage actif",
    visibilityPrivate: "Prive",
    accountBody: "Votre compte candidat connecte est pret.",
    cvDoneBody: "L'import CV a commence et les preuves de profil sont enregistrees.",
    cvReadyBody: "Commencez par la confidentialite, le consentement et le CV.",
    interviewDoneBody: "Les preuves d'entretien sont completes pour revue.",
    interviewReadyBody: "Continuez avec disclosure, verification appareil et entretien live.",
    interviewPendingBody: "Confirmez le profil avant d'ouvrir l'entretien.",
    privateBody: "Les entreprises ne voient rien tant que vous n'acceptez pas un match.",
    sharedBody: "Au moins un partage approuve par le candidat est actif.",
    nextUpload: "Importez d'abord votre CV.",
    nextProfile: "Verifiez et confirmez le profil extrait.",
    nextDisclosure: "Choisissez la langue et acceptez la disclosure entretien.",
    nextDevice: "Terminez les tests camera et micro.",
    nextInterview: "Repondez aux questions de l'entretien live.",
    nextResults: "Revoyez preuves, matches et controles de partage.",
    startSetup: "Demarrer le processus d'entretien",
    continueSetup: "Continuer setup",
    startInterview: "Demarrer entretien",
    reviewResults: "Voir resultats",
    completeWord: "terminees",
  },
} satisfies Record<Language, Record<string, string>>;

function getInitials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
}

function getCandidateProcessText(language: Language) {
  return candidateProcessText[language] ?? candidateProcessText.en;
}

function getProfileConfirmHref(progress: CandidateProcessProgress | undefined) {
  if (!progress?.latestResumeDocumentId) return "/candidate/resume";

  return `/candidate/profile/confirm?resumeDocumentId=${encodeURIComponent(
    progress.latestResumeDocumentId,
  )}`;
}

function getCandidateNextAction(
  progress: CandidateProcessProgress | undefined,
  text: ReturnType<typeof getCandidateProcessText>,
): CandidateNextAction {
  if (!progress?.hasResumeDocument) {
    return {
      href: START_INTERVIEW_PROCESS_HREF,
      label: text.startSetup,
      helper: text.nextUpload,
    };
  }

  if (!progress.profileConfirmed) {
    return {
      href: getProfileConfirmHref(progress),
      label: text.continueSetup,
      helper: text.nextProfile,
    };
  }

  if (!progress.disclosureAcknowledged) {
    return {
      href: "/candidate/interview/prepare",
      label: text.continueSetup,
      helper: text.nextDisclosure,
    };
  }

  if (!progress.deviceCheckCompleted) {
    return {
      href: "/candidate/interview/device-check",
      label: text.continueSetup,
      helper: text.nextDevice,
    };
  }

  if (!progress.interviewCompleted) {
    return {
      href: "/candidate/interview",
      label: text.startInterview,
      helper: text.nextInterview,
    };
  }

  return {
    href: "/candidate/results",
    label: text.reviewResults,
    helper: text.nextResults,
  };
}

function buildCandidateProcessSteps(
  labels: readonly { readonly label: string }[],
  progress: CandidateProcessProgress | undefined,
  text: ReturnType<typeof getCandidateProcessText>,
): ProfileStep[] {
  const hasResume = Boolean(progress?.hasResumeDocument);
  const profileConfirmed = Boolean(progress?.profileConfirmed);
  const interviewStarted = Boolean(
    progress?.disclosureAcknowledged ||
      progress?.deviceCheckCompleted ||
      progress?.latestInterviewSessionId,
  );
  const interviewCompleted = Boolean(progress?.interviewCompleted);
  const sharingActive = Boolean(progress?.hasActiveSharingSnapshot);

  return [
    {
      href: "/profile/settings",
      icon: CheckCircle2,
      isComplete: true,
      label: labels[0]?.label ?? "Account verified",
      statusLabel: text.accountDone,
      body: text.accountBody,
      tone: "done",
    },
    {
      href: hasResume && !profileConfirmed
        ? getProfileConfirmHref(progress)
        : START_INTERVIEW_PROCESS_HREF,
      icon: FileText,
      isComplete: hasResume,
      label: labels[1]?.label ?? "CV intake",
      statusLabel: hasResume ? text.cvDone : text.cvReady,
      body: hasResume ? text.cvDoneBody : text.cvReadyBody,
      tone: hasResume ? "done" : "current",
    },
    {
      href: profileConfirmed ? "/candidate/interview/prepare" : "/candidate/resume",
      icon: MessageSquareText,
      isComplete: interviewCompleted,
      label: labels[2]?.label ?? "Interview record",
      statusLabel: interviewCompleted
        ? text.interviewDone
        : profileConfirmed || interviewStarted
          ? text.interviewReady
          : text.interviewPending,
      body: interviewCompleted
        ? text.interviewDoneBody
        : profileConfirmed || interviewStarted
          ? text.interviewReadyBody
          : text.interviewPendingBody,
      tone: interviewCompleted ? "done" : profileConfirmed || interviewStarted ? "current" : "pending",
    },
    {
      href: interviewCompleted ? "/candidate/matches" : "/candidate/data",
      icon: LockKeyhole,
      isComplete: sharingActive,
      label: labels[3]?.label ?? "Visibility controls",
      statusLabel: sharingActive ? text.visibilityShared : text.visibilityPrivate,
      body: sharingActive ? text.sharedBody : text.privateBody,
      tone: sharingActive ? "done" : "private",
    },
  ];
}

function buildAccountReadinessSteps(
  labels: readonly { readonly label: string; readonly value: string }[],
  fallbackHref: string,
): ProfileStep[] {
  return labels.map((item, index) => ({
    href: fallbackHref,
    isComplete: index === 0,
    label: item.label,
    statusLabel: item.value,
    body: item.value,
    tone: index === 0 ? "current" : "pending",
  }));
}

function getStepRowClasses(tone: ProfileStep["tone"]) {
  const base =
    "group grid gap-3 px-0 py-5 text-left transition first:pt-0 last:pb-0 sm:grid-cols-[42px_minmax(0,1fr)_auto] sm:items-center focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#040817]";

  if (tone === "done") return `${base} text-[#040817]`;
  if (tone === "current") return `${base} text-[#040817]`;

  return `${base} text-slate-600`;
}

function getProcessBadgeClasses(tone: ProfileStep["tone"]) {
  if (tone === "done") return "bg-emerald-50 text-emerald-700 ring-emerald-200";
  if (tone === "current") return "bg-[#040817] text-white ring-[#040817]";
  if (tone === "private") return "bg-slate-100 text-slate-700 ring-slate-200";

  return "bg-slate-50 text-slate-500 ring-slate-200";
}

function getProgressSummary(language: Language, count: number, total: number) {
  if (language === "it") return `${count} di ${total} completati`;
  if (language === "fr") return `${count} sur ${total} terminees`;

  return `${count} of ${total} complete`;
}

export function ProfileContent({
  accountRole,
  accountCreatedAt,
  candidateProcessProgress,
  displayName,
  email,
}: ProfileContentProps) {
  const { language, t } = useI18n();
  const profileVariants = {
    candidate: t.profile.candidate,
    company: t.profile.company,
  };
  const profileCopy = t.profile[accountRole] ?? profileVariants[accountRole];
  const accountLabel =
    accountRole === "company" ? t.auth.companyAccount : t.auth.candidateAccount;
  const initials = getInitials(displayName) || "A";
  const joinedLabel = useMemo(() => {
    if (!accountCreatedAt) return profileCopy.activeLabel;

    return new Intl.DateTimeFormat(localeByLanguage[language], {
      day: "numeric",
      month: "short",
      year: "numeric",
    }).format(new Date(accountCreatedAt));
  }, [accountCreatedAt, language, profileCopy.activeLabel]);

  const processText = getCandidateProcessText(language);
  const candidateNextAction =
    accountRole === "candidate"
      ? getCandidateNextAction(candidateProcessProgress, processText)
      : undefined;
  const profileSteps =
    accountRole === "candidate"
      ? buildCandidateProcessSteps(
          profileCopy.readinessItems,
          candidateProcessProgress,
          processText,
        )
      : buildAccountReadinessSteps(profileCopy.readinessItems, profileCopy.workspaceHref);
  const completedStepCount = profileSteps.filter((step) => step.isComplete).length;
  const progressPercentage = Math.round(
    (completedStepCount / Math.max(profileSteps.length, 1)) * 100,
  );
  const progressSummary = getProgressSummary(
    language,
    completedStepCount,
    profileSteps.length,
  );
  const secondaryInfoItems = profileCopy.workflowCards;

  return (
    <article className="min-h-[100dvh] bg-[#f5f5f7] pt-28 text-[#040817] [font-family:var(--font-geist-sans),sans-serif]">
      <div
        data-profile-layout="account-left-interview-primary"
        className="mx-auto grid w-full max-w-[1240px] grid-cols-1 gap-6 px-4 pb-16 sm:px-6 lg:grid-cols-[320px_minmax(0,1fr)] lg:px-8"
      >
        <aside
          data-profile-region="account-controls"
          className="order-2 self-start rounded-[28px] border border-white bg-white/92 p-6 shadow-[0_24px_70px_rgba(15,23,42,0.08)] ring-1 ring-slate-200/70 lg:sticky lg:top-28 lg:order-none"
        >
          <div
            className="flex size-16 items-center justify-center rounded-[22px] text-xl font-semibold text-[#040817] shadow-[inset_0_1px_0_rgba(255,255,255,0.72),0_16px_34px_rgba(168,197,241,0.28)]"
            style={{ backgroundImage: brandGradient }}
            aria-hidden="true"
          >
            {initials}
          </div>

          <div className="mt-6 min-w-0">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
              {profileCopy.eyebrow}
            </p>
            <h1 className="mt-2 break-words text-3xl font-semibold tracking-normal text-[#040817] [overflow-wrap:anywhere]">
              {displayName}
            </h1>
            <p className="mt-2 break-words text-sm font-medium text-slate-600 [overflow-wrap:anywhere]">
              {email ?? profileCopy.emailFallback}
            </p>
          </div>

          <dl className="mt-7 divide-y divide-slate-200 text-sm">
            <div className="grid gap-1 py-4 first:pt-0">
              <dt className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">
                {accountLabel}
              </dt>
              <dd className="font-semibold text-[#040817]">{profileCopy.accountSuffix}</dd>
            </div>
            <div className="grid gap-1 py-4">
              <dt className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">
                {profileCopy.stateLabel}
              </dt>
              <dd className="font-semibold text-[#040817]">{profileCopy.stateValue}</dd>
              <dd className="leading-6 text-slate-600">{profileCopy.stateBody}</dd>
            </div>
            <div className="grid gap-1 py-4">
              <dt className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">
                {profileCopy.joinedLabel}
              </dt>
              <dd className="font-semibold text-[#040817]">{joinedLabel}</dd>
            </div>
          </dl>

          <div className="mt-2 flex flex-col gap-3">
            {accountRole === "company" ? (
              <>
                <Link
                  href={profileCopy.workspaceHref}
                  className="inline-flex min-h-11 items-center justify-center rounded-full bg-[#040817] px-5 text-sm font-semibold text-white shadow-[0_16px_34px_rgba(4,8,23,0.18)] transition-transform hover:scale-[1.01] active:scale-[0.98]"
                >
                  {profileCopy.workspaceCta}
                </Link>
                <Link
                  href={getSettingsPathForRole(accountRole)}
                  className="inline-flex min-h-11 items-center justify-center rounded-full bg-slate-100 px-5 text-sm font-semibold text-[#040817] transition-colors hover:bg-slate-200"
                >
                  {profileCopy.settingsCta}
                </Link>
              </>
            ) : (
              <Link
                href={getSettingsPathForRole(accountRole)}
                className="inline-flex min-h-11 items-center justify-center rounded-full bg-[#040817] px-5 text-sm font-semibold text-white shadow-[0_16px_34px_rgba(4,8,23,0.18)] transition-transform hover:scale-[1.01] active:scale-[0.98]"
              >
                {profileCopy.settingsCta}
              </Link>
            )}
          </div>
        </aside>

        <main className="order-1 grid min-w-0 gap-6 lg:order-none">
          <section
            data-profile-primary="candidate-interview-progress"
            className="rounded-[32px] border border-white bg-white p-6 shadow-[0_24px_70px_rgba(15,23,42,0.08)] ring-1 ring-slate-200/70 sm:p-8"
          >
            <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_260px] xl:items-start">
              <div className="min-w-0">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                  {accountRole === "candidate"
                    ? processText.primaryEyebrow
                    : profileCopy.eyebrow}
                </p>
                <h2 className="mt-3 text-4xl font-semibold tracking-normal text-[#040817] sm:text-5xl">
                  {accountRole === "candidate"
                    ? processText.primaryTitle
                    : profileCopy.stateValue}
                </h2>
                <p className="mt-4 max-w-[62ch] text-base leading-7 text-slate-600">
                  {accountRole === "candidate"
                    ? processText.primaryBody
                    : profileCopy.stateBody}
                </p>
              </div>

              <div className="rounded-[24px] bg-[#f8fafc] p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                  {progressSummary}
                </p>
                <div className="mt-4 h-2 overflow-hidden rounded-full bg-slate-200">
                  <div
                    className="h-full rounded-full bg-[#040817]"
                    style={{ width: `${progressPercentage}%` }}
                  />
                </div>
                {candidateNextAction ? (
                  <div className="mt-5 grid gap-3">
                    <p className="text-sm leading-6 text-slate-600">
                      {candidateNextAction.helper}
                    </p>
                    <Link
                      href={candidateNextAction.href}
                      aria-label={`${candidateNextAction.label}. ${candidateNextAction.helper}`}
                      className="inline-flex min-h-12 items-center justify-center rounded-full bg-[#040817] px-5 text-sm font-semibold text-white shadow-[0_16px_34px_rgba(4,8,23,0.18)] transition-transform hover:scale-[1.01] active:scale-[0.98]"
                    >
                      {candidateNextAction.label}
                    </Link>
                  </div>
                ) : null}
              </div>
            </div>

            <div className="mt-8">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
                <h3 className="text-xl font-semibold tracking-normal">
                  {accountRole === "candidate"
                    ? processText.stepsTitle
                    : profileCopy.preferenceTitle}
                </h3>
                <p className="text-sm font-medium text-slate-500">{progressSummary}</p>
              </div>

              <div className="mt-5 divide-y divide-slate-200">
                {profileSteps.map((item) => {
                  const Icon = item.icon;

                  return (
                    <Link
                      key={item.label}
                      href={item.href}
                      className={getStepRowClasses(item.tone)}
                    >
                      <div
                        className="hidden size-10 items-center justify-center rounded-2xl bg-slate-100 text-slate-700 sm:flex"
                        aria-hidden="true"
                      >
                        {Icon ? <Icon className="size-5" aria-hidden={true} /> : null}
                      </div>
                      <div className="min-w-0">
                        <p className="text-base font-semibold text-[#040817]">
                          {item.label}
                        </p>
                        <p className="mt-1 max-w-[68ch] text-sm leading-6 text-slate-600">
                          {item.body}
                        </p>
                      </div>
                      <span
                        className={`w-fit rounded-full px-3 py-1 text-xs font-semibold ring-1 ${getProcessBadgeClasses(
                          item.tone,
                        )}`}
                      >
                        {item.statusLabel}
                      </span>
                    </Link>
                  );
                })}
              </div>
            </div>
          </section>

          <section className="rounded-[28px] border border-white bg-white p-6 shadow-[0_20px_58px_rgba(15,23,42,0.06)] ring-1 ring-slate-200/70 sm:p-8">
            <div className="grid gap-8 xl:grid-cols-[minmax(0,1fr)_minmax(0,0.86fr)]">
              <div>
                <h2 className="text-2xl font-semibold tracking-normal">
                  {profileCopy.preferenceTitle}
                </h2>
                <div className="mt-5 divide-y divide-slate-200">
                  {profileCopy.preferenceItems.map((item) => (
                    <div key={item} className="flex items-center justify-between gap-4 py-3">
                      <span className="text-sm font-medium text-slate-700">{item}</span>
                      <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700 ring-1 ring-emerald-200">
                        {processText.accountDone}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <h2 className="text-2xl font-semibold tracking-normal">
                  {profileCopy.timelineTitle}
                </h2>
                <div className="mt-5 divide-y divide-slate-200">
                  {profileCopy.timeline.map((item) => (
                    <div key={item.label} className="py-3 first:pt-0">
                      <p className="text-sm font-semibold text-[#040817]">{item.label}</p>
                      <p className="mt-1 text-sm leading-6 text-slate-600">{item.detail}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="mt-8 border-t border-slate-200 pt-6">
              <h2 className="text-2xl font-semibold tracking-normal">
                {profileCopy.stateLabel}
              </h2>
              <div className="mt-5 grid gap-5 md:grid-cols-3">
                {secondaryInfoItems.map((card) => (
                  <div key={card.title} className="min-w-0">
                    <p className="text-sm font-semibold text-[#040817]">{card.title}</p>
                    <p className="mt-2 text-sm leading-6 text-slate-600">{card.body}</p>
                  </div>
                ))}
              </div>
            </div>
          </section>
        </main>
      </div>
    </article>
  );
}

/**
 * Notification templates for the 14-day verdict SLA, localized with the same
 * language codes as src/lib/i18n.tsx (en / it / fr; anything else resolves to
 * en). Plain text on purpose: deliverable everywhere, auditable, no tracking.
 */

export type EmailTemplateLanguage = "en" | "it" | "fr";

export function resolveEmailTemplateLanguage(value: unknown): EmailTemplateLanguage {
  return value === "it" || value === "fr" ? value : "en";
}

export interface RenderedEmail {
  readonly subject: string;
  readonly text: string;
}

function formatDueDate(dueAtIso: string, language: EmailTemplateLanguage): string {
  const locale = language === "it" ? "it-IT" : language === "fr" ? "fr-FR" : "en-GB";
  const parsed = new Date(dueAtIso);
  if (Number.isNaN(parsed.getTime())) {
    return dueAtIso;
  }

  return parsed.toLocaleDateString(locale, {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC"
  });
}

// ---------------------------------------------------------------------------
// 1. Candidate match notification (the match entered employer review)
// ---------------------------------------------------------------------------

export function candidateMatchNotificationEmail(input: {
  readonly language: unknown;
  readonly companyName: string;
  readonly roleTitle: string;
  readonly verdictDueAt: string;
}): RenderedEmail {
  const language = resolveEmailTemplateLanguage(input.language);
  const dueDate = formatDueDate(input.verdictDueAt, language);

  if (language === "it") {
    return {
      subject: `Il tuo profilo è in revisione: ${input.roleTitle} presso ${input.companyName}`,
      text: [
        "Ciao,",
        "",
        `hai condiviso il tuo profilo per il ruolo "${input.roleTitle}" presso ${input.companyName}.`,
        `L'azienda si è impegnata a darti un verdetto entro il ${dueDate} (14 giorni).`,
        "Ti avviseremo appena arriva una decisione. Ogni esito resta una raccomandazione rivista da una persona.",
        "",
        "AssumerAI"
      ].join("\n")
    };
  }

  if (language === "fr") {
    return {
      subject: `Votre profil est en cours d'examen : ${input.roleTitle} chez ${input.companyName}`,
      text: [
        "Bonjour,",
        "",
        `vous avez partagé votre profil pour le poste « ${input.roleTitle} » chez ${input.companyName}.`,
        `L'entreprise s'est engagée à rendre un verdict avant le ${dueDate} (14 jours).`,
        "Nous vous préviendrons dès qu'une décision arrive. Chaque décision reste une recommandation revue par un humain.",
        "",
        "AssumerAI"
      ].join("\n")
    };
  }

  return {
    subject: `Your profile is under review: ${input.roleTitle} at ${input.companyName}`,
    text: [
      "Hi,",
      "",
      `you shared your profile for the "${input.roleTitle}" role at ${input.companyName}.`,
      `The company committed to a verdict by ${dueDate} (14 days).`,
      "We will notify you as soon as a decision lands. Every outcome remains a human-reviewed recommendation.",
      "",
      "AssumerAI"
    ].join("\n")
  };
}

// ---------------------------------------------------------------------------
// 2. Company reminders (day 7 and day 12)
// ---------------------------------------------------------------------------

export type CompanyReminderKind = "day7" | "day12";

export function companyReminderEmail(input: {
  readonly language: unknown;
  readonly kind: CompanyReminderKind;
  readonly candidateName: string;
  readonly roleTitle: string;
  readonly verdictDueAt: string;
}): RenderedEmail {
  const language = resolveEmailTemplateLanguage(input.language);
  const dueDate = formatDueDate(input.verdictDueAt, language);
  const isFinal = input.kind === "day12";

  if (language === "it") {
    return {
      subject: isFinal
        ? `Ultimo promemoria: verdetto per ${input.candidateName} entro il ${dueDate}`
        : `Promemoria: ${input.candidateName} attende una revisione (${input.roleTitle})`,
      text: [
        `${input.candidateName} ha condiviso il profilo per "${input.roleTitle}" e attende un verdetto entro il ${dueDate}.`,
        isFinal
          ? "Mancano meno di 2 giorni alla scadenza dell'impegno di revisione di 14 giorni."
          : "Sono passati 7 giorni dei 14 dell'impegno di revisione.",
        "Apri la dashboard per registrare una decisione (avanza, in attesa, rifiuta).",
        "",
        "AssumerAI"
      ].join("\n")
    };
  }

  if (language === "fr") {
    return {
      subject: isFinal
        ? `Dernier rappel : verdict pour ${input.candidateName} avant le ${dueDate}`
        : `Rappel : ${input.candidateName} attend une revue (${input.roleTitle})`,
      text: [
        `${input.candidateName} a partagé son profil pour « ${input.roleTitle} » et attend un verdict avant le ${dueDate}.`,
        isFinal
          ? "Moins de 2 jours restent sur l'engagement de revue de 14 jours."
          : "7 jours des 14 jours d'engagement de revue sont écoulés.",
        "Ouvrez le tableau de bord pour enregistrer une décision.",
        "",
        "AssumerAI"
      ].join("\n")
    };
  }

  return {
    subject: isFinal
      ? `Final reminder: verdict for ${input.candidateName} due ${dueDate}`
      : `Reminder: ${input.candidateName} is waiting for review (${input.roleTitle})`,
    text: [
      `${input.candidateName} shared their profile for "${input.roleTitle}" and is owed a verdict by ${dueDate}.`,
      isFinal
        ? "Less than 2 days remain on the 14-day review commitment."
        : "7 of the 14 committed review days have passed.",
      "Open the dashboard to record a decision (advance, hold, decline).",
      "",
      "AssumerAI"
    ].join("\n")
  };
}

// ---------------------------------------------------------------------------
// 3. Verdict notification to the candidate
// ---------------------------------------------------------------------------

export type MatchVerdict = "advanced" | "hold" | "declined";

export function candidateVerdictNotificationEmail(input: {
  readonly language: unknown;
  readonly verdict: MatchVerdict;
  readonly companyName: string;
  readonly roleTitle: string;
}): RenderedEmail {
  const language = resolveEmailTemplateLanguage(input.language);

  const verdictLabel: Record<EmailTemplateLanguage, Record<MatchVerdict, string>> = {
    en: { advanced: "advanced", hold: "put on hold", declined: "declined" },
    it: { advanced: "avanzata", hold: "messa in attesa", declined: "rifiutata" },
    fr: { advanced: "avancée", hold: "mise en attente", declined: "déclinée" }
  };
  const label = verdictLabel[language][input.verdict];

  if (language === "it") {
    return {
      subject: `Verdetto per ${input.roleTitle} presso ${input.companyName}`,
      text: [
        "Ciao,",
        "",
        `${input.companyName} ha esaminato la tua candidatura per "${input.roleTitle}": la candidatura è stata ${label}.`,
        "Trovi i dettagli, le motivazioni e i prossimi passi nella tua area risultati.",
        "Ricorda: ogni verdetto è una raccomandazione registrata e rivista da una persona, mai una decisione automatica.",
        "",
        "AssumerAI"
      ].join("\n")
    };
  }

  if (language === "fr") {
    return {
      subject: `Verdict pour ${input.roleTitle} chez ${input.companyName}`,
      text: [
        "Bonjour,",
        "",
        `${input.companyName} a examiné votre candidature pour « ${input.roleTitle} » : la candidature a été ${label}.`,
        "Les détails, motivations et prochaines étapes sont dans votre espace résultats.",
        "Chaque verdict est une recommandation enregistrée et revue par un humain, jamais une décision automatique.",
        "",
        "AssumerAI"
      ].join("\n")
    };
  }

  return {
    subject: `Verdict for ${input.roleTitle} at ${input.companyName}`,
    text: [
      "Hi,",
      "",
      `${input.companyName} reviewed your application for "${input.roleTitle}": it was ${label}.`,
      "Details, reasons, and next steps are in your results area.",
      "Remember: every verdict is a recorded, human-reviewed recommendation — never an automated decision.",
      "",
      "AssumerAI"
    ].join("\n")
  };
}

// ---------------------------------------------------------------------------
// 4. SLA-breach escalation to an internal address
// ---------------------------------------------------------------------------

export function slaBreachEscalationEmail(input: {
  readonly language: unknown;
  readonly matchId: string;
  readonly companyName: string;
  readonly roleTitle: string;
  readonly verdictDueAt: string;
}): RenderedEmail {
  const language = resolveEmailTemplateLanguage(input.language);
  const dueDate = formatDueDate(input.verdictDueAt, language);

  if (language === "it") {
    return {
      subject: `SLA violata: nessun verdetto da ${input.companyName} (${input.roleTitle})`,
      text: [
        `Il match ${input.matchId} ha superato la scadenza di verdetto del ${dueDate}.`,
        `Azienda: ${input.companyName} — Ruolo: ${input.roleTitle}.`,
        "Promemoria giorno 7 e giorno 12 già inviati. Serve un follow-up manuale con l'azienda.",
        "",
        "AssumerAI — escalation interna"
      ].join("\n")
    };
  }

  if (language === "fr") {
    return {
      subject: `SLA dépassé : aucun verdict de ${input.companyName} (${input.roleTitle})`,
      text: [
        `Le match ${input.matchId} a dépassé l'échéance de verdict du ${dueDate}.`,
        `Entreprise : ${input.companyName} — Poste : ${input.roleTitle}.`,
        "Rappels jour 7 et jour 12 déjà envoyés. Un suivi manuel avec l'entreprise est requis.",
        "",
        "AssumerAI — escalade interne"
      ].join("\n")
    };
  }

  return {
    subject: `SLA breached: no verdict from ${input.companyName} (${input.roleTitle})`,
    text: [
      `Match ${input.matchId} passed its verdict deadline of ${dueDate}.`,
      `Company: ${input.companyName} — Role: ${input.roleTitle}.`,
      "Day-7 and day-12 reminders were already sent. Manual follow-up with the company is required.",
      "",
      "AssumerAI — internal escalation"
    ].join("\n")
  };
}

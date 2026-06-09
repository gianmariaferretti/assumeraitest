"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

import {
  buildCandidateOnboardingView,
  type CandidateOnboardingStep,
  type CandidateOnboardingView
} from "@/features/candidate-flow/onboarding-state";
import {
  resolveCandidateInterviewLanguageCode,
  type CandidateInterviewLanguageCode
} from "@/features/interview-flow";

import {
  buildCandidateDashboardView,
  buildCandidateOnboardingStateFromDashboard,
  candidateEntryDashboardSeed,
  updateCandidateMatchDecision,
  type CandidateDashboardMatch,
  type CandidateDashboardView,
  type CandidateDashboardSeed
} from "./candidate-dashboard-model";

type CandidateDashboardProps = {
  language?: CandidateInterviewLanguageCode;
  seed?: CandidateDashboardSeed;
};

const candidateDashboardCopy = {
  en: {
    workspace: "Candidate workspace",
    progressAria: "Candidate journey progress",
    nextStep: "Next step",
    continue: "Continue",
    safeguardsAria: "Candidate safeguards",
    complete: "complete",
    actionsAria: "Candidate actions",
    dataControls: "Data controls",
    scoreSummaryAria: "Candidate score summary",
    companyMatches: "Company matches",
    decisionQueue: "Your decision queue",
    emptyMatchesTitle:
      "Matches unlock after profile confirmation and interview review.",
    emptyMatchesBody:
      "Until then, employers cannot view a CV, scorecard, transcript, or profile.",
    control: "Control",
    privacyBoundary: "Privacy boundary",
    matchShared: "match shared with an employer after explicit consent.",
    matchCard: {
      confidence: "confidence",
      whyMatched: "Why matched",
      evidence: "Evidence",
      gaps: "Gaps",
      sharingPreview: "Sharing preview",
      sharedDataAria: "Data shared after acceptance",
      notShared: "Not shared:",
      accepted: "Accepted by candidate",
      declined: "Declined by candidate",
      waiting: "Waiting for candidate",
      audit: "Audit",
      consent: "Consent",
      employerBlind: "Employer remains blind",
      accept: "Accept",
      decline: "Decline",
      tokens: {}
    },
    text: {}
  },
  it: {
    workspace: "Area candidato",
    progressAria: "Avanzamento percorso candidato",
    nextStep: "Prossimo passo",
    continue: "Continua",
    safeguardsAria: "Tutele candidato",
    complete: "completo",
    actionsAria: "Azioni candidato",
    dataControls: "Controlli dati",
    scoreSummaryAria: "Riepilogo punteggio candidato",
    companyMatches: "Match aziendali",
    decisionQueue: "Coda decisioni",
    emptyMatchesTitle:
      "I match si sbloccano dopo conferma profilo e revisione colloquio.",
    emptyMatchesBody:
      "Fino ad allora, i datori non possono vedere CV, scorecard, trascrizione o profilo.",
    control: "Controllo",
    privacyBoundary: "Limite privacy",
    matchShared: "match condiviso con un datore dopo consenso esplicito.",
    matchCard: {
      confidence: "confidenza",
      whyMatched: "Perche il match",
      evidence: "Evidenza",
      gaps: "Gap",
      sharingPreview: "Anteprima condivisione",
      sharedDataAria: "Dati condivisi dopo accettazione",
      notShared: "Non condiviso:",
      accepted: "Accettato dal candidato",
      declined: "Rifiutato dal candidato",
      waiting: "In attesa del candidato",
      audit: "Audit",
      consent: "Consenso",
      employerBlind: "Il datore resta senza accesso",
      accept: "Accetta",
      decline: "Rifiuta",
      tokens: {
        parsed_profile: "Profilo estratto",
        resume_scorecard: "Scorecard CV",
        interview_scorecard: "Scorecard colloquio",
        interview_transcript: "Trascrizione colloquio",
        match_explanation: "Spiegazione match",
        raw_cv: "CV grezzo",
        raw_interview_media: "Media grezzi colloquio",
        protected_attribute_inferences: "Inferenze su attributi protetti"
      }
    },
    text: {
      Candidate: "Candidato",
      "Start with one candidate-owned path from CV upload to matches":
        "Inizia con un percorso controllato dal candidato, dal caricamento CV ai match",
      "Ready for candidate-approved matches":
        "Pronto per match approvati dal candidato",
      "Profile confirmed, interview in progress":
        "Profilo confermato, colloquio in corso",
      "Start with CV upload and profile confirmation":
        "Inizia con caricamento CV e conferma profilo",
      "Profile review needed": "Revisione profilo richiesta",
      Resume: "CV",
      Locked: "Bloccato",
      "Upload and confirm profile before scoring":
        "Carica e conferma il profilo prima dello scoring",
      Interview: "Colloquio",
      Pending: "In attesa",
      "Awaiting first completed session": "In attesa della prima sessione completata",
      "Employer visible": "Visibile al datore",
      "Only accepted matches with consent": "Solo match accettati con consenso",
      "Raw CV delete after": "Eliminazione CV grezzo dopo",
      "Pending upload": "Caricamento in attesa",
      "Raw media retention": "Conservazione media grezzi",
      "Data export": "Export dati",
      "Deletion request": "Richiesta eliminazione",
      Requested: "Richiesto",
      Available: "Disponibile",
      "Only this company and role after acceptance":
        "Solo questa azienda e questo ruolo dopo accettazione",
      "Employer visibility and human review":
        "Visibilita datore e revisione umana",
      "Purpose and privacy": "Finalita e privacy",
      "Read the Privacy Policy and Terms of Service before resume upload.":
        "Leggi Privacy Policy e Termini di servizio prima del caricamento CV.",
      "Upload CV": "Carica CV",
      "Upload a resume that stays candidate-owned with raw CV retention.":
        "Carica un CV che resta controllato dal candidato con conservazione limitata del file grezzo.",
      "Confirm profile": "Conferma profilo",
      "Correct parsed profile data and consent to processing before scoring.":
        "Correggi i dati estratti e acconsenti al trattamento prima dello scoring.",
      Prepare: "Preparazione",
      "Review interview modules and scoring boundaries before starting.":
        "Rivedi moduli colloquio e limiti di scoring prima di iniziare.",
      "Complete or resume the text interview used for evidence review.":
        "Completa o riprendi il colloquio testuale usato per la revisione delle evidenze.",
      "Review explanations": "Rivedi spiegazioni",
      "Review score evidence, confidence, missing data, and challenge paths.":
        "Rivedi evidenze score, confidenza, dati mancanti e percorsi di contestazione.",
      "Match consent": "Consenso match",
      "Accept or decline company matches before employers can see anything.":
        "Accetta o rifiuta i match aziendali prima che i datori possano vedere qualcosa.",
      "Resume interview": "Riprendi colloquio",
      "Review purpose and privacy": "Rivedi finalita e privacy",
      "Confirm parsed profile": "Conferma profilo estratto",
      "Prepare for interview": "Preparati al colloquio",
      "Start interview": "Inizia colloquio",
      "Review score explanations": "Rivedi spiegazioni score",
      "Review company matches": "Rivedi match aziendali",
      "No employer can view this candidate until a company match is accepted with consent.":
        "Nessun datore puo vedere questo candidato finche un match aziendale non viene accettato con consenso.",
      "Employer access stays denied until candidate match acceptance records consent.":
        "L'accesso datore resta negato finche l'accettazione del match registra il consenso.",
      "Low confidence means manual review is needed, not a negative candidate signal.":
        "Bassa confidenza significa revisione manuale necessaria, non segnale candidato negativo.",
      "Scoring stays locked until profile confirmation and processing consent are both recorded.":
        "Lo scoring resta bloccato finche conferma profilo e consenso al trattamento sono registrati.",
      "Score explanations stay locked until the candidate completes the interview.":
        "Le spiegazioni score restano bloccate finche il candidato completa il colloquio.",
      "Company matches stay candidate-only until score explanations are reviewed.":
        "I match aziendali restano solo candidato finche le spiegazioni score sono riviste.",
      "Risk analysis evidence matches the calibrated role bar":
        "Le evidenze di analisi rischio corrispondono alla soglia calibrata del ruolo",
      "English communication is above the role threshold":
        "La comunicazione in inglese supera la soglia del ruolo",
      "SQL and client scenario evidence are present":
        "Sono presenti evidenze SQL e scenario cliente",
      "Resume: audit internship with measurable process improvement":
        "CV: tirocinio audit con miglioramento processo misurabile",
      "Interview evidence is attached only after supported transcript review":
        "L'evidenza colloquio viene allegata solo dopo revisione della trascrizione supportata",
      "Language communication evidence is attached only after supported transcript review":
        "L'evidenza comunicativa linguistica viene allegata solo dopo revisione della trascrizione supportata",
      "More evidence needed for production Python work":
        "Servono piu evidenze sul lavoro Python in produzione",
      "German and English preference fit is promising":
        "Il fit sulle preferenze tedesco e inglese e' promettente",
      "Customer-facing examples support outbound learning potential":
        "Gli esempi a contatto cliente supportano potenziale di apprendimento outbound",
      "Resume: customer support project with measured response improvement":
        "CV: progetto customer support con miglioramento misurato dei tempi di risposta",
      "Needs stronger evidence for pipeline discipline":
        "Servono evidenze piu forti sulla disciplina di pipeline"
    }
  },
  fr: {
    workspace: "Espace candidat",
    progressAria: "Progression du parcours candidat",
    nextStep: "Prochaine etape",
    continue: "Continuer",
    safeguardsAria: "Garanties candidat",
    complete: "termine",
    actionsAria: "Actions candidat",
    dataControls: "Controles des donnees",
    scoreSummaryAria: "Resume du score candidat",
    companyMatches: "Matches entreprise",
    decisionQueue: "File de decision",
    emptyMatchesTitle:
      "Les matches se debloquent apres confirmation du profil et revue d'entretien.",
    emptyMatchesBody:
      "Jusque-la, les employeurs ne peuvent pas voir CV, scorecard, transcription ou profil.",
    control: "Controle",
    privacyBoundary: "Limite de confidentialite",
    matchShared: "match partage avec un employeur apres consentement explicite.",
    matchCard: {
      confidence: "confiance",
      whyMatched: "Pourquoi ce match",
      evidence: "Preuves",
      gaps: "Ecarts",
      sharingPreview: "Apercu du partage",
      sharedDataAria: "Donnees partagees apres acceptation",
      notShared: "Non partage:",
      accepted: "Accepte par le candidat",
      declined: "Refuse par le candidat",
      waiting: "En attente du candidat",
      audit: "Audit",
      consent: "Consentement",
      employerBlind: "L'employeur reste sans acces",
      accept: "Accepter",
      decline: "Refuser",
      tokens: {
        parsed_profile: "Profil extrait",
        resume_scorecard: "Scorecard CV",
        interview_scorecard: "Scorecard entretien",
        interview_transcript: "Transcription d'entretien",
        match_explanation: "Explication du match",
        raw_cv: "CV brut",
        raw_interview_media: "Medias bruts d'entretien",
        protected_attribute_inferences: "Inferences d'attributs proteges"
      }
    },
    text: {
      Candidate: "Candidat",
      "Start with one candidate-owned path from CV upload to matches":
        "Commencez par un parcours controle par le candidat, du CV aux matches",
      "Ready for candidate-approved matches":
        "Pret pour les matches approuves par le candidat",
      "Profile confirmed, interview in progress": "Profil confirme, entretien en cours",
      "Start with CV upload and profile confirmation":
        "Commencez par l'import du CV et la confirmation du profil",
      "Profile review needed": "Revue du profil requise",
      Resume: "CV",
      Locked: "Bloque",
      "Upload and confirm profile before scoring":
        "Importez et confirmez le profil avant le scoring",
      Interview: "Entretien",
      Pending: "En attente",
      "Awaiting first completed session": "En attente de la premiere session terminee",
      "Employer visible": "Visible employeur",
      "Only accepted matches with consent": "Seulement les matches acceptes avec consentement",
      "Raw CV delete after": "Suppression du CV brut apres",
      "Pending upload": "Import en attente",
      "Raw media retention": "Conservation des medias bruts",
      "Data export": "Export des donnees",
      "Deletion request": "Demande de suppression",
      Requested: "Demande",
      Available: "Disponible",
      "Only this company and role after acceptance":
        "Seulement cette entreprise et ce role apres acceptation",
      "Employer visibility and human review":
        "Visibilite employeur et revue humaine",
      "Purpose and privacy": "Finalite et confidentialite",
      "Read the Privacy Policy and Terms of Service before resume upload.":
        "Lisez la politique de confidentialite et les conditions avant l'import du CV.",
      "Upload CV": "Importer CV",
      "Upload a resume that stays candidate-owned with raw CV retention.":
        "Importez un CV qui reste controle par le candidat avec retention limitee du fichier brut.",
      "Confirm profile": "Confirmer le profil",
      "Correct parsed profile data and consent to processing before scoring.":
        "Corrigez les donnees extraites et consentez au traitement avant scoring.",
      Prepare: "Preparation",
      "Review interview modules and scoring boundaries before starting.":
        "Revoyez les modules d'entretien et les limites de scoring avant de commencer.",
      "Complete or resume the text interview used for evidence review.":
        "Terminez ou reprenez l'entretien texte utilise pour la revue des preuves.",
      "Review explanations": "Revoir les explications",
      "Review score evidence, confidence, missing data, and challenge paths.":
        "Revoyez preuves du score, confiance, donnees manquantes et voies de contestation.",
      "Match consent": "Consentement match",
      "Accept or decline company matches before employers can see anything.":
        "Acceptez ou refusez les matches entreprise avant toute visibilite employeur.",
      "Resume interview": "Reprendre l'entretien",
      "Review purpose and privacy": "Revoir finalite et confidentialite",
      "Confirm parsed profile": "Confirmer le profil extrait",
      "Prepare for interview": "Se preparer a l'entretien",
      "Start interview": "Demarrer l'entretien",
      "Review score explanations": "Revoir les explications du score",
      "Review company matches": "Revoir les matches entreprise",
      "No employer can view this candidate until a company match is accepted with consent.":
        "Aucun employeur ne peut voir ce candidat avant acceptation consentie d'un match entreprise.",
      "Employer access stays denied until candidate match acceptance records consent.":
        "L'acces employeur reste refuse jusqu'a l'enregistrement du consentement au match.",
      "Low confidence means manual review is needed, not a negative candidate signal.":
        "Faible confiance signifie revue manuelle necessaire, pas signal candidat negatif.",
      "Scoring stays locked until profile confirmation and processing consent are both recorded.":
        "Le scoring reste bloque jusqu'a confirmation du profil et consentement au traitement.",
      "Score explanations stay locked until the candidate completes the interview.":
        "Les explications de score restent bloquees jusqu'a la fin de l'entretien.",
      "Company matches stay candidate-only until score explanations are reviewed.":
        "Les matches entreprise restent cote candidat jusqu'a revue des explications du score.",
      "Risk analysis evidence matches the calibrated role bar":
        "Les preuves d'analyse des risques correspondent au seuil calibre du role",
      "English communication is above the role threshold":
        "La communication en anglais depasse le seuil du role",
      "SQL and client scenario evidence are present":
        "Des preuves SQL et de scenario client sont presentes",
      "Resume: audit internship with measurable process improvement":
        "CV: stage audit avec amelioration de processus mesurable",
      "Interview evidence is attached only after supported transcript review":
        "Les preuves d'entretien sont jointes seulement apres revue de transcription supportee",
      "Language communication evidence is attached only after supported transcript review":
        "Les preuves de communication linguistique sont jointes seulement apres revue de transcription supportee",
      "More evidence needed for production Python work":
        "Davantage de preuves sont necessaires pour le travail Python en production",
      "German and English preference fit is promising":
        "L'adequation des preferences allemand et anglais est prometteuse",
      "Customer-facing examples support outbound learning potential":
        "Les exemples face client soutiennent un potentiel d'apprentissage outbound",
      "Resume: customer support project with measured response improvement":
        "CV: projet support client avec amelioration mesuree du temps de reponse",
      "Needs stronger evidence for pipeline discipline":
        "Des preuves plus solides sont necessaires pour la discipline de pipeline"
    }
  }
} satisfies Record<
  CandidateInterviewLanguageCode,
  {
    readonly workspace: string;
    readonly progressAria: string;
    readonly nextStep: string;
    readonly continue: string;
    readonly safeguardsAria: string;
    readonly complete: string;
    readonly actionsAria: string;
    readonly dataControls: string;
    readonly scoreSummaryAria: string;
    readonly companyMatches: string;
    readonly decisionQueue: string;
    readonly emptyMatchesTitle: string;
    readonly emptyMatchesBody: string;
    readonly control: string;
    readonly privacyBoundary: string;
    readonly matchShared: string;
    readonly matchCard: {
      readonly confidence: string;
      readonly whyMatched: string;
      readonly evidence: string;
      readonly gaps: string;
      readonly sharingPreview: string;
      readonly sharedDataAria: string;
      readonly notShared: string;
      readonly accepted: string;
      readonly declined: string;
      readonly waiting: string;
      readonly audit: string;
      readonly consent: string;
      readonly employerBlind: string;
      readonly accept: string;
      readonly decline: string;
      readonly tokens: Record<string, string>;
    };
    readonly text: Record<string, string>;
  }
>;

type CandidateDashboardCopy =
  (typeof candidateDashboardCopy)[CandidateInterviewLanguageCode];

export function CandidateDashboard({
  language,
  seed = candidateEntryDashboardSeed
}: CandidateDashboardProps) {
  const [matches, setMatches] = useState(seed.matches);
  const [pendingDecisionMatchId, setPendingDecisionMatchId] = useState<string | null>(null);
  const [decisionError, setDecisionError] = useState<{
    readonly matchId: string;
    readonly message: string;
  } | null>(null);
  const dashboardSeed = useMemo(() => ({ ...seed, matches }), [matches, seed]);
  const activeLanguage = resolveCandidateInterviewLanguageCode(language);
  const copy = candidateDashboardCopy[activeLanguage];
  const view = useMemo(
    () =>
      localizeCandidateDashboardView(
        buildCandidateDashboardView(dashboardSeed),
        activeLanguage
      ),
    [activeLanguage, dashboardSeed]
  );
  const onboardingView = useMemo(
    () =>
      localizeCandidateOnboardingView(
        buildCandidateOnboardingView(
          buildCandidateOnboardingStateFromDashboard(dashboardSeed)
        ),
        activeLanguage
      ),
    [activeLanguage, dashboardSeed]
  );

  async function decideDashboardMatch(
    match: CandidateDashboardMatch,
    decision: "accepted" | "declined"
  ) {
    setPendingDecisionMatchId(match.matchId);
    setDecisionError(null);

    try {
      const persistedDecision = await persistCandidateDashboardMatchDecision(match, decision);
      setMatches((current) =>
        updateCandidateMatchDecision(
          current,
          match.matchId,
          decision,
          persistedDecision.decision.consentRecordId ?? undefined,
          {
            auditEventId: persistedDecision.decision.auditEventId,
            decidedAt: persistedDecision.decision.decidedAt,
            sharingSnapshotId: persistedDecision.decision.sharingSnapshotId ?? undefined
          }
        )
      );
    } catch (error) {
      setDecisionError({
        matchId: match.matchId,
        message:
          error instanceof Error
            ? error.message
            : "Decision could not be recorded. Nothing was shared."
      });
    } finally {
      setPendingDecisionMatchId(null);
    }
  }

  function acceptMatch(match: CandidateDashboardMatch) {
    void decideDashboardMatch(match, "accepted");
  }

  function declineMatch(match: CandidateDashboardMatch) {
    void decideDashboardMatch(match, "declined");
  }

  return (
    <main className="candidate-dashboard">
      <DashboardStyles />

      <section className="candidate-band" aria-labelledby="candidate-title">
        <div className="candidate-heading">
          <p>{copy.workspace}</p>
          <h1 id="candidate-title">{view.candidateName}</h1>
          <span>{view.headline}</span>
        </div>
        <div className="readiness-panel">
          <strong>{view.readinessLabel}</strong>
          <span>{onboardingView.privacyBoundary}</span>
        </div>
      </section>

      <section className="onboarding-shell" aria-label={copy.progressAria}>
        <div className="next-step-panel">
          <p>{copy.nextStep}</p>
          <h2>{onboardingView.nextAction.label}</h2>
          <span>{onboardingView.nextAction.detail}</span>
          <Link href={onboardingView.nextAction.href}>{copy.continue}</Link>
        </div>

        <ol className="progress-list">
          {onboardingView.steps.map((step) => (
            <ProgressStep key={step.id} step={step} />
          ))}
        </ol>

        <div className="guardrail-panel" aria-label={copy.safeguardsAria}>
          <strong>
            {onboardingView.progressPercent}% {copy.complete}
          </strong>
          <ul>
            {onboardingView.guardrails.map((guardrail) => (
              <li key={guardrail}>{guardrail}</li>
            ))}
          </ul>
        </div>
      </section>

      <section className="candidate-actions" aria-label={copy.actionsAria}>
        {onboardingView.steps
          .filter((step) => step.status !== "locked")
          .map((step) => (
            <Link href={step.href} key={step.id}>
              {step.label}
            </Link>
          ))}
        <Link href="/candidate/data">{copy.dataControls}</Link>
      </section>

      <section
        className="score-strip"
        id="scorecard"
        aria-label={copy.scoreSummaryAria}
      >
        {view.scoreTiles.map((tile) => (
          <div className="score-tile" key={tile.label}>
            <span>{tile.label}</span>
            <strong>{tile.value}</strong>
            <small>{tile.detail}</small>
          </div>
        ))}
      </section>

      <section className="candidate-grid">
        <section className="match-pane" id="matches" aria-labelledby="matches-title">
          <div className="section-heading">
            <p>{copy.companyMatches}</p>
            <h2 id="matches-title">{copy.decisionQueue}</h2>
          </div>
          <div className="match-stack">
            {view.matches.length > 0 ? (
              view.matches.map((match) => (
                <MatchCard
                  key={match.matchId}
                  copy={copy.matchCard}
                  match={match}
                  onAccept={acceptMatch}
                  onDecline={declineMatch}
                  pending={pendingDecisionMatchId === match.matchId}
                  errorMessage={
                    decisionError?.matchId === match.matchId
                      ? decisionError.message
                      : undefined
                  }
                />
              ))
            ) : (
              <div className="empty-match-state">
                <strong>{copy.emptyMatchesTitle}</strong>
                <span>{copy.emptyMatchesBody}</span>
              </div>
            )}
          </div>
        </section>

        <aside
          className="privacy-pane"
          id="data-controls"
          aria-labelledby="privacy-title"
        >
          <div className="section-heading">
            <p>{copy.control}</p>
            <h2 id="privacy-title">{copy.privacyBoundary}</h2>
          </div>
          <div className="privacy-list">
            {view.privacySummary.map((item) => (
              <div className="privacy-row" key={item.label}>
                <span>{item.label}</span>
                <strong>{item.value}</strong>
              </div>
            ))}
          </div>
          <div className="visibility-note">
            <strong>{view.employerVisibleMatchIds.length}</strong>
            <span>{copy.matchShared}</span>
          </div>
        </aside>
      </section>
    </main>
  );
}

function ProgressStep({ step }: { step: CandidateOnboardingStep }) {
  return (
    <li className={`progress-step progress-${step.status}`}>
      <span className="progress-marker" aria-hidden="true" />
      <div>
        <strong>{step.label}</strong>
        <span>{step.description}</span>
      </div>
    </li>
  );
}

function MatchCard({
  copy,
  match,
  onAccept,
  onDecline,
  pending,
  errorMessage
}: {
  copy: CandidateDashboardCopy["matchCard"];
  match: CandidateDashboardMatch;
  onAccept: (match: CandidateDashboardMatch) => void;
  onDecline: (match: CandidateDashboardMatch) => void;
  pending: boolean;
  errorMessage?: string;
}) {
  const isAccepted = match.status === "accepted";
  const isDeclined = match.status === "declined";

  return (
    <article className="match-card">
      <header className="match-head">
        <div>
          <p>{match.companyName}</p>
          <h3>{match.roleTitle}</h3>
        </div>
        <div className="match-score-badge">
          <strong>{match.matchScore}</strong>
          <span>
            {match.confidence}% {copy.confidence}
          </span>
        </div>
      </header>

      <div className="match-columns">
        <SignalList title={copy.whyMatched} values={match.reasons} />
        <SignalList title={copy.evidence} values={match.evidence} />
        <SignalList title={copy.gaps} values={match.gaps} />
      </div>

      <div className="sharing-preview">
        <div>
          <strong>{copy.sharingPreview}</strong>
          <p>
            {match.sharingPreview.purpose}. {match.sharingPreview.sharedWith}.
          </p>
        </div>
        <div className="sharing-tags" aria-label={copy.sharedDataAria}>
          {match.sharingPreview.dataCategories.map((category) => (
            <span key={category}>{formatToken(category, copy.tokens)}</span>
          ))}
        </div>
        <small>
          {copy.notShared}{" "}
          {match.sharingPreview.excludedCategories
            .map((category) => formatToken(category, copy.tokens))
            .join(", ")}
          .
        </small>
      </div>

      <footer className="match-footer">
        <div className="decision-state">
          <span className={`decision-pill decision-${match.status}`}>
            {isAccepted
              ? copy.accepted
              : isDeclined
                ? copy.declined
                : copy.waiting}
          </span>
          {match.candidateDecision ? (
            <small>
              {copy.audit} {match.candidateDecision.auditEventId}
              {match.candidateDecision.consentRecordId
                ? ` - ${copy.consent} ${match.candidateDecision.consentRecordId}`
                : ` - ${copy.employerBlind}`}
            </small>
          ) : null}
        </div>
        <div className="decision-actions">
          <button
            disabled={isAccepted || pending}
            onClick={() => onAccept(match)}
            type="button"
          >
            {copy.accept}
          </button>
          <button
            disabled={isDeclined || pending}
            onClick={() => onDecline(match)}
            type="button"
          >
            {copy.decline}
          </button>
        </div>
        {errorMessage ? <small className="decision-error">{errorMessage}</small> : null}
      </footer>
    </article>
  );
}

async function persistCandidateDashboardMatchDecision(
  match: CandidateDashboardMatch,
  decision: "accepted" | "declined"
): Promise<CandidateDashboardMatchDecisionPersistence> {
  const response = await fetch("/candidate/matches/decision", {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      matchId: match.matchId,
      companyId: match.companyId,
      roleId: match.roleId,
      decision
    })
  });
  const payload = (await response.json().catch(() => null)) as
    | CandidateDashboardMatchDecisionPersistence
    | {
        readonly error?: { readonly message?: string };
      }
    | null;

  if (!response.ok || !payload || !("decision" in payload)) {
    const errorMessage =
      payload && "error" in payload ? payload.error?.message : undefined;
    throw new Error(
      errorMessage ?? "Decision could not be recorded. Nothing was shared."
    );
  }

  return payload;
}

type CandidateDashboardMatchDecisionPersistence = {
  readonly decision: {
    readonly matchId: string;
    readonly decision: "accepted" | "declined";
    readonly companyId: string;
    readonly roleId: string;
    readonly consentRecordId: string | null;
    readonly sharingSnapshotId: string | null;
    readonly decidedAt: string;
    readonly auditEventId: string;
  };
};

function formatToken(value: string, tokens: Record<string, string>): string {
  return tokens[value] ?? value
    .split("_")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function SignalList({
  title,
  values
}: {
  title: string;
  values: readonly string[];
}) {
  return (
    <div className="signal-list">
      <strong>{title}</strong>
      <ul>
        {values.map((value) => (
          <li key={value}>{value}</li>
        ))}
      </ul>
    </div>
  );
}

function localizeCandidateDashboardView(
  view: CandidateDashboardView,
  language: CandidateInterviewLanguageCode
): CandidateDashboardView {
  const copy = candidateDashboardCopy[language];
  if (language === "en") {
    return view;
  }

  return {
    ...view,
    candidateName: localizeDashboardText(view.candidateName, copy),
    headline: localizeDashboardText(view.headline, copy),
    readinessLabel: localizeDashboardText(view.readinessLabel, copy),
    scoreTiles: view.scoreTiles.map((tile) => ({
      label: localizeDashboardText(tile.label, copy),
      value: localizeDashboardText(tile.value, copy),
      detail: localizeDashboardText(localizeMetricDetail(tile.detail, copy), copy)
    })),
    privacySummary: view.privacySummary.map((item) => ({
      label: localizeDashboardText(item.label, copy),
      value: localizeDashboardText(localizeMetricDetail(item.value, copy), copy)
    })),
    matches: view.matches.map((match) => ({
      ...match,
      sharingPreview: {
        ...match.sharingPreview,
        sharedWith: localizeDashboardText(match.sharingPreview.sharedWith, copy),
        purpose: localizeDashboardText(match.sharingPreview.purpose, copy)
      },
      reasons: match.reasons.map((reason) => localizeDashboardText(reason, copy)),
      evidence: match.evidence.map((item) => localizeDashboardText(item, copy)),
      gaps: match.gaps.map((gap) => localizeDashboardText(gap, copy))
    }))
  };
}

function localizeCandidateOnboardingView(
  view: CandidateOnboardingView,
  language: CandidateInterviewLanguageCode
): CandidateOnboardingView {
  const copy = candidateDashboardCopy[language];
  if (language === "en") {
    return view;
  }

  return {
    ...view,
    steps: view.steps.map((step) => ({
      ...step,
      label: localizeDashboardText(step.label, copy),
      description: localizeDashboardText(step.description, copy)
    })),
    currentStep: {
      ...view.currentStep,
      label: localizeDashboardText(view.currentStep.label, copy),
      description: localizeDashboardText(view.currentStep.description, copy)
    },
    nextAction: {
      ...view.nextAction,
      label: localizeDashboardText(view.nextAction.label, copy),
      detail: localizeDashboardText(view.nextAction.detail, copy)
    },
    privacyBoundary: localizeDashboardText(view.privacyBoundary, copy),
    guardrails: view.guardrails.map((guardrail) =>
      localizeDashboardText(guardrail, copy)
    )
  };
}

function localizeMetricDetail(
  value: string,
  copy: CandidateDashboardCopy
): string {
  const profileExtractionConfidence = value.match(/^(\d+)% profile extraction confidence$/);
  if (profileExtractionConfidence) {
    return copy === candidateDashboardCopy.it
      ? `${profileExtractionConfidence[1]}% confidenza estrazione profilo`
      : copy === candidateDashboardCopy.fr
        ? `${profileExtractionConfidence[1]}% confiance extraction profil`
        : value;
  }

  const confidence = value.match(/^(\d+)% confidence$/);
  if (confidence) {
    return copy === candidateDashboardCopy.it
      ? `${confidence[1]}% confidenza`
      : copy === candidateDashboardCopy.fr
        ? `${confidence[1]}% confiance`
        : value;
  }

  const retention = value.match(/^(\d+) hours after scoring$/);
  if (retention) {
    return copy === candidateDashboardCopy.it
      ? `${retention[1]} ore dopo lo scoring`
      : copy === candidateDashboardCopy.fr
        ? `${retention[1]} heures apres scoring`
        : value;
  }

  return value;
}

function localizeDashboardText(value: string, copy: CandidateDashboardCopy): string {
  const translations = copy.text as Record<string, string>;
  return translations[value] ?? value;
}

function DashboardStyles() {
  return (
    <style
      dangerouslySetInnerHTML={{
        __html: `
.candidate-dashboard {
  background: #ffffff;
  color: #111c19;
  min-height: 100dvh;
  padding: clamp(20px, 4vw, 44px);
}

.candidate-band {
  align-items: end;
  border-bottom: 1px solid rgba(23, 33, 31, 0.16);
  display: grid;
  gap: 24px;
  grid-template-columns: minmax(0, 1fr) minmax(260px, 360px);
  margin: 0 auto;
  max-width: 1180px;
  padding: 34px 0 26px;
}

.candidate-heading {
  display: grid;
  gap: 10px;
}

.candidate-heading p,
.section-heading p {
  color: #111c19;
  font-size: 0.78rem;
  font-weight: 800;
  letter-spacing: 0;
  margin: 0;
  text-transform: uppercase;
}

.candidate-heading h1 {
  font-size: clamp(2.4rem, 8vw, 5.4rem);
  line-height: 0.94;
  margin: 0;
}

.candidate-heading span {
  color: #5d6965;
  font-size: 1.05rem;
}

.readiness-panel,
.next-step-panel,
.guardrail-panel,
.privacy-pane,
.score-tile,
.match-card,
.empty-match-state {
  background: #ffffff;
  border: 1px solid rgba(23, 33, 31, 0.14);
  border-radius: 8px;
}

.readiness-panel {
  display: grid;
  gap: 8px;
  padding: 18px;
}

.readiness-panel strong {
  color: #111c19;
  font-size: 1.05rem;
}

.readiness-panel span,
.score-tile small,
.privacy-row span,
.visibility-note span {
  color: #5d6965;
  line-height: 1.45;
}

.onboarding-shell {
  display: grid;
  gap: 14px;
  grid-template-columns: minmax(240px, 320px) minmax(0, 1fr) minmax(260px, 340px);
  margin: 22px auto 0;
  max-width: 1180px;
}

.next-step-panel,
.guardrail-panel {
  display: grid;
  gap: 12px;
  padding: 16px;
}

.next-step-panel p {
  color: #111c19;
  font-size: 0.78rem;
  font-weight: 800;
  margin: 0;
  text-transform: uppercase;
}

.next-step-panel h2 {
  font-size: 1.45rem;
  line-height: 1.12;
  margin: 0;
}

.next-step-panel span,
.guardrail-panel li,
.progress-step span {
  color: #5d6965;
  line-height: 1.42;
}

.next-step-panel a {
  background: #111c19;
  border-radius: 8px;
  color: #ffffff;
  font-weight: 800;
  padding: 10px 12px;
  width: fit-content;
}

.progress-list {
  display: grid;
  gap: 10px;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  list-style: none;
  margin: 0;
  padding: 0;
}

.progress-step {
  align-items: start;
  background: rgba(255, 255, 255, 0.68);
  border: 1px solid rgba(23, 33, 31, 0.12);
  border-radius: 8px;
  display: grid;
  gap: 10px;
  grid-template-columns: 20px minmax(0, 1fr);
  min-height: 112px;
  padding: 12px;
}

.progress-step strong {
  display: block;
  margin-bottom: 4px;
}

.progress-marker {
  border: 2px solid rgba(23, 33, 31, 0.24);
  border-radius: 999px;
  height: 18px;
  margin-top: 2px;
  width: 18px;
}

.progress-complete .progress-marker {
  background: #111c19;
  border-color: #111c19;
}

.progress-current {
  background: #f5f7f2;
  border-color: rgba(17, 28, 25, 0.2);
}

.progress-current .progress-marker {
  background: #f5f7f2;
  border-color: #111c19;
}

.progress-locked {
  opacity: 0.66;
}

.guardrail-panel strong {
  color: #111c19;
  font-size: 1.25rem;
}

.guardrail-panel ul {
  display: grid;
  gap: 8px;
  margin: 0;
  padding-left: 18px;
}

.candidate-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  margin: 22px auto 0;
  max-width: 1180px;
}

.candidate-actions a,
.decision-actions button {
  background: #111c19;
  border: 1px solid #111c19;
  border-radius: 8px;
  color: #ffffff;
  cursor: pointer;
  font-weight: 800;
  padding: 10px 12px;
}

.candidate-actions a:nth-child(2) {
  background: #111c19;
  border-color: #111c19;
}

.candidate-actions a:nth-child(n + 3),
.decision-actions button:nth-child(2) {
  background: transparent;
  color: #111c19;
}

.score-strip {
  display: grid;
  gap: 12px;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  margin: 18px auto 0;
  max-width: 1180px;
}

.score-tile {
  display: grid;
  gap: 8px;
  padding: 16px;
}

.score-tile span {
  color: #5d6965;
  font-size: 0.82rem;
  font-weight: 800;
  text-transform: uppercase;
}

.score-tile strong {
  font-size: 2rem;
}

.candidate-grid {
  align-items: start;
  display: grid;
  gap: 18px;
  grid-template-columns: minmax(0, 1fr) minmax(280px, 360px);
  margin: 18px auto 0;
  max-width: 1180px;
}

.section-heading {
  display: grid;
  gap: 6px;
  margin-bottom: 12px;
}

.section-heading h2 {
  font-size: 1.4rem;
  margin: 0;
}

.match-stack {
  display: grid;
  gap: 14px;
}

.match-card {
  display: grid;
  gap: 18px;
  padding: 18px;
}

.empty-match-state {
  display: grid;
  gap: 8px;
  padding: 18px;
}

.empty-match-state span {
  color: #5d6965;
  line-height: 1.45;
}

.match-head,
.match-footer {
  align-items: center;
  display: flex;
  gap: 16px;
  justify-content: space-between;
}

.match-head p {
  color: #5d6965;
  font-size: 0.9rem;
  margin: 0 0 4px;
}

.match-head h3 {
  font-size: 1.35rem;
  margin: 0;
}

.match-score-badge {
  background: #f5f7f2;
  border-radius: 8px;
  color: #111c19;
  display: grid;
  min-width: 112px;
  padding: 12px;
  text-align: center;
}

.match-score-badge strong {
  font-size: 2rem;
  line-height: 1;
}

.match-score-badge span {
  font-size: 0.8rem;
  font-weight: 800;
}

.match-columns {
  display: grid;
  gap: 12px;
  grid-template-columns: repeat(3, minmax(0, 1fr));
}

.signal-list {
  background: rgba(17, 28, 25, 0.05);
  border-radius: 8px;
  padding: 12px;
}

.signal-list strong {
  display: block;
  margin-bottom: 8px;
}

.signal-list ul {
  display: grid;
  gap: 7px;
  margin: 0;
  padding-left: 18px;
}

.signal-list li {
  color: #364640;
  line-height: 1.38;
}

.sharing-preview {
  background: rgba(23, 33, 31, 0.05);
  border: 1px solid rgba(23, 33, 31, 0.1);
  border-radius: 8px;
  display: grid;
  gap: 10px;
  padding: 12px;
}

.sharing-preview p {
  color: #5d6965;
  line-height: 1.42;
  margin: 4px 0 0;
}

.sharing-preview small,
.decision-state small {
  color: #5d6965;
  line-height: 1.4;
}

.decision-error {
  color: #9c2f27;
  font-weight: 800;
}

.sharing-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 7px;
}

.sharing-tags span {
  background: #ffffff;
  border: 1px solid rgba(23, 33, 31, 0.12);
  border-radius: 999px;
  color: #111c19;
  font-size: 0.78rem;
  font-weight: 800;
  padding: 6px 8px;
}

.decision-state {
  display: grid;
  gap: 6px;
}

.decision-pill {
  border-radius: 999px;
  font-size: 0.84rem;
  font-weight: 800;
  padding: 8px 10px;
}

.decision-awaiting_candidate {
  background: #fbf8ee;
}

.decision-accepted {
  background: #f5f7f2;
}

.decision-declined {
  background: #e2ded5;
}

.decision-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.decision-actions button:disabled {
  cursor: not-allowed;
  opacity: 0.48;
}

.privacy-pane {
  display: grid;
  gap: 14px;
  padding: 18px;
}

.privacy-list {
  display: grid;
  gap: 10px;
}

.privacy-row {
  border-top: 1px solid rgba(23, 33, 31, 0.12);
  display: grid;
  gap: 4px;
  padding-top: 10px;
}

.visibility-note {
  background: #111c19;
  border-radius: 8px;
  color: #ffffff;
  display: grid;
  gap: 6px;
  padding: 14px;
}

.visibility-note strong {
  color: #f5f7f2;
  font-size: 2.2rem;
}

.visibility-note span {
  color: #ffffff;
}

@media (max-width: 940px) {
  .candidate-band,
  .candidate-grid,
  .match-columns,
  .onboarding-shell,
  .progress-list,
  .score-strip {
    grid-template-columns: 1fr;
  }

  .match-head,
  .match-footer {
    align-items: flex-start;
    flex-direction: column;
  }
}
`
      }}
    />
  );
}

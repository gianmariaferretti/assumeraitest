import type {
  FollowUpRule,
  InterviewArcStage,
  InterviewQuestion,
  ModuleId,
  RoleFamily,
  TurnScoringMode
} from "./types";

/**
 * Canonical question bank for the realistic interview arc (Phase 11).
 *
 * One platform interview, many matches: the interviewer is a neutral
 * AssumerAI career interviewer, so every entry is employer-neutral by
 * construction (no "our company", no "this role at X" — enforced by
 * platform-neutrality patterns and a lint test). The LLM planner may lightly
 * personalize these with CV context; the deterministic fallback uses the
 * canonical phrasing verbatim.
 */

export type CanonicalLanguage = "en" | "it" | "fr" | "de" | "es";

export const CANONICAL_LANGUAGES: readonly CanonicalLanguage[] = ["en", "it", "fr", "de", "es"];

export type CanonicalSeniorityBand = "junior" | "experienced";

export interface CanonicalQuestionEntry {
  readonly id: string;
  readonly stage: InterviewArcStage;
  readonly scoringMode: TurnScoringMode;
  readonly moduleId: ModuleId;
  /** Restrict to role families; omit for the generic variant. */
  readonly roleFamilies?: readonly RoleFamily[];
  /** Restrict to a seniority band; omit when the item applies to everyone. */
  readonly seniorities?: readonly CanonicalSeniorityBand[];
  readonly prompts: Readonly<Record<CanonicalLanguage, string>>;
  readonly rubric: readonly string[];
  readonly expectedSignals: readonly string[];
  readonly evidenceRequirements: readonly string[];
  readonly timeTargetSeconds: number;
}

const DEFAULT_FOLLOW_UP_RULES: readonly FollowUpRule[] = [
  { reason: "clarify_evidence", trigger: "answer is ambiguous or lacks a concrete example" },
  { reason: "increase_confidence", trigger: "answer is too thin to support a confident human review" }
];

const COMMON_DISALLOWED_SIGNALS: readonly string[] = [
  "Protected characteristics",
  "Chronological age",
  "Family status",
  "Health or disability status",
  "Religion, ethnicity, nationality, or similar traits",
  "Accent, facial expression, emotion, biometric, or personality scoring"
];

export const CANONICAL_QUESTION_BANK: readonly CanonicalQuestionEntry[] = [
  {
    id: "canonical_opening",
    stage: "opening",
    scoringMode: "baseline_only",
    moduleId: "motivation",
    timeTargetSeconds: 120,
    prompts: {
      en: "Tell me about yourself — walk me through your background and what you're looking for in your next role.",
      it: "Mi parli di lei — il suo percorso e cosa cerca nel suo prossimo ruolo.",
      fr: "Parlez-moi de vous — votre parcours et ce que vous recherchez dans votre prochain poste.",
      de: "Erzählen Sie mir von sich — Ihr Werdegang und was Sie in Ihrer nächsten Rolle suchen.",
      es: "Hábleme de usted — su trayectoria y lo que busca en su próximo puesto."
    },
    rubric: ["Warm-up only: calibrates a communication baseline, never a competency score."],
    expectedSignals: ["Coherent narrative of background and direction"],
    evidenceRequirements: ["candidate-stated background summary"]
  },
  {
    id: "canonical_motivation_sales",
    stage: "motivation",
    scoringMode: "low_weight",
    moduleId: "motivation",
    roleFamilies: ["sales"],
    timeTargetSeconds: 90,
    prompts: {
      en: "Why sales? What draws you to this kind of work?",
      it: "Perché le vendite? Cosa la attira di questo tipo di lavoro?",
      fr: "Pourquoi la vente ? Qu'est-ce qui vous attire dans ce type de travail ?",
      de: "Warum Vertrieb? Was reizt Sie an dieser Art von Arbeit?",
      es: "¿Por qué ventas? ¿Qué le atrae de este tipo de trabajo?"
    },
    rubric: ["Role-family motivation grounded in real experiences or evidence."],
    expectedSignals: ["Specific, role-family-grounded motivation"],
    evidenceRequirements: ["motivation evidence tied to the role family"]
  },
  {
    id: "canonical_motivation_generic",
    stage: "motivation",
    scoringMode: "low_weight",
    moduleId: "motivation",
    timeTargetSeconds: 90,
    prompts: {
      // Also recorded as input for the drivers module (Phase 14).
      en: "What matters most to you in your next job?",
      it: "Cosa conta di più per lei nel suo prossimo lavoro?",
      fr: "Qu'est-ce qui compte le plus pour vous dans votre prochain emploi ?",
      de: "Was ist Ihnen in Ihrem nächsten Job am wichtigsten?",
      es: "¿Qué es lo más importante para usted en su próximo trabajo?"
    },
    rubric: ["Role-family motivation grounded in real experiences or evidence."],
    expectedSignals: ["Specific, self-aware priorities for the next job"],
    evidenceRequirements: ["candidate-stated priorities for the next job"]
  },
  {
    id: "canonical_self_awareness",
    stage: "self_awareness",
    scoringMode: "low_weight",
    moduleId: "motivation",
    timeTargetSeconds: 90,
    prompts: {
      en: "What are your main strengths for this kind of role?",
      it: "Quali sono i suoi principali punti di forza per questo tipo di ruolo?",
      fr: "Quels sont vos principaux atouts pour ce type de poste ?",
      de: "Was sind Ihre größten Stärken für diese Art von Rolle?",
      es: "¿Cuáles son sus principales fortalezas para este tipo de puesto?"
    },
    rubric: ["On-ramp question: the STAR probe that follows carries the score."],
    expectedSignals: ["Self-aware, role-relevant strengths"],
    evidenceRequirements: ["candidate-claimed strengths to be probed with STAR"]
  },
  {
    id: "canonical_self_awareness_probe",
    stage: "self_awareness",
    scoringMode: "full",
    moduleId: "motivation",
    timeTargetSeconds: 120,
    prompts: {
      en: "Give me a concrete example where that strength made a difference — the situation, what you did, and the result.",
      it: "Mi faccia un esempio concreto in cui quel punto di forza ha fatto la differenza — la situazione, cosa ha fatto lei e il risultato.",
      fr: "Donnez-moi un exemple concret où cet atout a fait la différence — la situation, ce que vous avez fait et le résultat.",
      de: "Geben Sie mir ein konkretes Beispiel, bei dem diese Stärke den Unterschied gemacht hat — die Situation, was Sie getan haben und das Ergebnis.",
      es: "Deme un ejemplo concreto en el que esa fortaleza marcó la diferencia — la situación, lo que hizo usted y el resultado."
    },
    rubric: ["STAR evidence for a claimed strength: situation, task, action, measurable result."],
    expectedSignals: ["Concrete STAR example backing the claimed strength"],
    evidenceRequirements: ["STAR evidence for the claimed strength"]
  },
  {
    id: "canonical_failure_sales",
    stage: "behavioral_core",
    scoringMode: "full",
    moduleId: "domain",
    roleFamilies: ["sales"],
    timeTargetSeconds: 120,
    prompts: {
      en: "Tell me about a time you failed or faced repeated rejection — what happened, and what did you learn?",
      it: "Mi racconti una volta in cui ha fallito o ha affrontato rifiuti ripetuti — cosa è successo e cosa ha imparato?",
      fr: "Parlez-moi d'une fois où vous avez échoué ou essuyé des refus répétés — que s'est-il passé et qu'avez-vous appris ?",
      de: "Erzählen Sie mir von einer Situation, in der Sie gescheitert sind oder wiederholt Absagen erhalten haben — was ist passiert und was haben Sie gelernt?",
      es: "Cuénteme una vez en la que fracasó o enfrentó rechazos repetidos — ¿qué pasó y qué aprendió?"
    },
    rubric: ["Honest failure account with ownership and a concrete lesson applied afterwards."],
    expectedSignals: ["Ownership of the failure", "Lesson applied in later work"],
    evidenceRequirements: ["STAR evidence of a failure or rejection and the learning applied"]
  },
  {
    id: "canonical_behavioral_experienced",
    stage: "behavioral_core",
    scoringMode: "full",
    moduleId: "domain",
    seniorities: ["experienced"],
    timeTargetSeconds: 150,
    prompts: {
      en: "Tell me about the most complex piece of work you have owned end-to-end — walk me through it from start to finish.",
      it: "Mi racconti il lavoro più complesso che ha gestito dall'inizio alla fine — me lo descriva passo per passo.",
      fr: "Parlez-moi du travail le plus complexe que vous avez piloté de bout en bout — décrivez-le moi étape par étape.",
      de: "Erzählen Sie mir von der komplexesten Arbeit, die Sie von Anfang bis Ende verantwortet haben — Schritt für Schritt.",
      es: "Cuénteme el trabajo más complejo que ha gestionado de principio a fin — descríbamelo paso a paso."
    },
    rubric: ["End-to-end ownership: scope, decisions, obstacles, measurable result."],
    expectedSignals: ["End-to-end ownership with measurable outcome"],
    evidenceRequirements: ["STAR evidence of complex end-to-end ownership"]
  },
  {
    id: "canonical_situational_sales_junior",
    stage: "situational",
    scoringMode: "full",
    moduleId: "case",
    roleFamilies: ["sales"],
    seniorities: ["junior"],
    timeTargetSeconds: 120,
    prompts: {
      // Generic role-family scenario — never branded with a client company.
      en: "A prospect tells you they are already happy with their current provider and asks you to stop calling. Walk me through how you would handle that conversation.",
      it: "Un potenziale cliente le dice che è già soddisfatto del fornitore attuale e le chiede di non chiamare più. Mi descriva come gestirebbe quella conversazione.",
      fr: "Un prospect vous dit qu'il est déjà satisfait de son fournisseur actuel et vous demande d'arrêter d'appeler. Décrivez-moi comment vous géreriez cette conversation.",
      de: "Ein Interessent sagt Ihnen, er sei mit seinem aktuellen Anbieter bereits zufrieden, und bittet Sie, nicht mehr anzurufen. Beschreiben Sie mir, wie Sie dieses Gespräch führen würden.",
      es: "Un cliente potencial le dice que ya está satisfecho con su proveedor actual y le pide que deje de llamar. Descríbame cómo manejaría esa conversación."
    },
    rubric: ["Objection handling: listening, respect for the no, value reframing, clear next step."],
    expectedSignals: ["Structured objection handling without pressure tactics"],
    evidenceRequirements: ["situational judgment on objection handling"]
  },
  {
    id: "canonical_situational_generic_junior",
    stage: "situational",
    scoringMode: "full",
    moduleId: "case",
    seniorities: ["junior"],
    timeTargetSeconds: 120,
    prompts: {
      en: "You receive a task with unclear instructions and a tight deadline, and the person who assigned it is unreachable. Walk me through what you would do.",
      it: "Riceve un compito con istruzioni poco chiare e una scadenza stretta, e chi glielo ha assegnato non è raggiungibile. Mi descriva cosa farebbe.",
      fr: "Vous recevez une tâche avec des instructions floues et un délai serré, et la personne qui vous l'a confiée est injoignable. Décrivez-moi ce que vous feriez.",
      de: "Sie erhalten eine Aufgabe mit unklaren Anweisungen und knapper Frist, und die Person, die sie Ihnen übertragen hat, ist nicht erreichbar. Beschreiben Sie mir, was Sie tun würden.",
      es: "Recibe una tarea con instrucciones poco claras y un plazo ajustado, y la persona que se la asignó no está disponible. Descríbame qué haría."
    },
    rubric: ["Judgment under ambiguity: assumptions made explicit, sensible prioritization, communication."],
    expectedSignals: ["Explicit assumptions and a workable plan under ambiguity"],
    evidenceRequirements: ["situational judgment under ambiguous instructions"]
  },
  {
    // Work-style SJT (Phase 13): descriptive at interview time — there is NO
    // right answer here. The work-style evaluator classifies the style;
    // normative judgment happens per-company at match time. baseline_only:
    // these dilemmas never enter BARS competency scores.
    id: "canonical_workstyle_autonomy_speed",
    stage: "situational",
    scoringMode: "baseline_only",
    moduleId: "case",
    timeTargetSeconds: 120,
    prompts: {
      en: "You spot a small but real problem in something already delivered. The person who could approve a fix is away for two days, and a deadline of yours is today. There is no right answer here — walk me through what you would actually do, and why.",
      it: "Noti un problema piccolo ma reale in qualcosa di già consegnato. La persona che potrebbe approvare la correzione è assente per due giorni e una tua scadenza è oggi. Non c'è una risposta giusta: mi racconti cosa farebbe davvero, e perché.",
      fr: "Vous repérez un problème petit mais réel dans un livrable déjà remis. La personne qui pourrait approuver la correction est absente deux jours, et l'une de vos échéances tombe aujourd'hui. Il n'y a pas de bonne réponse : décrivez-moi ce que vous feriez vraiment, et pourquoi.",
      de: "Sie entdecken ein kleines, aber echtes Problem in etwas bereits Geliefertem. Die Person, die eine Korrektur freigeben könnte, ist zwei Tage abwesend, und eine Ihrer Fristen ist heute. Es gibt keine richtige Antwort — beschreiben Sie mir, was Sie wirklich tun würden, und warum.",
      es: "Detecta un problema pequeño pero real en algo ya entregado. La persona que podría aprobar la corrección está ausente dos días y una de sus fechas límite es hoy. No hay respuesta correcta: cuénteme qué haría realmente, y por qué."
    },
    rubric: ["Descriptive only: classifies work style (autonomy↔escalation, speed↔thoroughness); never a quality score."],
    expectedSignals: ["How the candidate actually balances autonomy, escalation, speed, and thoroughness"],
    evidenceRequirements: ["work-style evidence: described real course of action"]
  },
  {
    id: "canonical_workstyle_collaboration_structure",
    stage: "situational",
    scoringMode: "baseline_only",
    moduleId: "case",
    timeTargetSeconds: 120,
    prompts: {
      en: "You inherit a task with a detailed checklist from whoever did it before you, but you can see a faster way that skips several steps. A colleague offers to split the work with you. Again, no right answer — what would you actually do?",
      it: "Eredita un compito con una checklist dettagliata da chi lo faceva prima di lei, ma vede un modo più rapido che salta diversi passaggi. Un collega si offre di dividere il lavoro. Anche qui nessuna risposta giusta: cosa farebbe davvero?",
      fr: "Vous héritez d'une tâche avec une checklist détaillée laissée par votre prédécesseur, mais vous voyez une méthode plus rapide qui saute plusieurs étapes. Un collègue propose de partager le travail. Là encore, pas de bonne réponse : que feriez-vous vraiment ?",
      de: "Sie übernehmen eine Aufgabe mit einer detaillierten Checkliste Ihres Vorgängers, sehen aber einen schnelleren Weg, der mehrere Schritte überspringt. Eine Kollegin bietet an, die Arbeit zu teilen. Auch hier gibt es keine richtige Antwort — was würden Sie wirklich tun?",
      es: "Hereda una tarea con una checklist detallada de quien la hacía antes, pero ve una forma más rápida que se salta varios pasos. Un colega se ofrece a repartir el trabajo. De nuevo, sin respuesta correcta: ¿qué haría realmente?"
    },
    rubric: ["Descriptive only: classifies work style (individual↔collaboration, structure↔improvisation); never a quality score."],
    expectedSignals: ["How the candidate actually relates to structure, improvisation, and collaboration"],
    evidenceRequirements: ["work-style evidence: described real course of action"]
  },
  {
    id: "canonical_closing_open",
    stage: "closing",
    scoringMode: "baseline_only",
    moduleId: "case",
    timeTargetSeconds: 60,
    prompts: {
      en: "Anything you'd like to add, or anything I didn't ask about that you think matters?",
      it: "C'è qualcosa che vorrebbe aggiungere, o qualcosa che non le ho chiesto e che ritiene importante?",
      fr: "Souhaitez-vous ajouter quelque chose, ou y a-t-il un point que je n'ai pas abordé et qui vous semble important ?",
      de: "Möchten Sie noch etwas ergänzen, oder gibt es etwas, das ich nicht gefragt habe und das Ihnen wichtig erscheint?",
      es: "¿Hay algo que quiera añadir, o algo que no le haya preguntado y que considere importante?"
    },
    rubric: ["Closing courtesy: gives the candidate the floor; never scored."],
    expectedSignals: ["Anything the candidate wants on the record"],
    evidenceRequirements: ["candidate-added context, recorded verbatim"]
  },
  {
    id: "canonical_closing_process",
    stage: "closing",
    scoringMode: "baseline_only",
    moduleId: "case",
    timeTargetSeconds: 60,
    prompts: {
      // Accurate next steps: profile review -> matching with multiple
      // companies -> 14-day verdict promise. Candidate questions are recorded
      // as a light curiosity signal, never a hard score. The realistic job
      // preview happens at match time on the company side, not here.
      en: "From here: your profile is reviewed, then matched with multiple companies, and any company you choose to share it with commits to a verdict within 14 days. Do you have any questions about how the process works?",
      it: "Da qui in poi: il suo profilo viene rivisto, poi abbinato a più aziende, e ogni azienda con cui sceglierà di condividerlo si impegna a darle un verdetto entro 14 giorni. Ha domande su come funziona il processo?",
      fr: "Ensuite : votre profil est relu, puis mis en correspondance avec plusieurs entreprises, et chaque entreprise avec laquelle vous choisirez de le partager s'engage à rendre un verdict sous 14 jours. Avez-vous des questions sur le déroulement du processus ?",
      de: "Wie es weitergeht: Ihr Profil wird geprüft, dann mit mehreren Unternehmen abgeglichen, und jedes Unternehmen, mit dem Sie es teilen, verpflichtet sich zu einer Rückmeldung innerhalb von 14 Tagen. Haben Sie Fragen zum Ablauf?",
      es: "A partir de aquí: su perfil se revisa, luego se empareja con varias empresas, y cada empresa con la que decida compartirlo se compromete a darle un veredicto en 14 días. ¿Tiene preguntas sobre cómo funciona el proceso?"
    },
    rubric: ["Process transparency: candidate questions recorded as a light curiosity signal, never a hard score."],
    expectedSignals: ["Candidate questions about the process (curiosity signal only)"],
    evidenceRequirements: ["candidate questions about the process, recorded verbatim"]
  }
];

/** Map any interview-language code onto the canonical bank languages. */
export function resolveCanonicalLanguage(value: unknown): CanonicalLanguage {
  return value === "it" || value === "fr" || value === "de" || value === "es" ? value : "en";
}

/** Materialize a bank entry as a full InterviewQuestion for a session. */
export function buildCanonicalQuestion(
  entry: CanonicalQuestionEntry,
  language: CanonicalLanguage,
  roleFamily: RoleFamily
): InterviewQuestion {
  return {
    id: entry.id,
    version: "interview-question-v0",
    moduleId: entry.moduleId,
    roleFamily,
    difficulty: "baseline",
    prompt: entry.prompts[language],
    rubric: [...entry.rubric],
    expectedSignals: [...entry.expectedSignals],
    disallowedSignals: [...COMMON_DISALLOWED_SIGNALS],
    evidenceRequirements: [...entry.evidenceRequirements],
    timeTargetSeconds: entry.timeTargetSeconds,
    followUpRules: [...DEFAULT_FOLLOW_UP_RULES],
    arcStage: entry.stage,
    scoringMode: entry.scoringMode
  };
}

/** True when a question id belongs to the canonical bank. */
export function isCanonicalQuestionId(questionId: string): boolean {
  return questionId.startsWith("canonical_");
}

/** True for work-style SJT dilemmas (descriptive items, Phase 13). */
export function isWorkStyleQuestionId(questionId: string): boolean {
  return questionId.startsWith("canonical_workstyle_");
}

/** The work-style SJT dilemmas — always included, in every interview. */
export function workStyleEntries(): CanonicalQuestionEntry[] {
  return CANONICAL_QUESTION_BANK.filter((entry) => isWorkStyleQuestionId(entry.id));
}

export interface CanonicalSelection {
  readonly roleFamily: RoleFamily;
  readonly seniority: CanonicalSeniorityBand | undefined;
  readonly language: CanonicalLanguage;
}

/** Entries applicable to a stage for the given role family + seniority. */
export function canonicalEntriesForStage(
  stage: CanonicalQuestionEntry["stage"],
  selection: Pick<CanonicalSelection, "roleFamily" | "seniority">
): CanonicalQuestionEntry[] {
  // Work-style dilemmas are selected separately (always included) and never
  // participate in the family/generic substitution logic.
  const stageEntries = CANONICAL_QUESTION_BANK.filter(
    (entry) => entry.stage === stage && !isWorkStyleQuestionId(entry.id)
  );
  const familySpecific = stageEntries.filter(
    (entry) =>
      entry.roleFamilies?.includes(selection.roleFamily) &&
      seniorityApplies(entry, selection.seniority)
  );
  const generic = stageEntries.filter(
    (entry) => !entry.roleFamilies && seniorityApplies(entry, selection.seniority)
  );

  // A family-specific variant replaces its generic sibling for the stage
  // when the stage holds a single slot (motivation, situational).
  if (stage === "motivation" || stage === "situational") {
    return familySpecific.length > 0 ? familySpecific : generic;
  }

  return [...familySpecific, ...generic];
}

function seniorityApplies(
  entry: CanonicalQuestionEntry,
  seniority: CanonicalSeniorityBand | undefined
): boolean {
  if (!entry.seniorities || entry.seniorities.length === 0) {
    return true;
  }

  return seniority !== undefined && entry.seniorities.includes(seniority);
}

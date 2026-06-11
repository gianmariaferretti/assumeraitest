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
    // Job-drivers trade-off item (Phase 14): descriptive at interview time —
    // there is NO right answer and no correct set of drivers. The drivers
    // evaluator extracts revealed preferences; at match time they produce
    // flag-only insights and a realistic job preview, never a score.
    id: "canonical_drivers_tradeoff",
    stage: "motivation",
    scoringMode: "baseline_only",
    moduleId: "motivation",
    timeTargetSeconds: 90,
    prompts: {
      en: "Imagine two offers on the table with identical pay: one is a stable, well-defined role where you would go deeper in what you already do best; the other is a new, uncertain initiative with much more freedom and much more risk. There is no right answer — which would you take, and what would you be giving up?",
      it: "Immagini due offerte sul tavolo, a parità di stipendio: una è un ruolo stabile e ben definito in cui approfondire ciò che già sa fare meglio; l'altra è un'iniziativa nuova e incerta, con molta più libertà e molto più rischio. Non c'è una risposta giusta: quale sceglierebbe, e a cosa rinuncerebbe?",
      fr: "Imaginez deux offres sur la table, à salaire identique : l'une est un poste stable et bien défini où approfondir ce que vous faites déjà de mieux ; l'autre est une initiative nouvelle et incertaine, avec beaucoup plus de liberté et beaucoup plus de risque. Il n'y a pas de bonne réponse : laquelle choisiriez-vous, et à quoi renonceriez-vous ?",
      de: "Stellen Sie sich zwei Angebote bei gleichem Gehalt vor: eines ist eine stabile, klar umrissene Rolle, in der Sie das vertiefen, was Sie bereits am besten können; das andere ist ein neues, ungewisses Vorhaben mit viel mehr Freiheit und viel mehr Risiko. Es gibt keine richtige Antwort — welches würden Sie nehmen, und worauf würden Sie verzichten?",
      es: "Imagine dos ofertas sobre la mesa, con el mismo salario: una es un puesto estable y bien definido donde profundizar en lo que ya sabe hacer mejor; la otra es una iniciativa nueva e incierta, con mucha más libertad y mucho más riesgo. No hay respuesta correcta: ¿cuál elegiría y a qué renunciaría?"
    },
    rubric: ["Descriptive only: surfaces career drivers via an explicit trade-off; never a quality score."],
    expectedSignals: ["Which drivers the candidate trades off, and how they reason about the cost"],
    evidenceRequirements: ["driver evidence: explicit trade-off choice and what is given up"]
  },
  {
    id: "canonical_drivers_star",
    stage: "motivation",
    scoringMode: "baseline_only",
    moduleId: "motivation",
    timeTargetSeconds: 120,
    prompts: {
      // Revealed preference: a real past fork, not a stated preference.
      en: "Tell me about a real fork in your path — a time you chose between two jobs, projects, or directions. What did you actually choose, what did you give up, and why?",
      it: "Mi racconti un bivio reale nel suo percorso: una volta in cui ha scelto tra due lavori, progetti o direzioni. Cosa ha scelto davvero, a cosa ha rinunciato, e perché?",
      fr: "Racontez-moi un vrai croisement dans votre parcours : une fois où vous avez choisi entre deux emplois, projets ou directions. Qu'avez-vous réellement choisi, à quoi avez-vous renoncé, et pourquoi ?",
      de: "Erzählen Sie mir von einer echten Weggabelung in Ihrem Werdegang: einem Moment, in dem Sie zwischen zwei Stellen, Projekten oder Richtungen gewählt haben. Was haben Sie tatsächlich gewählt, worauf haben Sie verzichtet, und warum?",
      es: "Cuénteme una bifurcación real en su trayectoria: una vez en que eligió entre dos trabajos, proyectos o direcciones. ¿Qué eligió realmente, a qué renunció y por qué?"
    },
    rubric: ["Descriptive only: revealed career preference from a real past choice; never a quality score."],
    expectedSignals: ["Drivers revealed by a real choice: what was chosen and what was given up"],
    evidenceRequirements: ["driver evidence: real past fork, choice made, and reasoning"]
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
    // Learning agility (Phase 15): a real past learning episode, scored with
    // the dedicated learning_agility BARS competency. Scores the PROCESS of
    // getting up to speed, never prior knowledge.
    id: "canonical_agility_star",
    stage: "behavioral_core",
    scoringMode: "full",
    moduleId: "domain",
    timeTargetSeconds: 150,
    prompts: {
      en: "Tell me about a time you had to get up to speed on something genuinely new to you, fast. How did you go about it, and what did you change along the way as you learned?",
      it: "Mi racconti una volta in cui ha dovuto padroneggiare in fretta qualcosa di davvero nuovo per lei. Come ha proceduto, e cosa ha cambiato strada facendo man mano che imparava?",
      fr: "Parlez-moi d'une fois où vous avez dû monter en compétence rapidement sur quelque chose de vraiment nouveau pour vous. Comment avez-vous procédé, et qu'avez-vous ajusté en cours de route ?",
      de: "Erzählen Sie mir von einer Situation, in der Sie sich schnell in etwas für Sie völlig Neues einarbeiten mussten. Wie sind Sie vorgegangen, und was haben Sie unterwegs angepasst, während Sie dazulernten?",
      es: "Cuénteme una vez en que tuvo que ponerse al día rápidamente con algo realmente nuevo para usted. ¿Cómo lo abordó y qué cambió por el camino a medida que aprendía?"
    },
    rubric: ["Learning process under novelty: strategy chosen, feedback sought, course corrections made. Never scores prior familiarity."],
    expectedSignals: ["Deliberate learning strategy", "Updating on feedback while learning"],
    evidenceRequirements: ["STAR evidence of getting up to speed on something new"]
  },
  {
    // Micro-learning task bank (Phase 15): exactly ONE of the following three
    // is included per interview, selected deterministically (micro-learning.ts).
    // The concept is fully explained in the prompt — no prior knowledge needed,
    // and admitting unfamiliarity never lowers the score.
    id: "canonical_agility_micro_goodhart_measure",
    stage: "behavioral_core",
    scoringMode: "full",
    moduleId: "domain",
    timeTargetSeconds: 150,
    prompts: {
      en: "Here is an idea that may be new to you — you are not expected to know it, everything you need is in this description. When a measure becomes a target, it stops being a good measure: people start optimizing the number itself instead of the goal it was meant to track. In your own words, describe a situation, real or invented, where this could happen, and one way to reduce the risk.",
      it: "Le propongo un'idea forse nuova per lei — non è richiesto conoscerla: tutto ciò che le serve è in questa descrizione. Quando una metrica diventa un obiettivo, smette di essere una buona metrica: le persone iniziano a ottimizzare il numero in sé invece dello scopo che doveva misurare. Con parole sue, mi descriva una situazione, reale o inventata, in cui questo potrebbe accadere, e un modo per ridurre il rischio.",
      fr: "Voici une idée peut-être nouvelle pour vous — vous n'êtes pas censé la connaître : tout ce qu'il vous faut est dans cette description. Quand une mesure devient un objectif, elle cesse d'être une bonne mesure : on se met à optimiser le chiffre lui-même plutôt que le but qu'il devait suivre. Avec vos mots, décrivez-moi une situation, réelle ou inventée, où cela pourrait arriver, et une façon de réduire le risque.",
      de: "Hier ist eine Idee, die für Sie vielleicht neu ist — Sie müssen sie nicht kennen, alles Nötige steht in dieser Beschreibung. Wenn eine Kennzahl zum Ziel wird, hört sie auf, eine gute Kennzahl zu sein: Menschen optimieren dann die Zahl selbst statt des Zwecks, den sie messen sollte. Beschreiben Sie mir in eigenen Worten eine Situation, real oder erfunden, in der das passieren könnte, und eine Möglichkeit, das Risiko zu verringern.",
      es: "Le propongo una idea quizá nueva para usted — no se espera que la conozca: todo lo que necesita está en esta descripción. Cuando una métrica se convierte en objetivo, deja de ser una buena métrica: la gente empieza a optimizar el número en sí en lugar del fin que debía medir. Con sus palabras, descríbame una situación, real o inventada, en la que esto podría ocurrir, y una forma de reducir el riesgo."
    },
    rubric: ["Micro-learning application: engages with the new idea, applies it coherently, surfaces assumptions. Never scores prior familiarity with the concept."],
    expectedSignals: ["Applies a just-learned idea to a concrete case", "Reasoning visible while learning"],
    evidenceRequirements: ["application of the in-prompt concept to a concrete situation"]
  },
  {
    id: "canonical_agility_micro_premortem",
    stage: "behavioral_core",
    scoringMode: "full",
    moduleId: "domain",
    timeTargetSeconds: 150,
    prompts: {
      en: "Here is an idea that may be new to you — you are not expected to know it, everything you need is in this description. A premortem works backwards: before starting a plan, you imagine it has already failed completely and list the most likely reasons why, then strengthen the plan against them. Pick any everyday project — moving house, organizing an event, anything — and walk me through how you would run a premortem on it.",
      it: "Le propongo un'idea forse nuova per lei — non è richiesto conoscerla: tutto ciò che le serve è in questa descrizione. Un premortem funziona al contrario: prima di avviare un piano, si immagina che sia già fallito del tutto e si elencano le cause più probabili, per poi rinforzare il piano contro di esse. Scelga un progetto qualunque della vita quotidiana — un trasloco, l'organizzazione di un evento, qualsiasi cosa — e mi descriva come ci applicherebbe un premortem.",
      fr: "Voici une idée peut-être nouvelle pour vous — vous n'êtes pas censé la connaître : tout ce qu'il vous faut est dans cette description. Un premortem fonctionne à rebours : avant de lancer un plan, on imagine qu'il a déjà complètement échoué et on liste les causes les plus probables, puis on renforce le plan contre elles. Choisissez un projet du quotidien — un déménagement, l'organisation d'un événement, n'importe quoi — et expliquez-moi comment vous y appliqueriez un premortem.",
      de: "Hier ist eine Idee, die für Sie vielleicht neu ist — Sie müssen sie nicht kennen, alles Nötige steht in dieser Beschreibung. Ein Premortem funktioniert rückwärts: Bevor ein Plan startet, stellt man sich vor, er sei bereits vollständig gescheitert, listet die wahrscheinlichsten Gründe auf und stärkt den Plan dann dagegen. Wählen Sie ein beliebiges Alltagsprojekt — einen Umzug, die Organisation einer Feier, irgendetwas — und erklären Sie mir, wie Sie dafür ein Premortem durchführen würden.",
      es: "Le propongo una idea quizá nueva para usted — no se espera que la conozca: todo lo que necesita está en esta descripción. Un premortem funciona al revés: antes de iniciar un plan, se imagina que ya ha fracasado por completo y se enumeran las causas más probables, para luego reforzar el plan contra ellas. Elija cualquier proyecto cotidiano — una mudanza, organizar un evento, lo que sea — y explíqueme cómo le aplicaría un premortem."
    },
    rubric: ["Micro-learning application: engages with the new idea, applies it coherently, surfaces assumptions. Never scores prior familiarity with the concept."],
    expectedSignals: ["Applies a just-learned idea to a concrete case", "Reasoning visible while learning"],
    evidenceRequirements: ["application of the in-prompt concept to a concrete situation"]
  },
  {
    id: "canonical_agility_micro_swiss_cheese",
    stage: "behavioral_core",
    scoringMode: "full",
    moduleId: "domain",
    timeTargetSeconds: 150,
    prompts: {
      en: "Here is an idea that may be new to you — you are not expected to know it, everything you need is in this description. The swiss-cheese model says failures happen when the holes in several imperfect layers of protection happen to line up; no single layer needs to be perfect as long as the holes don't align. Use this idea to explain how you would make an error-prone everyday task safer.",
      it: "Le propongo un'idea forse nuova per lei — non è richiesto conoscerla: tutto ciò che le serve è in questa descrizione. Il modello del formaggio svizzero dice che i guasti accadono quando i buchi di più strati imperfetti di protezione si trovano allineati per caso; nessuno strato deve essere perfetto, purché i buchi non si allineino. Usi questa idea per spiegarmi come renderebbe più sicura un'attività quotidiana soggetta a errori.",
      fr: "Voici une idée peut-être nouvelle pour vous — vous n'êtes pas censé la connaître : tout ce qu'il vous faut est dans cette description. Le modèle du gruyère dit que les défaillances surviennent quand les trous de plusieurs couches de protection imparfaites se retrouvent alignés ; aucune couche n'a besoin d'être parfaite tant que les trous ne s'alignent pas. Utilisez cette idée pour m'expliquer comment vous rendriez plus sûre une tâche quotidienne sujette aux erreurs.",
      de: "Hier ist eine Idee, die für Sie vielleicht neu ist — Sie müssen sie nicht kennen, alles Nötige steht in dieser Beschreibung. Das Schweizer-Käse-Modell besagt, dass Fehler passieren, wenn die Löcher mehrerer unvollkommener Schutzschichten zufällig übereinanderliegen; keine Schicht muss perfekt sein, solange sich die Löcher nicht decken. Nutzen Sie diese Idee, um mir zu erklären, wie Sie eine fehleranfällige Alltagsaufgabe sicherer machen würden.",
      es: "Le propongo una idea quizá nueva para usted — no se espera que la conozca: todo lo que necesita está en esta descripción. El modelo del queso suizo dice que los fallos ocurren cuando los agujeros de varias capas imperfectas de protección se alinean por casualidad; ninguna capa tiene que ser perfecta mientras los agujeros no coincidan. Use esta idea para explicarme cómo haría más segura una tarea cotidiana propensa a errores."
    },
    rubric: ["Micro-learning application: engages with the new idea, applies it coherently, surfaces assumptions. Never scores prior familiarity with the concept."],
    expectedSignals: ["Applies a just-learned idea to a concrete case", "Reasoning visible while learning"],
    evidenceRequirements: ["application of the in-prompt concept to a concrete situation"]
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

/** True for job-driver items (trade-off + revealed-preference STAR, Phase 14). */
export function isDriversQuestionId(questionId: string): boolean {
  return questionId.startsWith("canonical_drivers_");
}

/** The job-driver items — always included, in every interview. */
export function jobDriverEntries(): CanonicalQuestionEntry[] {
  return CANONICAL_QUESTION_BANK.filter((entry) => isDriversQuestionId(entry.id));
}

/** True for learning-agility items (STAR + micro-learning task, Phase 15). */
export function isAgilityQuestionId(questionId: string): boolean {
  return questionId.startsWith("canonical_agility_");
}

/**
 * The learning-agility items: the STAR item plus the full micro-task concept
 * bank. The arc builder includes the STAR item always and exactly ONE
 * micro-task, selected deterministically (micro-learning.ts).
 */
export function agilityEntries(): CanonicalQuestionEntry[] {
  return CANONICAL_QUESTION_BANK.filter((entry) => isAgilityQuestionId(entry.id));
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
  // Work-style dilemmas, job-driver items, and learning-agility items are
  // selected separately (always included, the micro-task deterministically)
  // and never participate in the family/generic substitution logic.
  const stageEntries = CANONICAL_QUESTION_BANK.filter(
    (entry) =>
      entry.stage === stage &&
      !isWorkStyleQuestionId(entry.id) &&
      !isDriversQuestionId(entry.id) &&
      !isAgilityQuestionId(entry.id)
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

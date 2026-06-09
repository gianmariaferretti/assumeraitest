import { containsDisallowedQuestionText } from "./safety";
import {
  resolveCandidateInterviewLanguage,
  type CandidateInterviewLanguageCode,
} from "./interview-language";
import type { FunnelDecision, FunnelState } from "./funnel-state-machine";
import type { BarsCompetency, FunnelPhase } from "../scoring/bars/types";

/**
 * Interviewer Agent — Function 2.
 *
 * This is the only agent the candidate "hears". It produces ONE turn at a time:
 * a single behavioral question or a targeted STAR follow-up, in the candidate's
 * language, in the persona of a calm, experienced recruiter.
 *
 * It does NOT decide where it is in the conversation — the funnel state machine
 * does that and hands it a FunnelDecision. It does NOT score — the evaluator
 * does that. Separation of concerns is what lets this agent be warm (higher
 * temperature) while the evaluator stays consistent (low temperature).
 *
 * Safety: every generated line is checked against the protected-trait filter
 * before it can reach the candidate. A safe deterministic line is used as
 * fallback whenever the API is unavailable or returns unsafe content.
 */

const ANTHROPIC_API_ENDPOINT = "https://api.anthropic.com/v1/messages";
const ANTHROPIC_API_VERSION = "2023-06-01";
const DEFAULT_INTERVIEWER_MODEL = "claude-sonnet-4-20250514";
const DEFAULT_MODEL_FALLBACKS = [
  "claude-3-7-sonnet-20250219",
  "claude-3-5-haiku-20241022",
];
const INTERVIEWER_TEMPERATURE = 0.6;

type FetchLike = (input: string | URL | Request, init?: RequestInit) => Promise<Response>;

export interface InterviewerPersona {
  readonly name: string;
  readonly yearsExperience: number;
  readonly domain: string;
  readonly styleNotes?: readonly string[];
}

export const DEFAULT_PERSONA: InterviewerPersona = {
  name: "Marta",
  yearsExperience: 12,
  domain: "selezione commerciale e tecnica",
  styleNotes: [
    "ascolta più di quanto parla",
    "non mette pressione: se una risposta è generica, riformula con gentilezza",
    "ringrazia e dà piccoli segnali di ascolto tra una domanda e l'altra",
  ],
};

export interface ConversationTurn {
  readonly role: "interviewer" | "candidate";
  readonly text: string;
}

export interface InterviewerTurnInput {
  readonly decision: FunnelDecision;
  readonly state: FunnelState;
  readonly competency: BarsCompetency;
  /** Pre-written primary question to deliver (from the planner). */
  readonly plannedQuestionText?: string;
  /** STAR elements still missing (when decision.kind === ask_follow_up). */
  readonly missingStarSummary?: readonly string[];
  /** A CV anchor used to open the rapport phase ("vedo che hai fatto X..."). */
  readonly cvHook?: string;
  /** Recent conversation for continuity ("come dicevi prima..."). */
  readonly transcript?: readonly ConversationTurn[];
  readonly interviewLanguage?: CandidateInterviewLanguageCode;
  readonly persona?: InterviewerPersona;
  readonly options?: InterviewerAgentOptions;
}

export interface InterviewerAgentOptions {
  readonly apiKey?: string | null;
  readonly endpoint?: string;
  readonly fetchImpl?: FetchLike;
  readonly maxTokens?: number;
  readonly model?: string;
  readonly temperature?: number;
}

export type InterviewerTurnSource = "anthropic" | "deterministic_fallback";

export interface InterviewerTurn {
  readonly text: string;
  readonly phase: FunnelPhase;
  readonly source: InterviewerTurnSource;
  readonly provider_model?: string;
  readonly fallback_reason?: string;
}

interface AnthropicTextBlock {
  readonly type: string;
  readonly text?: string;
}

interface AnthropicMessageResponse {
  readonly content?: readonly AnthropicTextBlock[];
}

class InterviewerSafetyError extends Error {
  constructor() {
    super("interviewer_output_failed_safety_check");
  }
}

export async function generateInterviewerTurn(
  input: InterviewerTurnInput,
): Promise<InterviewerTurn> {
  // The interview is over: produce a clean closing acknowledgement.
  if (input.decision.kind === "complete_interview") {
    return {
      text: deterministicClosing(input),
      phase: "closing",
      source: "deterministic_fallback",
      fallback_reason: "interview_complete",
    };
  }

  const apiKey = input.options?.apiKey ?? process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return deterministicTurn(input, "anthropic_api_key_missing");
  }

  const fetchImpl = input.options?.fetchImpl ?? globalThis.fetch;
  if (!fetchImpl) {
    return deterministicTurn(input, "anthropic_fetch_unavailable");
  }

  const modelCandidates = resolveModelCandidates(
    input.options?.model ??
      process.env.ANTHROPIC_INTERVIEWER_MODEL ??
      process.env.ANTHROPIC_MODEL ??
      DEFAULT_INTERVIEWER_MODEL,
  );

  let lastStatus: number | undefined;

  for (const model of modelCandidates) {
    try {
      const response = await fetchImpl(input.options?.endpoint ?? ANTHROPIC_API_ENDPOINT, {
        method: "POST",
        headers: {
          "anthropic-version": ANTHROPIC_API_VERSION,
          "content-type": "application/json",
          "x-api-key": apiKey,
        },
        body: JSON.stringify({
          model,
          max_tokens: input.options?.maxTokens ?? 400,
          temperature: input.options?.temperature ?? INTERVIEWER_TEMPERATURE,
          system: buildSystemPrompt(input),
          messages: [{ role: "user", content: JSON.stringify(buildUserPayload(input)) }],
        }),
      });

      if (!response.ok) {
        lastStatus = response.status;
        if (response.status === 404 && model !== modelCandidates.at(-1)) {
          continue;
        }
        return deterministicTurn(input, `anthropic_request_failed_${response.status}`);
      }

      const message = (await response.json()) as AnthropicMessageResponse;
      const text = sanitizeTurnText(extractTextContent(message));
      return {
        text,
        phase: input.decision.phase,
        source: "anthropic",
        provider_model: model,
      };
    } catch (error) {
      const reason =
        error instanceof InterviewerSafetyError
          ? "interviewer_output_failed_safety_check"
          : "interviewer_generation_failed";
      return deterministicTurn(input, reason);
    }
  }

  return deterministicTurn(
    input,
    lastStatus ? `anthropic_request_failed_${lastStatus}` : "interviewer_generation_failed",
  );
}

function buildSystemPrompt(input: InterviewerTurnInput): string {
  const persona = input.persona ?? DEFAULT_PERSONA;
  const language = resolveCandidateInterviewLanguage(input.interviewLanguage);

  return [
    `Sei ${persona.name}, recruiter senior con ${persona.yearsExperience} anni di esperienza in ${persona.domain}.`,
    "Conduci un colloquio comportamentale strutturato (SBI), ma con un tono calmo e umano. Non sei un test né un esame: sei una conversazione che ha una struttura interna che il candidato non vede.",
    ...(persona.styleNotes ?? []).map((note) => `Stile: ${note}.`),
    `Scrivi SEMPRE nella lingua del candidato: ${language.questionLanguageName}.`,
    "Regole rigide, da non violare mai:",
    "- Produci UNA SOLA battuta per turno (una domanda o un breve follow-up), niente elenchi di domande.",
    "- Solo domande comportamentali su fatti passati specifici ('parlami di una volta in cui...'), MAI ipotetiche ('cosa faresti se...').",
    "- Mai chiedere o dedurre: età, nazionalità, cittadinanza, stato civile o familiare, salute o disabilità, religione, etnia, genere, gravidanza, personalità, emozioni, dati biometrici, volto, tono di voce, accento o status di madrelingua.",
    "- Non valutare e non dare punteggi: il tuo compito è solo condurre la conversazione e raccogliere esempi concreti.",
    "- Mantieni la battuta breve (max 2-3 frasi). Se è un follow-up, mira esattamente all'elemento mancante che ti viene indicato.",
    "Rispondi con il SOLO testo della battuta da dire al candidato, senza virgolette, senza preamboli, senza meta-commento.",
  ].join(" ");
}

function buildUserPayload(input: InterviewerTurnInput): Record<string, unknown> {
  const phaseGuidance: Record<FunnelPhase, string> = {
    rapport:
      "Fase di apertura. Metti a suo agio il candidato e aggancia un dettaglio concreto del suo CV. Poi introduci dolcemente il tema della competenza.",
    exploration:
      "Fase di esplorazione. Fai una domanda comportamentale mirata che inviti a raccontare un esempio passato specifico legato alla competenza.",
    challenge:
      "Fase di sfida. Approfondisci con una domanda più difficile, sempre su un fatto passato, che metta alla prova la profondità dell'esempio.",
    closing:
      "Fase di chiusura. Chiedi la motivazione del candidato per il ruolo e invitalo a fare le sue domande.",
  };

  return {
    task: "generate_single_interviewer_turn",
    funnel_phase: input.decision.phase,
    phase_guidance: phaseGuidance[input.decision.phase],
    decision_kind: input.decision.kind,
    competency: { id: input.competency.id, name: input.competency.name },
    planned_question: input.plannedQuestionText ?? null,
    follow_up: {
      is_follow_up: input.decision.kind === "ask_follow_up",
      missing_star_elements: input.missingStarSummary ?? input.decision.missingStarElements ?? [],
    },
    cv_hook: input.decision.phase === "rapport" ? (input.cvHook ?? null) : null,
    recent_transcript: (input.transcript ?? []).slice(-6).map((turn) => ({
      role: turn.role,
      text: turn.text,
    })),
    instruction:
      "Genera la prossima singola battuta dell'intervistatore coerente con la fase e il tipo di decisione. Se è un follow-up, mira solo all'elemento STAR mancante. Restituisci solo il testo.",
  };
}

/* ------------------------------------------------------------------ *
 * Deterministic fallback turns (always safe, never block the interview)
 * ------------------------------------------------------------------ */

function deterministicTurn(
  input: InterviewerTurnInput,
  fallbackReason: string,
): InterviewerTurn {
  const text = sanitizeTurnText(buildDeterministicText(input));
  return {
    text,
    phase: input.decision.phase,
    source: "deterministic_fallback",
    fallback_reason: fallbackReason,
  };
}

function buildDeterministicText(input: InterviewerTurnInput): string {
  if (input.decision.kind === "ask_follow_up") {
    const missing = input.missingStarSummary ?? input.decision.missingStarElements ?? [];
    return followUpForMissing(missing[0]);
  }

  switch (input.decision.phase) {
    case "rapport":
      return input.cvHook
        ? `Grazie per il tempo. Vedo dal tuo percorso ${input.cvHook}: partiamo proprio da lì, mi racconti com'è andata?`
        : "Grazie per il tempo. Per cominciare, raccontami brevemente di un'esperienza recente di cui vai fiero.";
    case "exploration":
      return (
        input.plannedQuestionText ??
        `Parlami di una volta in cui hai dovuto mettere in pratica ${input.competency.name.toLowerCase()}. Cosa è successo nello specifico?`
      );
    case "challenge":
      return (
        input.plannedQuestionText ??
        "Raccontami una situazione simile ma più difficile: cosa ha reso quel caso particolarmente complicato e cosa hai fatto?"
      );
    case "closing":
      return "Per chiudere: cosa ti attira di questo ruolo, e c'è qualcosa che vorresti chiedere tu a noi?";
    default:
      return "Raccontami un esempio concreto e recente legato a questo tema.";
  }
}

function followUpForMissing(missing: string | undefined): string {
  switch (missing) {
    case "situation":
      return "Aiutami a inquadrare meglio: quando è successo e in che contesto?";
    case "task":
      return "Di cosa eri responsabile tu, in particolare, in quella situazione?";
    case "action":
      return "Cosa hai fatto tu personalmente, passo dopo passo?";
    case "result":
      return "Com'è andata a finire? C'è un risultato che puoi quantificare?";
    default:
      return "Puoi farmi un esempio più concreto di quel momento?";
  }
}

function deterministicClosing(input: InterviewerTurnInput): string {
  const persona = input.persona ?? DEFAULT_PERSONA;
  return `Grazie davvero per la conversazione. Hai dato esempi molto concreti. ${persona.name} chiude qui il colloquio: riceverai un riepilogo trasparente del tuo profilo.`;
}

/* ------------------------------------------------------------------ *
 * Safety + parsing
 * ------------------------------------------------------------------ */

function sanitizeTurnText(text: string): string {
  const cleaned = text.replace(/^["'\s]+|["'\s]+$/g, "").trim();
  if (!cleaned) {
    throw new InterviewerSafetyError();
  }
  if (containsDisallowedQuestionText(cleaned)) {
    throw new InterviewerSafetyError();
  }
  return cleaned;
}

function extractTextContent(message: AnthropicMessageResponse): string {
  const text = message.content
    ?.filter((block) => block.type === "text" && typeof block.text === "string")
    .map((block) => block.text)
    .join("\n")
    .trim();
  if (!text) {
    throw new Error("Interviewer response did not contain text.");
  }
  return text;
}

function resolveModelCandidates(primaryModel: string): string[] {
  return unique([
    primaryModel,
    ...parseModelList(process.env.ANTHROPIC_INTERVIEWER_MODEL_FALLBACKS),
    ...parseModelList(process.env.ANTHROPIC_MODEL_FALLBACKS),
    ...DEFAULT_MODEL_FALLBACKS,
  ]);
}

function parseModelList(value: string | undefined): string[] {
  return (
    value
      ?.split(",")
      .map((item) => item.trim())
      .filter(Boolean) ?? []
  );
}

function unique(values: readonly string[]): string[] {
  return [...new Set(values.map((value) => value.trim()).filter(Boolean))];
}

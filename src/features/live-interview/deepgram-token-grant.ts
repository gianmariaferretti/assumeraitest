import { logLlmTelemetry } from "../../lib/log";

export type DeepgramFetch = (input: string, init?: RequestInit) => Promise<Response>;

export interface DeepgramTokenGrantClientOptions {
  readonly apiKey: string;
  readonly baseUrl?: string;
  readonly fetchImpl?: DeepgramFetch;
  readonly ttlSeconds?: number;
}

export interface DeepgramTokenGrantResult {
  readonly provider: "deepgram";
  readonly accessToken: string;
  readonly expiresIn: number;
}

type JsonRecord = Record<string, unknown>;

const DEEPGRAM_API_BASE_URL = "https://api.deepgram.com/v1";
const DEFAULT_TOKEN_TTL_SECONDS = 60;

export class DeepgramTokenGrantError extends Error {
  readonly code: string;
  readonly providerCode: string | null;
  readonly providerMessage: string | null;
  readonly providerRequestId: string | null;
  readonly providerStatus: number;

  constructor({
    code,
    message,
    providerCode,
    providerMessage,
    providerRequestId,
    providerStatus
  }: {
    readonly code: string;
    readonly message: string;
    readonly providerCode: string | null;
    readonly providerMessage: string | null;
    readonly providerRequestId: string | null;
    readonly providerStatus: number;
  }) {
    super(message);
    this.name = "DeepgramTokenGrantError";
    this.code = code;
    this.providerCode = providerCode;
    this.providerMessage = providerMessage;
    this.providerRequestId = providerRequestId;
    this.providerStatus = providerStatus;
  }
}

export function createDeepgramTokenGrantClient(options: DeepgramTokenGrantClientOptions) {
  const apiKey = options.apiKey.trim();
  if (!apiKey) {
    throw new Error("DEEPGRAM_KEY is required for live interview transcription.");
  }

  const baseUrl = options.baseUrl ?? DEEPGRAM_API_BASE_URL;
  const fetchImpl = options.fetchImpl ?? fetch;
  const ttlSeconds = options.ttlSeconds ?? DEFAULT_TOKEN_TTL_SECONDS;

  if (!Number.isInteger(ttlSeconds) || ttlSeconds < 1 || ttlSeconds > 3600) {
    throw new Error("Deepgram token TTL must be an integer from 1 to 3600 seconds.");
  }

  return {
    async grantToken(): Promise<DeepgramTokenGrantResult> {
      const startedAt = Date.now();
      const response = await fetchImpl(buildDeepgramApiUrl(baseUrl, "auth/grant"), {
        body: JSON.stringify({ ttl_seconds: ttlSeconds }),
        headers: {
          Authorization: `Token ${apiKey}`,
          "Content-Type": "application/json"
        },
        method: "POST"
      });

      if (!response.ok) {
        logLlmTelemetry({
          site: "deepgram_token_grant",
          provider: "deepgram",
          model: "auth/grant",
          latencyMs: Date.now() - startedAt,
          outcome: "error",
          fallbackReason: `deepgram_request_failed_${response.status}`
        });
        throw await createDeepgramGrantError(response);
      }

      logLlmTelemetry({
        site: "deepgram_token_grant",
        provider: "deepgram",
        model: "auth/grant",
        latencyMs: Date.now() - startedAt,
        outcome: "ok"
      });

      const payload: unknown = await response.json();
      if (!isJsonRecord(payload)) {
        throw new Error("Deepgram returned an invalid token response.");
      }

      const accessToken = readNonEmptyString(payload.access_token);
      if (!accessToken) {
        throw new Error("Deepgram did not return a usable token.");
      }

      return {
        provider: "deepgram",
        accessToken,
        expiresIn: readPositiveNumber(payload.expires_in) ?? ttlSeconds
      };
    }
  };
}

async function createDeepgramGrantError(response: Response): Promise<DeepgramTokenGrantError> {
  const payload = await readJsonResponseBody(response);
  const providerCode = readNonEmptyString(payload?.err_code);
  const providerMessage =
    readNonEmptyString(payload?.err_msg) ?? response.headers.get("dg-error");
  const providerRequestId = response.headers.get("dg-request-id");
  const insufficientPermissions =
    response.status === 403 && /insufficient permissions/i.test(providerMessage ?? "");

  return new DeepgramTokenGrantError({
    code: insufficientPermissions
      ? "deepgram_key_insufficient_permissions"
      : "deepgram_token_grant_failed",
    message: insufficientPermissions
      ? "Deepgram key cannot mint browser live-transcription tokens. Create a Deepgram API key with Member permissions and set it as DEEPGRAM_KEY."
      : "Could not create a Deepgram live transcription token.",
    providerCode,
    providerMessage,
    providerRequestId,
    providerStatus: response.status
  });
}

async function readJsonResponseBody(response: Response): Promise<JsonRecord | null> {
  try {
    const payload: unknown = await response.json();
    return isJsonRecord(payload) ? payload : null;
  } catch {
    return null;
  }
}

function buildDeepgramApiUrl(baseUrl: string, path: string): string {
  return new URL(path, `${baseUrl.replace(/\/+$/u, "")}/`).toString();
}

function readNonEmptyString(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function readPositiveNumber(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) && value >= 0 ? value : null;
}

function isJsonRecord(value: unknown): value is JsonRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

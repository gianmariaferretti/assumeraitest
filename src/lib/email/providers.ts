import { logWarn } from "../log";
import type { EmailMessage, EmailProvider, EmailSendResult } from "./types";

const RESEND_API_ENDPOINT = "https://api.resend.com/emails";
const DEFAULT_FROM_ADDRESS = "AssumerAI <notifications@assumerai.example>";

type FetchLike = (input: string | URL | Request, init?: RequestInit) => Promise<Response>;

export interface ResendEmailProviderOptions {
  readonly apiKey?: string;
  readonly from?: string;
  readonly endpoint?: string;
  readonly fetchImpl?: FetchLike;
}

/** Resend implementation (https://resend.com), injectable fetch for tests. */
export function createResendEmailProvider(
  options: ResendEmailProviderOptions = {}
): EmailProvider {
  return {
    providerName: "resend",

    async send(message: EmailMessage): Promise<EmailSendResult> {
      const apiKey = options.apiKey ?? process.env.RESEND_API_KEY?.trim();
      if (!apiKey) {
        return { ok: false, error: "RESEND_API_KEY is not configured." };
      }
      const fetchImpl = options.fetchImpl ?? globalThis.fetch;
      if (!fetchImpl) {
        return { ok: false, error: "No fetch implementation is available." };
      }

      try {
        const response = await fetchImpl(options.endpoint ?? RESEND_API_ENDPOINT, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${apiKey}`,
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            from: options.from ?? process.env.EMAIL_FROM?.trim() ?? DEFAULT_FROM_ADDRESS,
            to: [message.to],
            subject: message.subject,
            text: message.text
          })
        });

        if (!response.ok) {
          return { ok: false, error: `resend_request_failed_${response.status}` };
        }

        const payload = (await response.json().catch(() => null)) as { id?: string } | null;
        return { ok: true, id: payload?.id };
      } catch (error) {
        return {
          ok: false,
          error: error instanceof Error ? error.message : "resend_request_failed"
        };
      }
    }
  };
}

// ---------------------------------------------------------------------------
// In-memory provider (tests + local dev)
// ---------------------------------------------------------------------------

const inMemorySentMessages: EmailMessage[] = [];

export function createInMemoryEmailProvider(
  sink: EmailMessage[] = inMemorySentMessages
): EmailProvider {
  return {
    providerName: "in_memory",

    async send(message: EmailMessage): Promise<EmailSendResult> {
      sink.push({ ...message });
      return { ok: true, id: `in_memory_${sink.length}` };
    }
  };
}

/** Test/dev helper: inspect what would have been sent. */
export function readInMemorySentEmails(): readonly EmailMessage[] {
  return [...inMemorySentMessages];
}

/** Test helper: reset the shared in-memory outbox. */
export function clearInMemorySentEmails(): void {
  inMemorySentMessages.length = 0;
}

/**
 * Resend in production (RESEND_API_KEY set); otherwise the in-memory provider
 * so local dev and tests never send real mail. A WARN line makes the silent
 * mode visible in production logs if the key is missing there.
 */
export function resolveEmailProvider(): EmailProvider {
  if (process.env.RESEND_API_KEY?.trim()) {
    return createResendEmailProvider();
  }

  if (process.env.NODE_ENV === "production") {
    logWarn("email_provider_unconfigured", {
      detail: "RESEND_API_KEY is unset; notifications are recorded in memory only."
    });
  }

  return createInMemoryEmailProvider();
}

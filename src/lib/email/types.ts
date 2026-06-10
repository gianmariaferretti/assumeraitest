/**
 * Email provider seam. Implementations: Resend (production, RESEND_API_KEY)
 * and an in-memory recorder (tests + local dev). Senders must treat failures
 * as non-fatal: notifications never block the product flow that emitted them.
 */

export interface EmailMessage {
  readonly to: string;
  readonly subject: string;
  readonly text: string;
}

export type EmailSendResult =
  | { readonly ok: true; readonly id?: string }
  | { readonly ok: false; readonly error: string };

export interface EmailProvider {
  readonly providerName: string;
  send(message: EmailMessage): Promise<EmailSendResult>;
}

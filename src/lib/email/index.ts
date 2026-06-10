export type { EmailMessage, EmailProvider, EmailSendResult } from "./types";
export {
  candidateMatchNotificationEmail,
  candidateVerdictNotificationEmail,
  companyReminderEmail,
  resolveEmailTemplateLanguage,
  slaBreachEscalationEmail,
  type CompanyReminderKind,
  type EmailTemplateLanguage,
  type MatchVerdict,
  type RenderedEmail
} from "./templates";
export {
  clearInMemorySentEmails,
  createInMemoryEmailProvider,
  createResendEmailProvider,
  readInMemorySentEmails,
  resolveEmailProvider
} from "./providers";

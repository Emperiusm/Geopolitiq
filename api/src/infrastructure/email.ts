import type { EmailTemplate } from "../types/auth";

interface SentEmail {
  to: string;
  template: EmailTemplate;
  data: Record<string, any>;
  sentAt: Date;
}

export interface EmailService {
  send(to: string, template: EmailTemplate, data: Record<string, any>): Promise<void>;
  getSentEmails(): SentEmail[];
}

function createConsoleEmailService(): EmailService {
  const sent: SentEmail[] = [];

  return {
    async send(to, template, data) {
      const entry: SentEmail = { to, template, data, sentAt: new Date() };
      sent.push(entry);
      console.log(`[email] → ${to} | template=${template} | data=${JSON.stringify(data)}`);
    },
    getSentEmails() {
      return sent;
    },
  };
}

export function createEmailService(): EmailService {
  const provider = process.env.EMAIL_PROVIDER || "console";

  switch (provider) {
    case "console":
      return createConsoleEmailService();
    default:
      console.warn(`[email] Unknown provider "${provider}", falling back to console`);
      return createConsoleEmailService();
  }
}

// Singleton instance
let emailService: EmailService | null = null;

export function getEmailService(): EmailService {
  if (!emailService) {
    emailService = createEmailService();
  }
  return emailService;
}

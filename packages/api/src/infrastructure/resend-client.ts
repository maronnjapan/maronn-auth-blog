import { Resend } from 'resend';

export interface EmailMessage {
  to: string;
  subject: string;
  text: string;
  html?: string;
}

export class ResendClient {
  private resend: Resend;
  private from: string;

  constructor(apiKey: string, from: string) {
    this.resend = new Resend(apiKey);
    this.from = from;
  }

  async sendEmail(message: EmailMessage): Promise<void> {
    const result = await this.resend.emails.send({
      from: this.from,
      to: [message.to],
      subject: message.subject,
      text: message.text,
      ...(message.html ? { html: message.html } : {}),
    });

    if (result.error) {
      console.error(`[ResendClient] Failed to send email: ${result.error.message}`);
      throw new Error(`Failed to send email via Resend: ${result.error.message}`);
    }

    console.info(`[ResendClient] Email sent successfully to ${message.to}`);
  }
}

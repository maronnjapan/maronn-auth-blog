import { Resend } from 'resend';

export interface EmailMessage {
  to: string | string[];
  subject: string;
  text?: string;
  html?: string;
}

export interface EmailService {
  send(message: EmailMessage): Promise<void>;
}

export class ResendEmailService implements EmailService {
  private client: Resend;

  constructor(apiKey: string, private defaultFrom: string) {
    this.client = new Resend(apiKey);
  }

  async send(message: EmailMessage): Promise<void> {
    if (!message.text && !message.html) {
      throw new Error('Email message must include either text or html body');
    }

    await this.client.emails.send({
      from: this.defaultFrom,
      to: message.to,
      subject: message.subject,
      text: message.text,
      html: message.html,
    });
  }
}

export interface EmailMessage {
  to: string;
  subject: string;
  text: string;
  html?: string;
}

export class SendGridClient {
  private apiKey: string;
  private fromEmail: string;
  private fromName: string;

  constructor(apiKey: string, fromEmail: string, fromName: string = 'Auth Vault') {
    this.apiKey = apiKey;
    this.fromEmail = fromEmail;
    this.fromName = fromName;
  }

  async sendEmail(message: EmailMessage): Promise<void> {
    const response = await fetch('https://api.sendgrid.com/v3/mail/send', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        personalizations: [
          {
            to: [{ email: message.to }],
          },
        ],
        from: {
          email: this.fromEmail,
          name: this.fromName,
        },
        subject: message.subject,
        content: [
          {
            type: 'text/plain',
            value: message.text,
          },
          ...(message.html
            ? [
                {
                  type: 'text/html',
                  value: message.html,
                },
              ]
            : []),
        ],
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      console.error(`[SendGridClient] Failed to send email: ${error}`);
      throw new Error(`Failed to send email: ${response.status}`);
    }

    console.info(`[SendGridClient] Email sent successfully to ${message.to}`);
  }
}

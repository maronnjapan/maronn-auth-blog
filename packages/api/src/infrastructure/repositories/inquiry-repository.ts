interface InquiryRow {
  id: string;
  name: string;
  email: string;
  company: string | null;
  inquiry_type: string;
  subject: string;
  message: string;
  status: string;
  created_at: string;
  updated_at: string;
}

export interface Inquiry {
  id: string;
  name: string;
  email: string;
  company?: string;
  inquiryType: string;
  subject: string;
  message: string;
  status: string;
  createdAt: string;
  updatedAt: string;
}

export class InquiryRepository {
  constructor(private db: D1Database) {}

  private rowToInquiry(row: InquiryRow): Inquiry {
    return {
      id: row.id,
      name: row.name,
      email: row.email,
      company: row.company ?? undefined,
      inquiryType: row.inquiry_type,
      subject: row.subject,
      message: row.message,
      status: row.status,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }

  async create(params: {
    name: string;
    email: string;
    company?: string;
    inquiryType: string;
    subject: string;
    message: string;
  }): Promise<Inquiry> {
    const id = crypto.randomUUID();
    const now = new Date().toISOString();

    await this.db
      .prepare(
        `INSERT INTO inquiries (id, name, email, company, inquiry_type, subject, message, status, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, 'new', ?, ?)`
      )
      .bind(
        id,
        params.name,
        params.email,
        params.company ?? null,
        params.inquiryType,
        params.subject,
        params.message,
        now,
        now
      )
      .run();

    return {
      id,
      name: params.name,
      email: params.email,
      company: params.company,
      inquiryType: params.inquiryType,
      subject: params.subject,
      message: params.message,
      status: 'new',
      createdAt: now,
      updatedAt: now,
    };
  }

  async findById(id: string): Promise<Inquiry | null> {
    const result = await this.db
      .prepare('SELECT * FROM inquiries WHERE id = ?')
      .bind(id)
      .first<InquiryRow>();

    return result ? this.rowToInquiry(result) : null;
  }

  async findAll(limit: number = 20, offset: number = 0): Promise<Inquiry[]> {
    const results = await this.db
      .prepare('SELECT * FROM inquiries ORDER BY created_at DESC LIMIT ? OFFSET ?')
      .bind(limit, offset)
      .all<InquiryRow>();

    return results.results.map((row) => this.rowToInquiry(row));
  }

  async countAll(): Promise<number> {
    const result = await this.db
      .prepare('SELECT COUNT(*) as count FROM inquiries')
      .first<{ count: number }>();

    return result?.count ?? 0;
  }

  async countByStatus(status: string): Promise<number> {
    const result = await this.db
      .prepare('SELECT COUNT(*) as count FROM inquiries WHERE status = ?')
      .bind(status)
      .first<{ count: number }>();

    return result?.count ?? 0;
  }

  async updateStatus(id: string, status: string): Promise<void> {
    const now = new Date().toISOString();
    await this.db
      .prepare('UPDATE inquiries SET status = ?, updated_at = ? WHERE id = ?')
      .bind(status, now, id)
      .run();
  }
}

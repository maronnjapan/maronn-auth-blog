interface SeriesRow {
  id: string;
  user_id: string;
  title: string;
  slug: string;
  description: string | null;
  status: 'active' | 'completed' | 'archived';
  sort_order: number;
  created_at: string;
  updated_at: string;
}

interface SeriesArticleRow {
  id: string;
  series_id: string;
  article_id: string;
  order_index: number;
  created_at: string;
}

export interface Series {
  id: string;
  userId: string;
  title: string;
  slug: string;
  description?: string;
  status: 'active' | 'completed' | 'archived';
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

export interface SeriesArticle {
  id: string;
  seriesId: string;
  articleId: string;
  orderIndex: number;
  createdAt: string;
}

export class SeriesRepository {
  constructor(private db: D1Database) {}

  private rowToSeries(row: SeriesRow): Series {
    return {
      id: row.id,
      userId: row.user_id,
      title: row.title,
      slug: row.slug,
      description: row.description ?? undefined,
      status: row.status,
      sortOrder: row.sort_order,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }

  async create(params: {
    userId: string;
    title: string;
    slug: string;
    description?: string;
  }): Promise<Series> {
    const id = crypto.randomUUID();
    const now = new Date().toISOString();

    await this.db
      .prepare(
        `INSERT INTO series (id, user_id, title, slug, description, status, sort_order, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, 'active', 0, ?, ?)`
      )
      .bind(id, params.userId, params.title, params.slug, params.description ?? null, now, now)
      .run();

    return {
      id,
      userId: params.userId,
      title: params.title,
      slug: params.slug,
      description: params.description,
      status: 'active',
      sortOrder: 0,
      createdAt: now,
      updatedAt: now,
    };
  }

  async findById(id: string): Promise<Series | null> {
    const result = await this.db
      .prepare('SELECT * FROM series WHERE id = ?')
      .bind(id)
      .first<SeriesRow>();

    return result ? this.rowToSeries(result) : null;
  }

  async findByUserIdAndSlug(userId: string, slug: string): Promise<Series | null> {
    const result = await this.db
      .prepare('SELECT * FROM series WHERE user_id = ? AND slug = ?')
      .bind(userId, slug)
      .first<SeriesRow>();

    return result ? this.rowToSeries(result) : null;
  }

  async findByUserId(userId: string): Promise<Series[]> {
    const results = await this.db
      .prepare('SELECT * FROM series WHERE user_id = ? ORDER BY sort_order ASC, created_at DESC')
      .bind(userId)
      .all<SeriesRow>();

    return results.results.map((row) => this.rowToSeries(row));
  }

  async update(id: string, params: {
    title?: string;
    description?: string;
    status?: 'active' | 'completed' | 'archived';
  }): Promise<void> {
    const now = new Date().toISOString();
    const sets: string[] = ['updated_at = ?'];
    const values: (string | null)[] = [now];

    if (params.title !== undefined) {
      sets.push('title = ?');
      values.push(params.title);
    }
    if (params.description !== undefined) {
      sets.push('description = ?');
      values.push(params.description);
    }
    if (params.status !== undefined) {
      sets.push('status = ?');
      values.push(params.status);
    }

    values.push(id);

    await this.db
      .prepare(`UPDATE series SET ${sets.join(', ')} WHERE id = ?`)
      .bind(...values)
      .run();
  }

  async delete(id: string): Promise<void> {
    await this.db
      .prepare('DELETE FROM series WHERE id = ?')
      .bind(id)
      .run();
  }

  // Series articles management
  async addArticle(seriesId: string, articleId: string, orderIndex: number): Promise<void> {
    const id = crypto.randomUUID();
    const now = new Date().toISOString();

    await this.db
      .prepare(
        'INSERT INTO series_articles (id, series_id, article_id, order_index, created_at) VALUES (?, ?, ?, ?, ?)'
      )
      .bind(id, seriesId, articleId, orderIndex, now)
      .run();
  }

  async removeArticle(seriesId: string, articleId: string): Promise<void> {
    await this.db
      .prepare('DELETE FROM series_articles WHERE series_id = ? AND article_id = ?')
      .bind(seriesId, articleId)
      .run();
  }

  async updateArticleOrder(seriesId: string, articleId: string, orderIndex: number): Promise<void> {
    await this.db
      .prepare('UPDATE series_articles SET order_index = ? WHERE series_id = ? AND article_id = ?')
      .bind(orderIndex, seriesId, articleId)
      .run();
  }

  async findArticleIds(seriesId: string): Promise<SeriesArticle[]> {
    const results = await this.db
      .prepare(
        'SELECT * FROM series_articles WHERE series_id = ? ORDER BY order_index ASC'
      )
      .bind(seriesId)
      .all<SeriesArticleRow>();

    return results.results.map((row) => ({
      id: row.id,
      seriesId: row.series_id,
      articleId: row.article_id,
      orderIndex: row.order_index,
      createdAt: row.created_at,
    }));
  }

  async findSeriesByArticleId(articleId: string): Promise<Array<{ series: Series; orderIndex: number }>> {
    const results = await this.db
      .prepare(
        `SELECT s.*, sa.order_index FROM series s
         INNER JOIN series_articles sa ON s.id = sa.series_id
         WHERE sa.article_id = ?
         ORDER BY s.created_at DESC`
      )
      .bind(articleId)
      .all<SeriesRow & { order_index: number }>();

    return results.results.map((row) => ({
      series: this.rowToSeries(row),
      orderIndex: row.order_index,
    }));
  }

  async countArticles(seriesId: string): Promise<number> {
    const result = await this.db
      .prepare('SELECT COUNT(*) as count FROM series_articles WHERE series_id = ?')
      .bind(seriesId)
      .first<{ count: number }>();

    return result?.count ?? 0;
  }

  async findAllPublic(limit: number = 20, offset: number = 0): Promise<Series[]> {
    const results = await this.db
      .prepare(
        `SELECT s.* FROM series s
         WHERE s.status IN ('active', 'completed')
         AND EXISTS (
           SELECT 1 FROM series_articles sa
           INNER JOIN articles a ON sa.article_id = a.id
           WHERE sa.series_id = s.id AND a.published_at IS NOT NULL AND a.status != 'deleted'
         )
         ORDER BY s.updated_at DESC LIMIT ? OFFSET ?`
      )
      .bind(limit, offset)
      .all<SeriesRow>();

    return results.results.map((row) => this.rowToSeries(row));
  }
}

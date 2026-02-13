-- Series table for organizing articles into series
CREATE TABLE series (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  slug TEXT NOT NULL,
  description TEXT,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'completed', 'archived')),
  sort_order INTEGER DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(user_id, slug)
);

CREATE INDEX idx_series_user_id ON series(user_id);
CREATE INDEX idx_series_slug ON series(slug);

-- Junction table for series-article relationship with ordering
CREATE TABLE series_articles (
  id TEXT PRIMARY KEY,
  series_id TEXT NOT NULL REFERENCES series(id) ON DELETE CASCADE,
  article_id TEXT NOT NULL REFERENCES articles(id) ON DELETE CASCADE,
  order_index INTEGER NOT NULL DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(series_id, article_id)
);

CREATE INDEX idx_series_articles_series_id ON series_articles(series_id);
CREATE INDEX idx_series_articles_article_id ON series_articles(article_id);

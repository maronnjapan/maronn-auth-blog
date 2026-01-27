-- Article features table for storing admin-provided search summary
CREATE TABLE article_features (
  id TEXT PRIMARY KEY,
  article_id TEXT NOT NULL REFERENCES articles(id) ON DELETE CASCADE,
  summary TEXT NOT NULL DEFAULT '',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(article_id)
);

CREATE INDEX idx_article_features_article_id ON article_features(article_id);

-- Drop old FTS table and recreate with title + summary
DROP TABLE IF EXISTS articles_fts;

CREATE VIRTUAL TABLE articles_fts USING fts5(
  id,
  title,
  summary,
  tokenize='unicode61'
);

-- Re-populate FTS from existing published articles
INSERT INTO articles_fts(id, title, summary)
SELECT id, title, '' FROM articles WHERE status = 'published';

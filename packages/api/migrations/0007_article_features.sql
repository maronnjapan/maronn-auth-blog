-- Article features table for storing search-related extracted features
CREATE TABLE article_features (
  id TEXT PRIMARY KEY,
  article_id TEXT NOT NULL REFERENCES articles(id) ON DELETE CASCADE,
  headings TEXT NOT NULL DEFAULT '',
  body_text TEXT NOT NULL DEFAULT '',
  summary TEXT NOT NULL DEFAULT '',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(article_id)
);

CREATE INDEX idx_article_features_article_id ON article_features(article_id);

-- Drop old FTS table (title only) and recreate with extended columns
DROP TABLE IF EXISTS articles_fts;

CREATE VIRTUAL TABLE articles_fts USING fts5(
  id,
  title,
  headings,
  body_text,
  tokenize='unicode61'
);

-- Re-populate FTS from existing published articles (title only for now; headings/body_text will be populated on next approval)
INSERT INTO articles_fts(id, title, headings, body_text)
SELECT id, title, '', '' FROM articles WHERE status = 'published';

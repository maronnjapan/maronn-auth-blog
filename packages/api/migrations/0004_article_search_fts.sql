-- FTS5 virtual table for article search
CREATE VIRTUAL TABLE articles_fts USING fts5(
  id,
  title,
  tokenize='unicode61'
);

-- Populate existing articles
INSERT INTO articles_fts(id, title)
SELECT id, title FROM articles WHERE status = 'published';

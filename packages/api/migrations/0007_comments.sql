-- Comments table
CREATE TABLE comments (
  id TEXT PRIMARY KEY,
  article_id TEXT NOT NULL REFERENCES articles(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  body_markdown TEXT NOT NULL,
  body_html TEXT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_comments_article_id ON comments(article_id);
CREATE INDEX idx_comments_user_id ON comments(user_id);
CREATE INDEX idx_comments_created_at ON comments(created_at DESC);

-- Comment images table (track images uploaded per comment)
CREATE TABLE comment_images (
  id TEXT PRIMARY KEY,
  comment_id TEXT NOT NULL REFERENCES comments(id) ON DELETE CASCADE,
  filename TEXT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_comment_images_comment_id ON comment_images(comment_id);

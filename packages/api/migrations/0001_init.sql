-- Users table
CREATE TABLE users (
  id TEXT PRIMARY KEY,
  username TEXT UNIQUE NOT NULL,
  display_name TEXT NOT NULL,
  icon_url TEXT,
  bio TEXT,
  github_user_id TEXT NOT NULL,
  github_installation_id TEXT,
  role TEXT DEFAULT 'user' CHECK (role IN ('user', 'admin')),
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_users_username ON users(username);
CREATE INDEX idx_users_github_user_id ON users(github_user_id);

-- Repositories table
CREATE TABLE repositories (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  github_repo_full_name TEXT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(user_id)
);

-- Articles table
CREATE TABLE articles (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  slug TEXT NOT NULL,
  title TEXT NOT NULL,
  category TEXT,
  status TEXT DEFAULT 'pending_new' CHECK (
    status IN ('pending_new', 'pending_update', 'published', 'rejected', 'deleted')
  ),
  github_path TEXT NOT NULL,
  github_sha TEXT,
  published_sha TEXT,
  rejection_reason TEXT,
  published_at DATETIME,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(user_id, slug)
);

CREATE INDEX idx_articles_user_id ON articles(user_id);
CREATE INDEX idx_articles_status ON articles(status);
CREATE INDEX idx_articles_published_at ON articles(published_at DESC);

-- Article tags table
CREATE TABLE article_tags (
  id TEXT PRIMARY KEY,
  article_id TEXT NOT NULL REFERENCES articles(id) ON DELETE CASCADE,
  tag TEXT NOT NULL,
  UNIQUE(article_id, tag)
);

CREATE INDEX idx_article_tags_tag ON article_tags(tag);

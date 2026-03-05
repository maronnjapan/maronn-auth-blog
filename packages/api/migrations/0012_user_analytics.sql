-- Add analytics fields to users table
ALTER TABLE users ADD COLUMN google_analytics_id TEXT;
ALTER TABLE users ADD COLUMN cf_web_analytics_token TEXT;

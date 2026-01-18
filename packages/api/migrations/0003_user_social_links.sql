-- Add social links columns to users table
ALTER TABLE users ADD COLUMN github_url TEXT;
ALTER TABLE users ADD COLUMN twitter_url TEXT;
ALTER TABLE users ADD COLUMN website_url TEXT;

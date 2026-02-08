-- Add auth0_user_id column to store the full Auth0 sub claim (e.g., "github|12345", "google-oauth2|12345")
-- Previously, the code assumed all users logged in via GitHub and stripped the "github|" prefix,
-- but Auth0 supports multiple identity providers with different sub formats.
ALTER TABLE users ADD COLUMN auth0_user_id TEXT;

-- Backfill existing users: reconstruct auth0_user_id from github_user_id
-- Existing github_user_id values had the "github|" prefix stripped, so we add it back
UPDATE users SET auth0_user_id = 'github|' || github_user_id WHERE auth0_user_id IS NULL;

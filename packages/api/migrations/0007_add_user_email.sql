-- Add email column to users table for notification purposes
-- Email is obtained from Auth0 UserInfo Endpoint during login

ALTER TABLE users ADD COLUMN email TEXT;

-- Create index for email lookup (for future use)
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);

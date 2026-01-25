-- Remove role column from users table
-- Role information will be obtained from access token permissions instead

-- Drop the role column
ALTER TABLE users DROP COLUMN role;

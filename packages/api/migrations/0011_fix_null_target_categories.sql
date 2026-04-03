-- Fix NULL target_categories in existing articles
-- This migration ensures all articles have a valid JSON array for target_categories

-- Update articles with NULL target_categories to default value
UPDATE articles
SET target_categories = '["authentication"]'
WHERE target_categories IS NULL OR target_categories = '';

-- Ensure the column has a default value for future inserts
-- Note: SQLite doesn't support ALTER COLUMN DEFAULT directly,
-- but we've handled this in the application code by ensuring
-- JSON.stringify always produces a valid JSON array

-- Migrate target_category (single value) to target_categories (JSON array)

-- Step 1: Add new column for JSON array
ALTER TABLE articles ADD COLUMN target_categories TEXT;

-- Step 2: Migrate existing data - convert single value to JSON array
UPDATE articles
SET target_categories = '["' || target_category || '"]'
WHERE target_category IS NOT NULL;

-- Step 3: Set default for rows without target_category
UPDATE articles
SET target_categories = '["authentication"]'
WHERE target_categories IS NULL;

-- Add target_category column to articles table
ALTER TABLE articles ADD COLUMN target_category TEXT CHECK (target_category IN ('authentication', 'authorization', 'security'));

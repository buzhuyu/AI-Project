
-- Drop the restrictive check constraint on agent_type
ALTER TABLE reviews DROP CONSTRAINT IF EXISTS reviews_agent_type_check;

-- Add password column to users for simple local auth
ALTER TABLE users ADD COLUMN IF NOT EXISTS password text;
ALTER TABLE users ADD COLUMN IF NOT EXISTS username text UNIQUE;

-- Make email nullable if it's not already, or we just generate fake emails
ALTER TABLE users ALTER COLUMN email DROP NOT NULL;

-- Add feedback_count view or just query it? 
-- Let's just rely on the API query.

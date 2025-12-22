-- Drop foreign key constraints and fix user_id columns

-- Drop foreign key constraints that reference users table
ALTER TABLE tts_generations DROP CONSTRAINT IF EXISTS tts_generations_user_id_fkey;
ALTER TABLE voice_clones DROP CONSTRAINT IF EXISTS voice_clones_user_id_fkey;

-- Now change user_id columns to TEXT
ALTER TABLE tts_generations ALTER COLUMN user_id TYPE TEXT;
ALTER TABLE voice_clones ALTER COLUMN user_id TYPE TEXT;
ALTER TABLE voice_usage_tracking ALTER COLUMN user_id TYPE TEXT;

SELECT 'Schema fixed successfully!' as status;

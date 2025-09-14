-- Add pain_level field to patients table
ALTER TABLE public.patients 
ADD COLUMN pain_level INTEGER NOT NULL DEFAULT 5 
CHECK (pain_level BETWEEN 1 AND 10);

-- Add comment to explain the pain scale
COMMENT ON COLUMN public.patients.pain_level IS 'Pain level on a scale of 1-10, where 1 is no pain and 10 is severe pain';

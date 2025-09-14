-- Add additional fields needed for nurse dashboard
ALTER TABLE public.patients
ADD COLUMN status TEXT NOT NULL DEFAULT 'waiting' CHECK (status IN ('waiting', 'in-treatment', 'discharged')),
ADD COLUMN assigned_nurse TEXT,
ADD COLUMN ai_summary TEXT,
ADD COLUMN video_url TEXT;

-- Add comments to explain fields
COMMENT ON COLUMN public.patients.status IS 'Current status of the patient';
COMMENT ON COLUMN public.patients.assigned_nurse IS 'Name of the nurse assigned to this patient';
COMMENT ON COLUMN public.patients.ai_summary IS 'AI-generated summary of patient condition';
COMMENT ON COLUMN public.patients.video_url IS 'URL to patient video recording';
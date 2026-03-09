ALTER TABLE public.prospects
  ADD COLUMN IF NOT EXISTS ai_readiness_score integer,
  ADD COLUMN IF NOT EXISTS ai_readiness_grade text,
  ADD COLUMN IF NOT EXISTS ai_readiness_data jsonb,
  ADD COLUMN IF NOT EXISTS ai_readiness_updated_at timestamp with time zone;
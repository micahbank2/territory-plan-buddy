ALTER TABLE public.prospect_contacts ADD COLUMN IF NOT EXISTS role text DEFAULT NULL;
ALTER TABLE public.prospect_contacts ADD COLUMN IF NOT EXISTS relationship_strength text DEFAULT NULL;
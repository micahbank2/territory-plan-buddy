
ALTER TABLE public.opportunities ADD COLUMN products text NOT NULL DEFAULT '';
ALTER TABLE public.opportunities ADD COLUMN close_date text NOT NULL DEFAULT '';
ALTER TABLE public.opportunities ADD COLUMN prospect_id uuid REFERENCES public.prospects(id) ON DELETE SET NULL;
ALTER TABLE public.opportunities DROP COLUMN source;
ALTER TABLE public.opportunities ALTER COLUMN type SET DEFAULT 'Net New';
ALTER TABLE public.opportunities ALTER COLUMN stage SET DEFAULT 'Develop';

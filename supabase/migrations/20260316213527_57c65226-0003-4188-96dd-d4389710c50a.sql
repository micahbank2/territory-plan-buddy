-- Add public_access column to territories
ALTER TABLE public.territories ADD COLUMN public_access text NOT NULL DEFAULT 'none';

-- Security definer function to check if territory is public
CREATE OR REPLACE FUNCTION public.is_territory_public(_territory_id uuid)
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = 'public'
AS $$
  SELECT public_access FROM public.territories WHERE id = _territory_id
$$;

-- Anon SELECT on territories
CREATE POLICY "Public territories are viewable by anyone"
ON public.territories FOR SELECT TO anon
USING (public_access != 'none');

-- Anon SELECT on prospects in public territories
CREATE POLICY "Public territory prospects are viewable"
ON public.prospects FOR SELECT TO anon
USING (EXISTS (
  SELECT 1 FROM public.territories t
  WHERE t.id = prospects.territory_id
  AND t.public_access != 'none'
));

-- Anon SELECT on prospect_contacts in public territories
CREATE POLICY "Public territory contacts are viewable"
ON public.prospect_contacts FOR SELECT TO anon
USING (EXISTS (
  SELECT 1 FROM public.prospects p
  JOIN public.territories t ON t.id = p.territory_id
  WHERE p.id = prospect_contacts.prospect_id
  AND t.public_access != 'none'
));

-- Anon SELECT on prospect_notes in public territories
CREATE POLICY "Public territory notes are viewable"
ON public.prospect_notes FOR SELECT TO anon
USING (EXISTS (
  SELECT 1 FROM public.prospects p
  JOIN public.territories t ON t.id = p.territory_id
  WHERE p.id = prospect_notes.prospect_id
  AND t.public_access != 'none'
));

-- Anon SELECT on prospect_interactions in public territories
CREATE POLICY "Public territory interactions are viewable"
ON public.prospect_interactions FOR SELECT TO anon
USING (EXISTS (
  SELECT 1 FROM public.prospects p
  JOIN public.territories t ON t.id = p.territory_id
  WHERE p.id = prospect_interactions.prospect_id
  AND t.public_access != 'none'
));

-- Anon SELECT on prospect_signals in public territories
CREATE POLICY "Public territory signals are viewable"
ON public.prospect_signals FOR SELECT TO anon
USING (EXISTS (
  SELECT 1 FROM public.prospects p
  JOIN public.territories t ON t.id = p.territory_id
  WHERE p.id = prospect_signals.prospect_id
  AND t.public_access != 'none'
));

-- Anon SELECT on prospect_tasks in public territories
CREATE POLICY "Public territory tasks are viewable"
ON public.prospect_tasks FOR SELECT TO anon
USING (EXISTS (
  SELECT 1 FROM public.prospects p
  JOIN public.territories t ON t.id = p.territory_id
  WHERE p.id = prospect_tasks.prospect_id
  AND t.public_access != 'none'
));
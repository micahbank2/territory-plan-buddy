
CREATE TABLE public.opportunities (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  territory_id uuid REFERENCES public.territories(id) ON DELETE CASCADE NOT NULL,
  user_id uuid NOT NULL,
  name text NOT NULL,
  type text NOT NULL DEFAULT 'One-time',
  potential_value integer DEFAULT 0,
  point_of_contact text NOT NULL DEFAULT '',
  source text NOT NULL DEFAULT 'Outreach',
  stage text NOT NULL DEFAULT 'Open',
  notes text NOT NULL DEFAULT '',
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.opportunities ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view opportunities in their territories"
ON public.opportunities FOR SELECT TO authenticated
USING (user_id = auth.uid() OR user_can_access_territory(territory_id));

CREATE POLICY "Users can manage opportunities in their territories"
ON public.opportunities FOR ALL TO authenticated
USING (user_id = auth.uid() OR user_can_edit_territory(territory_id))
WITH CHECK (user_id = auth.uid() OR user_can_edit_territory(territory_id));

CREATE POLICY "Public territory opportunities are viewable"
ON public.opportunities FOR SELECT TO anon
USING (EXISTS (
  SELECT 1 FROM territories t
  WHERE t.id = opportunities.territory_id
  AND t.public_access <> 'none'
));

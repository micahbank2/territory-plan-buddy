
CREATE TABLE public.prospect_signals (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  prospect_id uuid NOT NULL REFERENCES public.prospects(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  territory_id uuid REFERENCES public.territories(id),
  signal_type text NOT NULL DEFAULT 'Other',
  opportunity_type text NOT NULL DEFAULT 'Other',
  title text NOT NULL,
  description text NOT NULL DEFAULT '',
  relevance text NOT NULL DEFAULT 'Low',
  source text NOT NULL DEFAULT '',
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.prospect_signals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage signals in their territories"
ON public.prospect_signals
FOR ALL
TO authenticated
USING (
  (user_id = auth.uid()) OR 
  (EXISTS (
    SELECT 1 FROM prospects p 
    WHERE p.id = prospect_signals.prospect_id 
    AND user_can_edit_territory(p.territory_id)
  ))
)
WITH CHECK (
  (user_id = auth.uid()) OR 
  (EXISTS (
    SELECT 1 FROM prospects p 
    WHERE p.id = prospect_signals.prospect_id 
    AND user_can_edit_territory(p.territory_id)
  ))
);

CREATE POLICY "Users can view signals in their territories"
ON public.prospect_signals
FOR SELECT
TO authenticated
USING (
  (user_id = auth.uid()) OR 
  (EXISTS (
    SELECT 1 FROM prospects p 
    WHERE p.id = prospect_signals.prospect_id 
    AND user_can_access_territory(p.territory_id)
  ))
);

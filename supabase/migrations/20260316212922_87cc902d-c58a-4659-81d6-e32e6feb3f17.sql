CREATE POLICY "Users can join territories via link"
ON public.territory_members
FOR INSERT
TO authenticated
WITH CHECK (
  user_id = auth.uid()
  AND role IN ('editor', 'viewer')
);
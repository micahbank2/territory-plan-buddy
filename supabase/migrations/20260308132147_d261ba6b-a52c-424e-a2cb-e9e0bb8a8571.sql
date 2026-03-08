
-- 1. Create territories table
CREATE TABLE public.territories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL DEFAULT 'My Territory',
  owner_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.territories ENABLE ROW LEVEL SECURITY;

-- 2. Create territory_members table
CREATE TABLE public.territory_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  territory_id uuid NOT NULL REFERENCES public.territories(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  role text NOT NULL DEFAULT 'owner' CHECK (role IN ('owner', 'editor', 'viewer')),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(territory_id, user_id)
);
ALTER TABLE public.territory_members ENABLE ROW LEVEL SECURITY;

-- 3. Add territory_id to prospects
ALTER TABLE public.prospects ADD COLUMN territory_id uuid REFERENCES public.territories(id) ON DELETE SET NULL;

-- 4. Security definer function: can user access territory?
CREATE OR REPLACE FUNCTION public.user_can_access_territory(_territory_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.territory_members
    WHERE territory_id = _territory_id
      AND user_id = auth.uid()
  )
$$;

-- 5. Security definer: can user edit in territory?
CREATE OR REPLACE FUNCTION public.user_can_edit_territory(_territory_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.territory_members
    WHERE territory_id = _territory_id
      AND user_id = auth.uid()
      AND role IN ('owner', 'editor')
  )
$$;

-- 6. Security definer: is user territory owner?
CREATE OR REPLACE FUNCTION public.user_is_territory_owner(_territory_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.territory_members
    WHERE territory_id = _territory_id
      AND user_id = auth.uid()
      AND role = 'owner'
  )
$$;

-- 7. RLS for territories
CREATE POLICY "Users can view territories they belong to"
  ON public.territories FOR SELECT
  TO authenticated
  USING (public.user_can_access_territory(id));

CREATE POLICY "Users can create territories"
  ON public.territories FOR INSERT
  TO authenticated
  WITH CHECK (owner_id = auth.uid());

CREATE POLICY "Owners can update territories"
  ON public.territories FOR UPDATE
  TO authenticated
  USING (public.user_is_territory_owner(id));

CREATE POLICY "Owners can delete territories"
  ON public.territories FOR DELETE
  TO authenticated
  USING (public.user_is_territory_owner(id));

-- 8. RLS for territory_members
CREATE POLICY "Members can view territory members"
  ON public.territory_members FOR SELECT
  TO authenticated
  USING (public.user_can_access_territory(territory_id));

CREATE POLICY "Owners can manage members"
  ON public.territory_members FOR INSERT
  TO authenticated
  WITH CHECK (public.user_is_territory_owner(territory_id));

CREATE POLICY "Owners can update members"
  ON public.territory_members FOR UPDATE
  TO authenticated
  USING (public.user_is_territory_owner(territory_id));

CREATE POLICY "Owners can remove members"
  ON public.territory_members FOR DELETE
  TO authenticated
  USING (public.user_is_territory_owner(territory_id));

-- 9. Update prospects RLS: drop old, add new territory-based policies
DROP POLICY IF EXISTS "Users manage own prospects" ON public.prospects;

CREATE POLICY "Users can view prospects in their territories"
  ON public.prospects FOR SELECT
  TO authenticated
  USING (
    user_id = auth.uid() 
    OR public.user_can_access_territory(territory_id)
  );

CREATE POLICY "Users can insert prospects in their territories"
  ON public.prospects FOR INSERT
  TO authenticated
  WITH CHECK (
    user_id = auth.uid()
    OR public.user_can_edit_territory(territory_id)
  );

CREATE POLICY "Users can update prospects in their territories"
  ON public.prospects FOR UPDATE
  TO authenticated
  USING (
    user_id = auth.uid()
    OR public.user_can_edit_territory(territory_id)
  );

CREATE POLICY "Users can delete prospects in their territories"
  ON public.prospects FOR DELETE
  TO authenticated
  USING (
    user_id = auth.uid()
    OR public.user_can_edit_territory(territory_id)
  );

-- 10. Update sub-table RLS similarly
DROP POLICY IF EXISTS "Users manage own contacts" ON public.prospect_contacts;
CREATE POLICY "Users can manage contacts in their territories"
  ON public.prospect_contacts FOR ALL
  TO authenticated
  USING (
    user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.prospects p
      WHERE p.id = prospect_id
        AND public.user_can_edit_territory(p.territory_id)
    )
  )
  WITH CHECK (
    user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.prospects p
      WHERE p.id = prospect_id
        AND public.user_can_edit_territory(p.territory_id)
    )
  );

DROP POLICY IF EXISTS "Users manage own interactions" ON public.prospect_interactions;
CREATE POLICY "Users can manage interactions in their territories"
  ON public.prospect_interactions FOR ALL
  TO authenticated
  USING (
    user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.prospects p
      WHERE p.id = prospect_id
        AND public.user_can_edit_territory(p.territory_id)
    )
  )
  WITH CHECK (
    user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.prospects p
      WHERE p.id = prospect_id
        AND public.user_can_edit_territory(p.territory_id)
    )
  );

DROP POLICY IF EXISTS "Users manage own notes" ON public.prospect_notes;
CREATE POLICY "Users can manage notes in their territories"
  ON public.prospect_notes FOR ALL
  TO authenticated
  USING (
    user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.prospects p
      WHERE p.id = prospect_id
        AND public.user_can_edit_territory(p.territory_id)
    )
  )
  WITH CHECK (
    user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.prospects p
      WHERE p.id = prospect_id
        AND public.user_can_edit_territory(p.territory_id)
    )
  );

DROP POLICY IF EXISTS "Users manage own tasks" ON public.prospect_tasks;
CREATE POLICY "Users can manage tasks in their territories"
  ON public.prospect_tasks FOR ALL
  TO authenticated
  USING (
    user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.prospects p
      WHERE p.id = prospect_id
        AND public.user_can_edit_territory(p.territory_id)
    )
  )
  WITH CHECK (
    user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.prospects p
      WHERE p.id = prospect_id
        AND public.user_can_edit_territory(p.territory_id)
    )
  );

-- 11. Function to auto-create default territory for a user
CREATE OR REPLACE FUNCTION public.ensure_user_territory(_user_id uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _territory_id uuid;
BEGIN
  -- Check if user already has a territory they own
  SELECT t.id INTO _territory_id
  FROM public.territories t
  JOIN public.territory_members tm ON tm.territory_id = t.id
  WHERE tm.user_id = _user_id AND tm.role = 'owner'
  LIMIT 1;
  
  IF _territory_id IS NOT NULL THEN
    RETURN _territory_id;
  END IF;

  -- Create default territory
  INSERT INTO public.territories (name, owner_id)
  VALUES ('My Territory', _user_id)
  RETURNING id INTO _territory_id;

  -- Add owner as member
  INSERT INTO public.territory_members (territory_id, user_id, role)
  VALUES (_territory_id, _user_id, 'owner');

  -- Assign existing prospects to this territory
  UPDATE public.prospects
  SET territory_id = _territory_id
  WHERE user_id = _user_id AND territory_id IS NULL;

  RETURN _territory_id;
END;
$$;

-- 12. Function to look up user by email for invitations
CREATE OR REPLACE FUNCTION public.find_user_id_by_email(_email text)
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT id FROM auth.users WHERE email = _email LIMIT 1
$$;

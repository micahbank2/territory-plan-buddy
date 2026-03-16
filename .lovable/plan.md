

## Enable Public (Anonymous) Viewing via Share Link

### The Problem
Currently, "Anyone with the link" still requires login because:
1. The `ShareJoinPage` redirects unauthenticated users to `/auth`
2. All data tables have RLS policies that only allow `authenticated` users
3. The `territories` SELECT policy uses `user_can_access_territory()` which checks `territory_members` — anonymous users have no membership

### Solution
Add a `public_access` column to territories so owners can toggle public link sharing. When set, anonymous users can view the territory's prospects read-only without logging in.

### Changes

**1. Database migration**
- Add `public_access text NOT NULL DEFAULT 'none'` to `territories` (values: `'none'`, `'viewer'`, `'editor'`)
- Add a security definer function `is_territory_public(_territory_id uuid)` that returns the `public_access` value
- Add SELECT policies for `anon` role on `territories`, `prospects`, `prospect_contacts`, `prospect_interactions`, `prospect_notes`, `prospect_signals`, `prospect_tasks` — all using `is_territory_public(territory_id) != 'none'` as the condition
- This keeps existing authenticated policies untouched

**2. `ShareTerritoryDialog.tsx`**
- Add a toggle/dropdown for "General access" with options: "Restricted" (login required to join) vs "Anyone with the link" (public view)
- When "Anyone with the link" is selected, save `public_access = linkRole` to the territory
- When "Restricted" is selected, save `public_access = 'none'`
- The owner updates this via `supabase.from('territories').update({ public_access })` (already allowed by owner UPDATE policy)

**3. `ShareJoinPage.tsx`**
- Remove the redirect-to-auth for unauthenticated users
- If user is NOT logged in AND the territory has `public_access != 'none'`, render a **read-only public view** of the territory's prospects inline (a simplified version of the prospect table)
- If user IS logged in, keep the current join-as-member behavior
- Show a "Sign in to edit" banner for anonymous viewers

**4. New component: `PublicTerritoryView.tsx`**
- A simplified read-only prospect list/table for anonymous viewers
- Fetches prospects, contacts, etc. for the territory using the anon key (allowed by the new RLS policies)
- Shows territory name, prospect count, basic table with name/industry/status/website
- No editing, no filters beyond basic search — keeps it simple

**5. `useTerritories.ts`**
- Add `updatePublicAccess(territoryId, access: 'none' | 'viewer' | 'editor')` function
- Pass it to `ShareTerritoryDialog`

**6. `App.tsx`**
- No changes needed — `/share/:territoryId` route already exists and isn't wrapped in `ProtectedRoute`

### RLS Policy Summary

```sql
-- Allow anonymous SELECT on territories that are public
CREATE POLICY "Public territories are viewable"
ON public.territories FOR SELECT TO anon
USING (public_access != 'none');

-- Allow anonymous SELECT on prospects in public territories  
CREATE POLICY "Public territory prospects are viewable"
ON public.prospects FOR SELECT TO anon
USING (EXISTS (
  SELECT 1 FROM territories t 
  WHERE t.id = prospects.territory_id 
  AND t.public_access != 'none'
));

-- Same pattern for prospect_contacts, prospect_notes, etc.
```

### User Flow
1. Owner opens Share dialog → sets "Anyone with the link" to Viewer
2. Copies link → sends to someone
3. Recipient opens link in incognito → sees read-only prospect list immediately, no login required
4. If they want to edit, they can sign in and get added as a member


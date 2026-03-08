

## Fix CSV Contact Upload + Improve Preview + Add Team Collaboration

### Three issues to fix

---

### 1. Contact CSV uploads don't actually save (critical bug)

**Root cause:** `bulkMerge` in `useProspects.ts` (lines 305-337) only maps flat prospect fields (name, website, industry, etc.) to database columns. When contact import passes `{ contacts: [...] }` in the changes, `bulkMerge` has no `if ("contacts" in c)` branch — it silently ignores the contacts array. The toast fires, but nothing is written to `prospect_contacts`.

**Fix:** Add contact-sync logic to `bulkMerge`, reusing the same pattern from the `update` function (delete existing contacts for that prospect, re-insert the full array). Specifically:
- After updating prospect fields, check if `"contacts" in c`
- If so, delete from `prospect_contacts` where `prospect_id = id`, then insert all contacts with the user's `user_id`

---

### 2. Preview table cuts off after a few rows

**Root cause:** The `ScrollArea` on line 601 has `className="flex-1 min-h-0"` but no explicit max-height. Inside the flex dialog (`max-h-[85vh]`), it doesn't get enough space to become scrollable.

**Fix:** Add `max-h-[50vh]` to the ScrollArea so it scrolls. Also add a row count indicator (e.g., "Showing 142 rows").

---

### 3. Team collaboration with role-based access

**User's requirements clarified:**
- **AE (Account Exec):** Owns their own territory. Can invite a BDR to collaborate on their accounts. Should NOT see manager views or other AEs' territories.
- **BDR:** Works with an AE on the AE's territory. May also have their own territory.  
- **BDR Manager:** Oversees their BDRs. Can view/access the territories their BDRs are on, but this is a supervisory view — not the same as an AE's working view.

**Data model (database migration):**

```text
territories
├── id (uuid PK)
├── name (text)
├── owner_id (uuid → auth.users)
├── created_at (timestamptz)

territory_members
├── id (uuid PK)
├── territory_id (uuid → territories)
├── user_id (uuid → auth.users)
├── role (text: 'owner' | 'editor' | 'viewer')
├── created_at (timestamptz)
├── UNIQUE(territory_id, user_id)

prospects
├── territory_id (uuid, nullable → territories)  ← NEW COLUMN
```

- Every user gets a default territory auto-created (via a DB trigger on auth.users insert)
- `prospects.territory_id` is backfilled from the user's default territory
- RLS on `prospects` changes from `user_id = auth.uid()` to checking territory membership via a `security definer` function

**Role behavior:**
- **owner**: Full CRUD on territory and its prospects. Can invite members.
- **editor**: Can CRUD prospects in the territory. Cannot invite or delete the territory. (BDRs get this role)
- **viewer**: Read-only access. (BDR managers get this on their BDRs' territories)

**UI changes:**
- Territory selector dropdown in header (only shows if user belongs to multiple territories)
- "Share" button on territory → invite by email, pick role (editor/viewer)
- Members list showing who has access and their role
- No "manager dashboard" — managers simply switch between territories they have viewer access to
- AEs see only their own territory by default; no manager UI clutter

**RLS approach:**
- Create `user_can_access_territory(territory_id uuid)` security definer function
- Update `prospects` RLS: `USING (user_can_access_territory(territory_id))`
- Separate policies for INSERT (must be owner/editor) vs SELECT (owner/editor/viewer)
- Same pattern for `prospect_contacts`, `prospect_interactions`, `prospect_notes`, `prospect_tasks`

**Files changed:**
- `src/hooks/useProspects.ts` — fix `bulkMerge` contacts handling; add `territory_id` to queries; territory-aware loading
- `src/components/CSVUploadDialog.tsx` — fix ScrollArea height
- `src/components/TerritoryPlanner.tsx` — add territory selector, share button, members UI
- `src/hooks/useAuth.tsx` — expose current territory context
- New: `src/hooks/useTerritories.ts` — territory CRUD, member management
- New: `src/components/ShareTerritoryDialog.tsx` — invite flow
- Database migration: new tables, updated RLS, backfill


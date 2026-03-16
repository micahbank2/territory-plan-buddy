

## Revamp Share Territory Dialog (Google Docs-style)

### Changes

**1. `ShareTerritoryDialog.tsx` — UI overhaul**

- **Remove role titles from dropdown options**: Change `"Editor (BDR)"` / `"Viewer (Manager)"` to just `"Editor"` / `"Viewer"` in the role `<select>`.
- **Update bottom role legend** to be cleaner, Google Docs-style tooltips:
  - "Editor — Can add and edit prospects"
  - "Viewer — Read-only access"
  - Remove the AE/BDR/Manager parentheticals.
- **Add "Copy link" section**: A new section above or below the email invite with a "General access" area (like Google Docs). It will have:
  - A dropdown to set the link access role (`Editor` / `Viewer`)
  - A "Copy link" button that copies a shareable URL to clipboard
  - The link format: `{origin}/share/{territory_id}?role={role}` — this is a client-side route that, when visited by an authenticated user, will auto-join them to the territory.

**2. New route + page: `src/pages/ShareJoinPage.tsx`**
- Route: `/share/:territoryId`
- On load: check if user is authenticated (redirect to login if not), then read `role` query param, call a new join function to add themselves as a member.
- If already a member, redirect to `/` with the territory active.
- Show a simple "Joining territory..." loading state.

**3. `useTerritories.ts` — add `joinTerritory` function**
- New function: `joinTerritory(territoryId: string, role: "editor" | "viewer")`
- Inserts a row into `territory_members` for the current user with the given role (if not already a member).
- Switches to that territory after joining.

**4. Database: RLS policy for self-join via link**
- Currently, `territory_members` INSERT is likely restricted to owners. Need to add an RLS policy (or adjust existing) allowing authenticated users to insert themselves as editor/viewer into a territory. To prevent abuse, we can keep it simple for now — anyone with the link can join. Alternatively, add a `share_links` table with tokens, but that's heavier than needed. Simplest: allow self-insert with role = editor or viewer (not owner).

**5. `App.tsx` — add `/share/:territoryId` route**

### Summary of visual changes
- Dropdown options: "Editor" / "Viewer" (no parenthetical titles)
- Bottom legend: concise permission descriptions without role aliases
- New "General access" section with copy-link button + role selector
- New `/share/:territoryId` join page for link-based sharing


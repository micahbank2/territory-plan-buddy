# External Integrations

**Analysis Date:** 2026-03-26

## APIs & External Services

### Supabase (Primary Backend)
- **Purpose:** Database, authentication, real-time subscriptions
- **SDK:** `@supabase/supabase-js` ^2.98.0
- **Client:** `src/integrations/supabase/client.ts`
- **Types:** `src/integrations/supabase/types.ts` (auto-generated)
- **Auth method:** Env vars `VITE_SUPABASE_URL` + `VITE_SUPABASE_PUBLISHABLE_KEY`
- **Session:** localStorage-persisted, auto-refresh tokens
- **Usage:** Every data hook (`useProspects.ts`, `useOpportunities.ts`, `useTerritories.ts`, `useSignals.ts`, `useAuth.tsx`)

### Anthropic API (AI Features)
- **Purpose:** AI readiness assessment for prospects
- **Client:** Direct `fetch()` to `https://api.anthropic.com/v1/messages`
- **Auth method:** Env var `VITE_ANTHROPIC_API_KEY` (passed as `x-api-key` header)
- **Config location:** `src/components/ProspectSheet.tsx` (lines ~344-422)
- **Headers:** `anthropic-version: 2023-06-01`, `anthropic-dangerous-direct-browser-access: true`
- **Note:** Direct browser-to-API calls (no backend proxy). Uses the dangerous direct browser access flag.

### Google S2 Favicons
- **Purpose:** Company logos/favicons displayed next to prospect names
- **URL pattern:** `https://www.google.com/s2/favicons?domain={domain}&sz={size}`
- **Helper:** `getLogoUrl()` in `src/data/prospects.ts` (line 269)
- **Used in:** `src/pages/OpportunitiesPage.tsx`, `src/components/OpportunitySheet.tsx`, `src/components/OpportunityKanban.tsx`
- **Auth:** None (public API)

### Wikidata API
- **Purpose:** Auto-enrichment of prospect data (location counts, industry classification)
- **Endpoints:**
  - Search: `https://www.wikidata.org/w/api.php?action=wbsearchentities`
  - Entity: `https://www.wikidata.org/w/api.php?action=wbgetentities`
- **Used in:** `src/components/EnrichmentQueue.tsx` (line 68+), `src/components/AddProspectDialog.tsx` (lines 81+, 195+)
- **Auth:** None (public API, `origin=*` for CORS)

### Google Fonts
- **Purpose:** Inter font family
- **URL:** `https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&display=swap`
- **Config location:** `src/index.css` (line 1)
- **Auth:** None

## Database

**Provider:** Supabase (PostgreSQL)
- **Connection:** Via `@supabase/supabase-js` client, configured in `src/integrations/supabase/client.ts`
- **ORM/Client:** Supabase JS client (no ORM -- direct table queries)
- **Schema types:** Auto-generated at `src/integrations/supabase/types.ts`
- **No direct CLI access** (Lovable Cloud hosted instance)

**Tables:**
- `prospects` - Core prospect/account data
- `prospect_contacts` - Contacts per prospect
- `prospect_interactions` - Activity log per prospect
- `prospect_notes` - Notes per prospect
- `prospect_tasks` - Tasks per prospect
- `opportunities` - Deal pipeline
- `territories` - Territory groupings
- `territory_members` - Shared territory access (RBAC)
- `signals` - Buying signals per prospect

**Data access pattern:** Custom hooks wrap all Supabase queries with optimistic local state updates. No TanStack Query integration for caching -- hooks manage their own `useState` arrays.

## Authentication

**Provider:** Supabase Auth
- **Implementation:** `src/hooks/useAuth.tsx` (React Context + Provider pattern)
- **Session handling:** `localStorage` persistence, auto token refresh
- **Auth state:** `onAuthStateChange` listener with de-duplication guard (prevents re-renders on token refresh)
- **Sign out:** `supabase.auth.signOut()`
- **Owner gating:** `OWNER_EMAILS` constant in `src/data/prospects.ts` restricts admin features to specific emails

**Lovable Cloud Auth:**
- `@lovable.dev/cloud-auth-js` ^0.0.3 installed (platform-level auth for Lovable deployment)

## Third-Party SDKs

| SDK | Package | Purpose | Init Location |
|-----|---------|---------|---------------|
| Supabase | `@supabase/supabase-js` | DB + Auth | `src/integrations/supabase/client.ts` |
| Lovable Cloud Auth | `@lovable.dev/cloud-auth-js` | Platform auth | Imported at app level |

## Webhooks & Callbacks

**Incoming:** None
**Outgoing:** None

## Environment Configuration

**Required env vars:**
- `VITE_SUPABASE_URL` - Supabase project URL
- `VITE_SUPABASE_PUBLISHABLE_KEY` - Supabase anon key

**Optional env vars:**
- `VITE_ANTHROPIC_API_KEY` - Required only for AI readiness feature in ProspectSheet

**Secrets location:** `.env` file (git-ignored). All prefixed with `VITE_` for Vite client-side exposure.

**Important:** All secrets are exposed to the browser bundle since they use the `VITE_` prefix. The Anthropic API key is sent directly from the browser -- there is no server-side proxy.

---

*Integration audit: 2026-03-26*

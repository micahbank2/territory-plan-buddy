# External Integrations

**Analysis Date:** 2026-04-24

## APIs & External Services

### Supabase (Primary Backend)
- **Purpose:** Database, authentication, Edge Functions
- **SDK:** `@supabase/supabase-js` ^2.98.0
- **Client:** `src/integrations/supabase/client.ts` (singleton, auto-generated preamble "Do not edit directly")
- **Types:** `src/integrations/supabase/types.ts` (auto-generated, 591 lines)
- **Auth method:** Env vars `VITE_SUPABASE_URL` + `VITE_SUPABASE_PUBLISHABLE_KEY`
- **Session:** `localStorage` persistence, auto-refresh tokens (`persistSession: true`, `autoRefreshToken: true`)
- **Project id:** `opktnhjukjiclagcyqpk` (from `supabase/config.toml`)
- **Usage:** Every data hook (`useProspects.ts`, `useOpportunities.ts`, `useTerritories.ts`, `useSignals.ts`, `useAuth.tsx`) plus all Edge Function invocations from components

### Lovable AI Gateway (AI Features — via Edge Functions)
- **Purpose:** Unified LLM access used by all AI Edge Functions
- **URL:** `https://ai.gateway.lovable.dev/v1/chat/completions`
- **Auth method:** `Authorization: Bearer ${LOVABLE_API_KEY}` header (server-side secret, read via `Deno.env.get("LOVABLE_API_KEY")`)
- **Model in use:** `google/gemini-3-flash-preview` (every Edge Function hard-codes this model)
- **Called by:** Every function under `supabase/functions/*/index.ts`
- **Important:** The Anthropic API is no longer called directly from the client. `VITE_ANTHROPIC_API_KEY` was removed from the bundle in Phase 01 (security remediation). The client NEVER holds an AI key — all requests flow through Supabase Edge Functions into the Lovable gateway.

### Supabase Edge Functions (AI + Enrichment Workloads)
All Edge Functions live under `supabase/functions/`. Each is a single `index.ts` using Deno std HTTP server. Invoked from the client via `supabase.functions.invoke(name, { body })`.

| Function | Purpose | Client call sites | `verify_jwt` |
|----------|---------|-------------------|--------------|
| `ai-readiness` | AI search visibility score + strengths/risks/yext_opportunity JSON | `src/components/AIReadinessCard.tsx` | `false` |
| `categorize-signal` | Classify buying signals (signal_type / opportunity_type / relevance) | `src/components/SignalsSection.tsx` | `false` |
| `chat` | Prospect chat assistant | `src/components/ProspectSheet.tsx` | `false` |
| `draft-outreach` | Generate first-touch cold email draft | `src/components/ProspectSheet.tsx`, `src/components/BulkOutreachQueue.tsx` | default (jwt required) |
| `enrich-prospect` | Enrich existing prospect (industry, competitor, yext_relevance) | `src/components/EnrichmentQueue.tsx` | `false` |
| `enrich-prospect-add` | Enrich at add-time (industry, tier, estimated locations, competitor, key contacts) | `src/components/AddProspectDialog.tsx` | default |
| `meeting-prep` | Full meeting-prep brief from account context | `src/components/ProspectSheet.tsx` | default |
| `research-account` | Recent intelligence / signals research (JSON array of findings) | Invoked via `draft-outreach` mode-switched handler; research mode also referenced in signals flow | default |

All functions share:
- CORS headers for browser direct invocation (`Access-Control-Allow-Origin: *`, plus `x-supabase-client-platform*` headers in `Access-Control-Allow-Headers`)
- Error handling for HTTP 429 (rate limit) and 402 (payment required) from the Lovable gateway
- JSON-only response contract for downstream parsing in the client

### Google S2 Favicons
- **Purpose:** Company logos/favicons displayed next to prospect names
- **URL pattern:** `https://www.google.com/s2/favicons?domain={domain}&sz={size}`
- **Helper:** `getLogoUrl()` in `src/data/prospects.ts` (line 275)
- **Used in:** `src/data/prospects.ts`, `src/components/ProspectSheet.tsx`, `src/components/OpportunitySheet.tsx`, `src/components/OpportunityKanban.tsx`, `src/components/ContactPickerDialog.tsx`, `src/components/EnrichmentQueue.tsx`, `src/components/TerritoryPlanner.tsx`, `src/pages/OpportunitiesPage.tsx`, `src/pages/InsightsPage.tsx`, `src/pages/ProspectPage.tsx`, `src/pages/SignalsPage.tsx`, `src/pages/TodayPage.tsx`
- **Auth:** None (public API)
- **Override:** Custom base64 `customLogo` on prospect takes precedence over Google favicon

### Wikidata API
- **Purpose:** Auto-enrichment of prospect data (location counts, industry classification, description)
- **Endpoints:**
  - Search: `https://www.wikidata.org/w/api.php?action=wbsearchentities`
  - Entity: `https://www.wikidata.org/w/api.php?action=wbgetentities`
- **Used in:** `src/components/EnrichmentQueue.tsx` (lines 68, 79, 101), `src/components/AddProspectDialog.tsx` (lines 83, 90, 197, 204)
- **Auth:** None (public API, `origin=*` for CORS)
- **Pairing:** Wikidata provides structured facts; the follow-on `enrich-prospect` / `enrich-prospect-add` Edge Function turns them into Yext-specific tier/competitor/contact hypotheses.

### Google Fonts
- **Purpose:** Inter font family
- **URL:** `https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&display=swap`
- **Config location:** `src/index.css` (line 1)
- **Auth:** None

## Data Storage

**Databases:**
- Supabase (PostgreSQL)
  - Connection: Via `@supabase/supabase-js` client, configured in `src/integrations/supabase/client.ts`
  - ORM/Client: Supabase JS client (no ORM — direct table queries)
  - Schema types: Auto-generated at `src/integrations/supabase/types.ts`
  - Migrations: `supabase/migrations/` (11 SQL files, most recent `20260326194930_*.sql`)
  - No direct CLI access to production (Lovable Cloud hosted instance — migrations applied via Lovable deploy pipeline / dashboard)

**Tables (live schema):**
- `prospects` - Core prospect/account data (includes `ai_readiness_*` jsonb columns)
- `prospect_contacts` - Contacts per prospect (role, relationship_strength)
- `prospect_interactions` - Activity log per prospect
- `prospect_notes` - Notes per prospect (rendered via TipTap + DOMPurify-sanitized HTML)
- `prospect_tasks` - Tasks per prospect (due_date nullable)
- `opportunities` - Deal pipeline (stage, potential_value, close_date, optional `prospect_id` FK)
- `territories` - Territory groupings
- `territory_members` - Shared territory access (owner / editor / viewer RBAC)
- `signals` - Buying signals per prospect

**Data access pattern:** Custom hooks wrap all Supabase queries with optimistic local state updates. No TanStack Query integration for caching — hooks manage their own `useState` arrays. `QueryClient` is provisioned in `App.tsx` but currently unused for data flow.

**File Storage:**
- Custom logos stored as base64 strings in `prospects.custom_logo` column (no Supabase Storage bucket in use)

**Caching:**
- None (no Redis / no CDN cache layer beyond Lovable's static hosting)

## Authentication & Identity

**Primary Provider:** Supabase Auth
- Implementation: `src/hooks/useAuth.tsx` (React Context + Provider pattern)
- Session handling: `localStorage` persistence, auto token refresh
- Auth state: `onAuthStateChange` listener with de-duplication guard (prevents re-renders on token refresh)
- Sign out: `supabase.auth.signOut()`
- Owner gating: `OWNER_EMAILS` constant in `src/data/prospects.ts` restricts admin features (`seedData`, reset) to specific emails

**OAuth Layer:** Lovable Cloud Auth
- Package: `@lovable.dev/cloud-auth-js` ^1.0.0
- Wrapper: `src/integrations/lovable/index.ts` (auto-generated by Lovable — "Do not modify")
- Providers: Google, Apple
- Flow: `lovableAuth.signInWithOAuth(provider, { redirect_uri, extraParams })` returns tokens → `supabase.auth.setSession(result.tokens)` hands the session back to Supabase
- Entry point: `src/pages/AuthPage.tsx` (line 79)

## Monitoring & Observability

**Error Tracking:**
- None (no Sentry / Datadog / Rollbar)
- User-facing failures surface via `sonner` toasts
- Developer visibility via `console.error()` in hooks and components

**Logs:**
- Client: console only
- Edge Functions: Supabase/Lovable platform logs (accessible via Lovable Cloud dashboard)

## CI/CD & Deployment

**Hosting:**
- Lovable Cloud (client SPA + Supabase Edge Functions)

**CI Pipeline:**
- None in the repo (no `.github/workflows/`, no custom CI)
- Deploy trigger: push to `main` on GitHub. Lovable Cloud auto-builds and redeploys both the Vite bundle and the Edge Functions under `supabase/functions/`.

## Environment Configuration

**Required env vars (client, `VITE_` prefixed — exposed in browser bundle):**
- `VITE_SUPABASE_URL` - Supabase project URL
- `VITE_SUPABASE_PUBLISHABLE_KEY` - Supabase anon key

**Removed from client (Phase 01 security remediation):**
- `VITE_ANTHROPIC_API_KEY` — no longer referenced in `src/`. Test `src/components/ProspectSheet.test.tsx` asserts this by static analysis.

**Edge Function secrets (server-side only):**
- `LOVABLE_API_KEY` - Set in Lovable Cloud / Supabase Functions secrets. Never leaves the function runtime. Used by every `supabase/functions/*/index.ts`.

**Secrets location:** `.env` file at repo root (git-ignored) for `VITE_*` vars. Edge Function secrets managed through Lovable Cloud dashboard.

**Important:** The `VITE_*` prefix exposes Supabase URL and anon key to the browser bundle by design (Supabase public keys are safe to ship client-side; RLS policies gate actual access). All privileged / paid AI credentials now live only in Edge Function runtime.

## Third-Party SDKs

| SDK | Package | Purpose | Init Location |
|-----|---------|---------|---------------|
| Supabase | `@supabase/supabase-js` | DB + Auth + Edge Function invocation | `src/integrations/supabase/client.ts` |
| Lovable Cloud Auth | `@lovable.dev/cloud-auth-js` | Google/Apple OAuth bridged to Supabase session | `src/integrations/lovable/index.ts` |
| DOMPurify | `dompurify` | HTML sanitization for user-supplied note HTML | `src/components/SafeHTML.tsx` |
| TipTap | `@tiptap/react`, `@tiptap/starter-kit`, `@tiptap/pm` | Rich-text editing (notes) | Component-local |

## Webhooks & Callbacks

**Incoming:** None
**Outgoing:** None (Edge Functions only make outbound calls to Lovable AI Gateway; no third-party webhook deliveries)

---

*Integration audit: 2026-04-24*

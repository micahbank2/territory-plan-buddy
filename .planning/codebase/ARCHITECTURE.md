# Architecture

**Analysis Date:** 2026-04-24

## Pattern Overview

**Overall:** Single-page application with component-based React architecture, custom hooks for data access, and Supabase as backend-as-a-service (no custom API layer). Branded as "Territory Planner" (wordmark lives at `src/components/brand/Wordmark.tsx`).

**Key Characteristics:**
- No backend server -- all data access goes directly from React hooks to the Supabase JS SDK
- State lives in custom hooks using `useState` + `useEffect` with optimistic updates. Since March 2026, mutations in `src/hooks/useProspects.ts` and `src/hooks/useOpportunities.ts` snapshot previous state and roll back on Supabase error (see `update`, `remove`, `bulkUpdate`, `bulkRemove` in `useProspects.ts`).
- TanStack Query is installed and wired (`QueryClientProvider` in `src/App.tsx` with `refetchOnWindowFocus: false` and `refetchOnReconnect: false`) but NOT used for data fetching — all hooks use raw `useState`/`useEffect` patterns.
- Supabase Edge Functions handle AI/enrichment workloads (Anthropic API calls, web scraping)
- Auth via Supabase Auth with React Context provider pattern; optional OAuth via Lovable Cloud adapter (`src/integrations/lovable/index.ts`)
- Territory-scoped data: almost all queries filter by `territory_id`
- Sub-collection writes (contacts, interactions, notes, tasks) use single-row CRUD functions — the legacy delete-all + re-insert pattern has been eliminated from `update()` (decision D-05)

## Layers

**Routing / App Shell:**
- Purpose: Bootstrap providers, define routes, gate auth
- Location: `src/App.tsx` (76 lines), `src/main.tsx`
- Contains: Route definitions, `ProtectedRoute` wrapper, `LandingOrDashboard` public/auth switch, provider tree (Theme > QueryClient > Tooltip > Toaster/Sonner > Auth > Router)
- Depends on: `src/hooks/useAuth.tsx`, all page components
- Used by: Browser entry point
- Notable: Root route `/` renders `LandingPage` when logged out and `Index` when logged in (no redirect). `/signals` redirects to `/insights`.

**Pages:**
- Purpose: Top-level route handlers, each renders one view
- Location: `src/pages/`
- Contains: Route-level components that compose hooks + feature components
- Key files (lines of code after April 2026 edits):
  - `src/pages/Index.tsx` (5 lines) -- thin wrapper, renders `<TerritoryPlanner />`
  - `src/pages/ProspectPage.tsx` (917 lines) -- full-page prospect detail view
  - `src/pages/MyNumbersPage.tsx` (875 lines) -- quota / activity tracking
  - `src/pages/OpportunitiesPage.tsx` (724 lines) -- deal pipeline with table + kanban
  - `src/pages/InsightsPage.tsx` (540 lines) -- analytics / charts
  - `src/pages/TodayPage.tsx` (278 lines) -- daily briefing view
  - `src/pages/SignalsPage.tsx` (211 lines) -- legacy signals view (route redirects to `/insights`, but file still loaded)
  - `src/pages/LandingPage.tsx` (168 lines) -- unauthenticated landing
  - `src/pages/AuthPage.tsx` (159 lines) -- login/signup (now includes OAuth buttons)
  - `src/pages/ShareJoinPage.tsx` (103 lines) -- territory share join flow
  - `src/pages/ResetPasswordPage.tsx` (68 lines)
  - `src/pages/NotFound.tsx` (24 lines)
- Depends on: hooks, feature components
- Used by: `src/App.tsx` routes

**Feature Components:**
- Purpose: Reusable UI features (dialogs, sheets, sections)
- Location: `src/components/`
- Contains: Complex interactive components with local state
- Key files (lines of code):
  - `src/components/TerritoryPlanner.tsx` (2401 lines) -- THE main app shell; table view, filters, sorting, inline editing, all dialog launchers. Grew ~200 lines since March.
  - `src/components/ProspectSheet.tsx` (1141 lines) -- slide-over detail panel for a single prospect. Grew ~150 lines (enhanced contact notes UI commit).
  - `src/components/EnrichmentQueue.tsx` (925 lines) -- AI enrichment batch processing
  - `src/pages/ProspectPage.tsx` is a companion full-page view with overlapping logic
  - `src/components/AddProspectDialog.tsx` (764 lines) -- new prospect form with AI enrichment trigger
  - `src/components/CSVUploadDialog.tsx` (741 lines) -- CSV import with preview/mapping
  - `src/components/OpportunitySheet.tsx` (467 lines) -- deal detail slide-over
  - `src/components/ContactPickerDialog.tsx` (466 lines) -- **new (post-March)**: multi-contact selection for bulk outreach
  - `src/components/PasteImportDialog.tsx` (445 lines) -- paste-based bulk import
  - `src/components/ShareTerritoryDialog.tsx` (331 lines) -- territory sharing / member management
  - `src/components/AIReadinessCard.tsx` (311 lines) -- AI readiness score display
  - `src/components/OpportunityKanban.tsx` (299 lines) -- DnD kanban board for opportunities (`@dnd-kit`)
  - `src/components/SignalsSection.tsx` (283 lines) -- buying signals per prospect
  - `src/components/ExportDialog.tsx` (256 lines) -- **new**: export prospects to CSV
  - `src/components/QuotaHeroBoxes.tsx` (211 lines) -- **new**: quota tracker on MyNumbersPage
  - `src/components/PendingOutreachDialog.tsx` (215 lines) -- **new**: resume-outreach-batch dialog backed by localStorage
  - `src/components/BulkOutreachQueue.tsx` (202 lines) -- batch outreach drafting
  - `src/components/AddContactDialog.tsx` (158 lines) -- **new**: standalone contact-creation dialog
  - `src/components/BulkEditDialog.tsx` (147 lines) -- multi-select field updates
  - `src/components/AccountCombobox.tsx` (133 lines) -- prospect search combobox
  - `src/components/StakeholderMap.tsx` (100 lines) -- contact relationship viz
  - `src/components/MultiSelect.tsx` (97 lines) -- filter multi-select
  - `src/components/RichTextEditor.tsx` (90 lines) -- TipTap editor wrapper
  - `src/components/ContactBadges.tsx` (68 lines) -- role/strength badges
  - `src/components/NavLink.tsx` (28 lines)
  - `src/components/SafeHTML.tsx` (14 lines) -- **new**: DOMPurify-sanitized HTML renderer used for rich-text notes
  - `src/components/brand/Wordmark.tsx` (12 lines) -- **new**: "TerritoryPlan" gradient wordmark that replaced the Yext logo header
- Depends on: hooks, `src/data/prospects.ts`, `src/components/ui/`, `src/lib/buildContactPrompt.ts`, `src/lib/pendingBatch.ts`
- Used by: Pages and TerritoryPlanner

**UI Primitives:**
- Purpose: shadcn/ui component library (do not modify directly)
- Location: `src/components/ui/` (50 files)
- Contains: Standard shadcn set plus `retro-grid.tsx` (decorative background) and the `use-toast.ts` hook file that ships with shadcn toast
- Depends on: Radix UI primitives, `src/lib/utils.ts`
- Used by: All feature components and pages

**Data Hooks:**
- Purpose: All data fetching, mutation, and local state management
- Location: `src/hooks/`
- Contains: Custom React hooks that wrap Supabase queries with optimistic local state
- Key files:
  - `src/hooks/useProspects.ts` (656 lines) -- prospect CRUD, sub-collection sync, seed data, rollback snapshots, direct-CRUD functions for contacts/interactions/notes/tasks (`addContact`/`updateContact`/`removeContact`, `addInteraction`/`updateInteraction`/`removeInteraction`, `addNote`/`updateNote`/`deleteNote`, `addTask`/`updateTask`/`removeTask`). `update()` now **intentionally ignores** sub-collection fields and callers must use the dedicated CRUD (per decision D-05).
  - `src/hooks/useTerritories.ts` (206 lines) -- territory CRUD, member management, role resolution, `activeTerritory` localStorage persistence, `ensure_user_territory` RPC
  - `src/hooks/useOpportunities.ts` (118 lines) -- opportunity CRUD with `sanitizeForDb` guard + rollback on delete
  - `src/hooks/useSignals.ts` (120 lines) -- buying signals CRUD with `SIGNAL_TYPES`, `OPPORTUNITY_TYPES`, `SIGNAL_RELEVANCE` constants
  - `src/hooks/useAuth.tsx` (77 lines) -- auth context provider + hook
  - `src/hooks/use-mobile.tsx` (19 lines) -- viewport detection (note: extension changed from `.ts` to `.tsx`)
  - `src/hooks/use-toast.ts` (186 lines) -- toast state management (shadcn)
- Tests:
  - `src/hooks/useProspects.test.ts` (158 lines)
- Depends on: `src/integrations/supabase/client.ts`, `src/data/prospects.ts`
- Used by: Pages and feature components

**Data Model / Constants:**
- Purpose: Type definitions, scoring logic, seed data, domain constants
- Location: `src/data/prospects.ts` (621 lines)
- Contains: All TypeScript interfaces (`Prospect`, `Contact`, `InteractionLog`, `NoteEntry`, `Task`, `AIReadinessData`), scoring functions (`scoreProspect`, `scoreBreakdown`, `getScoreLabel`), domain constants (`STAGES`, `INDUSTRIES`, `COMPETITORS`, `TIERS`, `PRIORITIES`, `CONTACT_ROLES`, `RELATIONSHIP_STRENGTHS`, `INTERACTION_TYPES`), `initProspect()` factory, `SEED` array (309 accounts), logo URL helper (`getLogoUrl`). New fields on `Prospect`: `activeAcv`, `lastModified`, `transitionOwner`, `linkedinUrl` on Contact, `starred` on Contact.
- Depends on: Nothing
- Used by: All hooks and components

**Supabase Client:**
- Purpose: Singleton Supabase client instance
- Location: `src/integrations/supabase/client.ts` (17 lines)
- Contains: Client creation with `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY`, configured with `localStorage` session persistence and `autoRefreshToken: true`
- Depends on: Environment variables
- Used by: All hooks, some components directly for `supabase.functions.invoke()` (`AIReadinessCard`, `AddProspectDialog`, `BulkOutreachQueue`, `EnrichmentQueue`, `ProspectSheet`, `SignalsSection`)

**Supabase Types:**
- Purpose: Auto-generated TypeScript types for database schema
- Location: `src/integrations/supabase/types.ts` (600 lines)
- Contains: `Database` type with all table definitions
- Depends on: Nothing (generated)
- Used by: `src/integrations/supabase/client.ts`

**Lovable Cloud Integration:**
- Purpose: OAuth adapter for Google/Apple sign-in via Lovable Cloud
- Location: `src/integrations/lovable/index.ts` (39 lines)
- Contains: `lovable.auth.signInWithOAuth(provider, opts)` wrapper that calls `createLovableAuth().signInWithOAuth` then `supabase.auth.setSession(result.tokens)`
- Depends on: `@lovable.dev/cloud-auth-js`, `@/integrations/supabase/client`
- Used by: `src/pages/AuthPage.tsx` for OAuth buttons
- Note: Marked auto-generated; do not edit.

**Edge Functions:**
- Purpose: Server-side AI / enrichment (runs on Supabase infrastructure, Deno runtime)
- Location: `supabase/functions/`
- Contains (8 functions):
  - `supabase/functions/ai-readiness/index.ts` -- AI readiness scoring via Anthropic (invoked by `AIReadinessCard.tsx`)
  - `supabase/functions/draft-outreach/index.ts` -- AI email drafting (invoked by `ProspectSheet.tsx`, `BulkOutreachQueue.tsx`)
  - `supabase/functions/meeting-prep/index.ts` -- meeting brief generation (invoked by `ProspectSheet.tsx`)
  - `supabase/functions/enrich-prospect/index.ts` -- prospect enrichment (invoked by `EnrichmentQueue.tsx`)
  - `supabase/functions/enrich-prospect-add/index.ts` -- enrichment during add flow (invoked by `AddProspectDialog.tsx`)
  - `supabase/functions/categorize-signal/index.ts` -- signal categorization (invoked by `SignalsSection.tsx`)
  - `supabase/functions/chat/index.ts` -- conversational AI (invoked by `ProspectSheet.tsx`)
  - `supabase/functions/research-account/index.ts` -- **new (post-March)**: deeper account research; not yet wired to a frontend caller
- Depends on: Anthropic API, Supabase DB
- Used by: Components invoke these via `supabase.functions.invoke()`

**Utilities / Shared Libraries:**
- Purpose: Shared helper functions and pure-logic modules
- Location: `src/lib/`
- Contains:
  - `src/lib/utils.ts` (12 lines) -- `cn()` Tailwind class merge, `normalizeUrl()` URL normalization
  - `src/lib/buildContactPrompt.ts` (197 lines) -- **new**: constructs Anthropic prompt for contact-level outreach (tone by account status, grouping by prospect, role hierarchy)
  - `src/lib/pendingBatch.ts` (32 lines) -- **new**: localStorage helpers for pending bulk-outreach batches (`savePendingBatch`, `loadPendingBatch`, `clearPendingBatch`)
- Depends on: `clsx`, `tailwind-merge`, `@/data/prospects`, `@/hooks/useSignals`
- Used by: All components

## Data Flow

**Prospect List (main view):**

1. `src/App.tsx` renders `<Index />` (if authed) which renders `<TerritoryPlanner />`
2. `TerritoryPlanner` calls `useTerritories()` to get `activeTerritory`
3. `TerritoryPlanner` calls `useProspects(activeTerritory)` which fetches `prospects` + all sub-collections (contacts, interactions, notes, tasks) from Supabase in parallel via `Promise.all`
4. Data is held in `useState` inside `useProspects`; filtering / sorting / pagination happen in `TerritoryPlanner` via `useMemo`
5. Mutations call `update()` / `add()` / `remove()` on the hook. Each mutation:
   - Snapshots the pre-mutation value from `data`
   - Does an optimistic `setData()` update
   - Writes to Supabase
   - On error: rolls back to the snapshot and shows a `toast.error("Failed to save — changes not persisted")`

**Prospect Detail:**

1. User clicks a row in TerritoryPlanner or navigates to `/prospect/:id`
2. `ProspectSheet` (slide-over) or `ProspectPage` (full page) receives prospect data from parent via props
3. Edits call `update(id, changes)` for top-level prospect fields. Sub-collection changes call dedicated CRUD methods (`addContact` / `updateContact` / `removeContact`, `addInteraction` / ..., `addNote` / `updateNote` / `deleteNote`, `addTask` / `updateTask` / `removeTask`)
4. AI features (readiness, outreach drafting, meeting prep, chat) invoke Supabase Edge Functions via `supabase.functions.invoke("function-name", { body: {...} })` directly from the component

**Bulk Outreach Flow:**

1. User selects contacts via `ContactPickerDialog` in `TerritoryPlanner`
2. `buildContactPrompt(selections, filterSummary)` in `src/lib/buildContactPrompt.ts` composes an Anthropic prompt including tone guidance per account status
3. `BulkOutreachQueue` invokes the `draft-outreach` Edge Function per contact
4. In-progress batches persist to `localStorage` via `src/lib/pendingBatch.ts` so the user can resume via `PendingOutreachDialog`

**State Management:**
- Auth state: React Context (`AuthProvider` in `src/hooks/useAuth.tsx`)
- Prospect data: `useState` in `useProspects` hook, consumed by components that call the hook
- Territory state: `useState` in `useTerritories` hook, active territory persisted in `localStorage` under key `tp-active-territory`
- Opportunity data: `useState` in `useOpportunities` hook
- Signal data: `useState` in `useSignals` hook
- Pending outreach batch: `localStorage` under key `tp-pending-outreach` (via `src/lib/pendingBatch.ts`)
- UI state (filters, sort, editing cells, selected rows, open dialogs): `useState` in `TerritoryPlanner.tsx`
- TanStack Query: installed and configured but NOT used for data fetching (see note in Pattern Overview)

## Key Abstractions

**Prospect:**
- Purpose: Core domain entity — a company being prospected
- Examples: `src/data/prospects.ts` (interface), `src/hooks/useProspects.ts` (CRUD)
- Pattern: Flat object with nested sub-collection arrays (`contacts`, `interactions`, `noteLog`, `tasks`). Sub-collections are written via dedicated row-level CRUD functions — `update()` ignores them.

**Territory:**
- Purpose: Data partition for multi-user collaboration
- Examples: `src/hooks/useTerritories.ts`
- Pattern: All data queries filter by `territory_id`; role-based access (owner / editor / viewer) exposed via `myRole`

**Opportunity:**
- Purpose: Sales deal linked to a prospect
- Examples: `src/hooks/useOpportunities.ts`
- Pattern: Separate table with optional `prospect_id` FK. `sanitizeForDb` strips non-schema fields before insert/update; INSERT drops empty optional fields while UPDATE sets nullable fields to `null` to clear them.

**Signal:**
- Purpose: Buying signal or trigger event for a prospect
- Examples: `src/hooks/useSignals.ts`
- Pattern: Categorized event with signal type, opportunity type, and relevance level (Hot / Warm / Low)

**Score:**
- Purpose: Prospect prioritization metric (0-100+)
- Examples: `src/data/prospects.ts` (`scoreProspect`, `scoreBreakdown`, `getScoreLabel`)
- Pattern: Pure function that sums weighted factors from prospect fields; display-only (does not drive recommended actions — still a known gap)

**Pending Outreach Batch:**
- Purpose: Persist an in-progress bulk-outreach workflow across reloads
- Examples: `src/lib/pendingBatch.ts`, `src/components/PendingOutreachDialog.tsx`
- Pattern: `{ entries: PendingBatchEntry[], savedAt: string }` serialized to `localStorage`

## Entry Points

**Browser Entry:**
- Location: `src/main.tsx`
- Triggers: Page load
- Responsibilities: Mounts React root to `#root` DOM element

**App Bootstrap:**
- Location: `src/App.tsx`
- Triggers: React render
- Responsibilities: Provider tree setup (Theme > QueryClient > Tooltip > Toaster / Sonner > Auth > Router), route definitions, auth gating via `ProtectedRoute`, public/private switch via `LandingOrDashboard`

**Main Dashboard:**
- Location: `src/pages/Index.tsx` -> `src/components/TerritoryPlanner.tsx`
- Triggers: Authenticated user navigates to `/`
- Responsibilities: Primary UI — prospect table, filtering, inline editing, all dialog launchers

## Error Handling

**Strategy:** Optimistic updates with rollback snapshots on mutation failure (new since March 2026), plus toast notifications for user-facing errors.

**Patterns:**
- Hooks log errors via `console.error()` and show `toast.error()` via sonner for user-facing failures
- `useProspects` mutations (`update`, `remove`, `bulkUpdate`, `bulkRemove`) snapshot pre-mutation state and roll back on Supabase error
- `useOpportunities.remove` does the same
- Edge Function failures surface via toast in the calling component
- No global error boundary
- Sub-collection CRUD (contacts, interactions, notes, tasks) currently updates local state after a successful write (no optimistic rollback in the per-row CRUD functions)

## Cross-Cutting Concerns

**Logging:** `console.error` for Supabase failures; `console.log` for debug in some hooks (e.g., `useOpportunities` logs insert payloads). No structured logging.

**Validation:** Minimal — form-level validation in dialogs (required fields), no schema validation (no Zod on forms yet). Database constraints handle integrity.

**Authentication:** Supabase Auth via `AuthProvider` context. `ProtectedRoute` wrapper redirects unauthenticated users to `/auth`. OAuth (Google / Apple) is available via `src/integrations/lovable/index.ts`. Owner-only features gated by `OWNER_EMAILS = ["micahbank2@gmail.com", "mbank@yext.com"]` array in `src/hooks/useProspects.ts`.

**Authorization:** Territory-level via `territory_members.role` (owner / editor / viewer). `useTerritories` exposes `myRole`. Row-level security policies exist in Supabase (managed via migrations in `supabase/migrations/`, 11 files as of April 2026).

**Theming:** `next-themes` with `ThemeProvider` in `src/App.tsx`, `defaultTheme="light"`, `enableSystem={false}`. Toggle in TerritoryPlanner header.

**HTML Sanitization:** Rich-text notes are rendered via `src/components/SafeHTML.tsx` which wraps `DOMPurify` with a strict allow-list (`p`, `br`, `strong`, `em`, `u`, `s`, `ul`, `ol`, `li`, `a`, `h1-h3`; attrs `href`, `target`, `rel`).

---

*Architecture analysis: 2026-04-24*

# Architecture

**Analysis Date:** 2026-03-26

## Pattern Overview

**Overall:** Single-page application with component-based React architecture, custom hooks for data access, and Supabase as backend-as-a-service (no custom API layer).

**Key Characteristics:**
- No backend server -- all data access goes directly from React hooks to Supabase client SDK
- State lives in custom hooks using `useState` with optimistic updates (no Redux, no Zustand, no TanStack Query for mutations)
- Supabase Edge Functions handle AI/enrichment workloads (Anthropic API calls, web scraping)
- Auth via Supabase Auth with React Context provider pattern
- Territory-scoped data: almost all queries filter by `territory_id`

## Layers

**Routing / App Shell:**
- Purpose: Bootstrap providers, define routes, gate auth
- Location: `src/App.tsx`, `src/main.tsx`
- Contains: Route definitions, `ProtectedRoute` wrapper, provider tree (Theme > QueryClient > Tooltip > Auth > Router)
- Depends on: `src/hooks/useAuth.tsx`, all page components
- Used by: Browser entry point

**Pages:**
- Purpose: Top-level route handlers, each renders one view
- Location: `src/pages/`
- Contains: Route-level components that compose hooks + feature components
- Key files:
  - `src/pages/Index.tsx` -- thin wrapper, renders `<TerritoryPlanner />`
  - `src/pages/ProspectPage.tsx` (923 lines) -- full-page prospect detail view
  - `src/pages/OpportunitiesPage.tsx` (738 lines) -- deal pipeline with table + kanban
  - `src/pages/InsightsPage.tsx` (543 lines) -- analytics/charts
  - `src/pages/TodayPage.tsx` (282 lines) -- daily briefing view
  - `src/pages/MyNumbersPage.tsx` (247 lines) -- quota/activity tracking
  - `src/pages/AuthPage.tsx` (163 lines) -- login/signup
  - `src/pages/LandingPage.tsx` (170 lines) -- unauthenticated landing
  - `src/pages/ShareJoinPage.tsx` -- territory share join flow
- Depends on: hooks, feature components
- Used by: `src/App.tsx` routes

**Feature Components:**
- Purpose: Reusable UI features (dialogs, sheets, sections)
- Location: `src/components/`
- Contains: Complex interactive components with local state
- Key files:
  - `src/components/TerritoryPlanner.tsx` (2194 lines) -- THE main app shell; table view, filters, sorting, inline editing, all dialogs
  - `src/components/ProspectSheet.tsx` (989 lines) -- slide-over detail panel for a single prospect
  - `src/components/EnrichmentQueue.tsx` (925 lines) -- AI enrichment batch processing
  - `src/components/AddProspectDialog.tsx` (764 lines) -- new prospect form
  - `src/components/CSVUploadDialog.tsx` (741 lines) -- CSV import with preview/mapping
  - `src/components/PasteImportDialog.tsx` (445 lines) -- paste-based bulk import
  - `src/components/OpportunitySheet.tsx` (442 lines) -- deal detail slide-over
  - `src/components/OpportunityKanban.tsx` (292 lines) -- kanban board for opportunities
  - `src/components/ShareTerritoryDialog.tsx` (331 lines) -- territory sharing/member management
  - `src/components/AIReadinessCard.tsx` (311 lines) -- AI readiness score display
  - `src/components/SignalsSection.tsx` (283 lines) -- buying signals per prospect
  - `src/components/BulkOutreachQueue.tsx` (202 lines) -- batch outreach drafting
  - `src/components/BulkEditDialog.tsx` (148 lines) -- multi-select field updates
- Depends on: hooks, `src/data/prospects.ts`, `src/components/ui/`
- Used by: Pages and TerritoryPlanner

**UI Primitives:**
- Purpose: shadcn/ui component library (do not modify directly)
- Location: `src/components/ui/`
- Contains: 49 shadcn components (Button, Dialog, Sheet, Drawer, Select, Table, Tabs, etc.)
- Depends on: Radix UI primitives, `src/lib/utils.ts`
- Used by: All feature components and pages

**Data Hooks:**
- Purpose: All data fetching, mutation, and local state management
- Location: `src/hooks/`
- Contains: Custom React hooks that wrap Supabase queries with optimistic local state
- Key files:
  - `src/hooks/useProspects.ts` (580 lines) -- prospect CRUD, sub-collection sync, seed data
  - `src/hooks/useTerritories.ts` (206 lines) -- territory CRUD, member management, role resolution
  - `src/hooks/useOpportunities.ts` (105 lines) -- opportunity CRUD
  - `src/hooks/useSignals.ts` (113 lines) -- buying signals CRUD
  - `src/hooks/useAuth.tsx` (77 lines) -- auth context provider + hook
  - `src/hooks/use-mobile.ts` -- viewport detection
  - `src/hooks/use-toast.ts` (186 lines) -- toast state management
- Depends on: `src/integrations/supabase/client.ts`, `src/data/prospects.ts`
- Used by: Pages and feature components

**Data Model / Constants:**
- Purpose: Type definitions, scoring logic, seed data, domain constants
- Location: `src/data/prospects.ts` (612 lines)
- Contains: All TypeScript interfaces (`Prospect`, `Contact`, `InteractionLog`, `NoteEntry`, `Task`, `AIReadinessData`), scoring functions (`scoreProspect`, `scoreBreakdown`, `getScoreLabel`), domain constants (`STAGES`, `INDUSTRIES`, `COMPETITORS`, `TIERS`, `PRIORITIES`, `CONTACT_ROLES`, `RELATIONSHIP_STRENGTHS`, `INTERACTION_TYPES`), `initProspect()` factory, `SEED` array (309 accounts), logo URL helper (`getLogoUrl`)
- Depends on: Nothing
- Used by: All hooks and components

**Supabase Client:**
- Purpose: Singleton Supabase client instance
- Location: `src/integrations/supabase/client.ts`
- Contains: Client creation with `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY`
- Depends on: Environment variables
- Used by: All hooks, some components directly (ProspectSheet calls supabase for edge functions)

**Supabase Types:**
- Purpose: Auto-generated TypeScript types for database schema
- Location: `src/integrations/supabase/types.ts` (591 lines)
- Contains: `Database` type with all table definitions
- Depends on: Nothing (generated)
- Used by: `src/integrations/supabase/client.ts`

**Edge Functions:**
- Purpose: Server-side AI processing (runs on Supabase infrastructure)
- Location: `supabase/functions/`
- Contains:
  - `supabase/functions/ai-readiness/index.ts` -- AI readiness scoring via Anthropic
  - `supabase/functions/draft-outreach/index.ts` -- AI email drafting
  - `supabase/functions/meeting-prep/index.ts` -- meeting brief generation
  - `supabase/functions/enrich-prospect/index.ts` -- prospect enrichment
  - `supabase/functions/enrich-prospect-add/index.ts` -- enrichment with add
  - `supabase/functions/categorize-signal/index.ts` -- signal categorization
  - `supabase/functions/chat/index.ts` -- chat/conversational AI
- Depends on: Anthropic API, Supabase DB
- Used by: Components invoke these via `supabase.functions.invoke()`

**Utilities:**
- Purpose: Shared helper functions
- Location: `src/lib/utils.ts`
- Contains: `cn()` (Tailwind class merge), `normalizeUrl()` (URL normalization)
- Depends on: `clsx`, `tailwind-merge`
- Used by: All components

## Data Flow

**Prospect List (main view):**

1. `src/App.tsx` renders `<Index />` which renders `<TerritoryPlanner />`
2. `TerritoryPlanner` calls `useTerritories()` to get `activeTerritory`
3. `TerritoryPlanner` calls `useProspects(activeTerritory)` which fetches prospects + all sub-collections (contacts, interactions, notes, tasks) from Supabase in parallel
4. Data is held in `useState` inside `useProspects`; filtering/sorting/pagination happen in `TerritoryPlanner` via `useMemo`
5. Mutations call `update()` / `add()` / `remove()` on the hook, which does optimistic `setData()` update + async Supabase write

**Prospect Detail:**

1. User clicks a row in TerritoryPlanner or navigates to `/prospect/:id`
2. `ProspectSheet` (slide-over) or `ProspectPage` (full page) receives prospect data from parent via props
3. Edits call `update(id, changes)` passed down from parent; sub-collection changes (contacts, interactions, notes, tasks) use either direct CRUD methods (`addContact`, `updateContact`, `removeContact`) or full-replace via `update(id, { interactions: [...] })`
4. AI features (readiness, outreach drafting) invoke Supabase Edge Functions via `supabase.functions.invoke("function-name", { body: {...} })`

**State Management:**
- Auth state: React Context (`AuthProvider` in `src/hooks/useAuth.tsx`)
- Prospect data: `useState` in `useProspects` hook, consumed by components that call the hook
- Territory state: `useState` in `useTerritories` hook, active territory persisted in `localStorage`
- Opportunity data: `useState` in `useOpportunities` hook
- Signal data: `useState` in `useSignals` hook
- UI state (filters, sort, editing cells, selected rows, open dialogs): `useState` in `TerritoryPlanner.tsx`
- TanStack Query: installed and configured (`QueryClientProvider` in App.tsx with `refetchOnWindowFocus: false`) but NOT used for data fetching -- all hooks use raw `useState`/`useEffect` patterns

## Key Abstractions

**Prospect:**
- Purpose: Core domain entity -- a company being prospected
- Examples: `src/data/prospects.ts` (interface), `src/hooks/useProspects.ts` (CRUD)
- Pattern: Flat object with nested sub-collection arrays (contacts, interactions, noteLog, tasks)

**Territory:**
- Purpose: Data partition for multi-user collaboration
- Examples: `src/hooks/useTerritories.ts`
- Pattern: All data queries filter by `territory_id`; role-based access (owner/editor/viewer)

**Opportunity:**
- Purpose: Sales deal linked to a prospect
- Examples: `src/hooks/useOpportunities.ts`
- Pattern: Separate table with optional `prospect_id` FK

**Signal:**
- Purpose: Buying signal or trigger event for a prospect
- Examples: `src/hooks/useSignals.ts`
- Pattern: Categorized event with relevance level (Hot/Warm/Low)

**Score:**
- Purpose: Prospect prioritization metric (0-100+)
- Examples: `src/data/prospects.ts` (`scoreProspect`, `scoreBreakdown`, `getScoreLabel`)
- Pattern: Pure function that sums weighted factors from prospect fields; display-only (does not drive actions)

## Entry Points

**Browser Entry:**
- Location: `src/main.tsx`
- Triggers: Page load
- Responsibilities: Mounts React root to `#root` DOM element

**App Bootstrap:**
- Location: `src/App.tsx`
- Triggers: React render
- Responsibilities: Provider tree setup (Theme, QueryClient, Tooltip, Auth, Router), route definitions, auth gating via `ProtectedRoute`

**Main Dashboard:**
- Location: `src/pages/Index.tsx` -> `src/components/TerritoryPlanner.tsx`
- Triggers: Authenticated user navigates to `/`
- Responsibilities: Primary UI -- prospect table, filtering, inline editing, all dialog launchers

## Error Handling

**Strategy:** Minimal -- optimistic updates with console.error on failure, toast notifications for user-facing errors.

**Patterns:**
- Hooks log errors via `console.error()` and show `toast.error()` for user-facing failures
- No rollback on failed optimistic updates -- local state becomes stale until page reload
- Supabase client errors are checked but not thrown -- most functions return silently on error
- Edge Function failures surface via toast in the calling component
- No global error boundary

## Cross-Cutting Concerns

**Logging:** `console.error` for Supabase failures; `console.log` for debug in some hooks (e.g., `useOpportunities` logs insert payloads). No structured logging.

**Validation:** Minimal -- form-level validation in dialogs (required fields), no schema validation (no Zod). Database constraints handle integrity.

**Authentication:** Supabase Auth via `AuthProvider` context. `ProtectedRoute` wrapper redirects unauthenticated users to `/auth`. Owner-only features gated by `OWNER_EMAILS` array in `src/hooks/useProspects.ts`.

**Authorization:** Territory-level via `territory_members.role` (owner/editor/viewer). `useTerritories` exposes `myRole`. Row-level security policies exist in Supabase (managed via migrations in `supabase/migrations/`).

**Theming:** `next-themes` with `ThemeProvider` in `src/App.tsx`. Default: light. Toggle in TerritoryPlanner header.

---

*Architecture analysis: 2026-03-26*

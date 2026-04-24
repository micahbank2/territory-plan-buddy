# Codebase Structure

**Analysis Date:** 2026-04-24

## Directory Layout

```
territory-plan-buddy/
├── src/
│   ├── assets/                      # Static images (yext-logo-black.jpg, yext-logo-white.jpg — legacy, kept but unused in header)
│   ├── components/
│   │   ├── ui/                      # shadcn/ui primitives (50 files, DO NOT modify directly)
│   │   ├── brand/
│   │   │   └── Wordmark.tsx         # (12 lines) "TerritoryPlan" gradient wordmark
│   │   ├── TerritoryPlanner.tsx     # (2401 lines) Main app shell
│   │   ├── ProspectSheet.tsx        # (1141 lines) Prospect detail slide-over
│   │   ├── EnrichmentQueue.tsx      # (925 lines) AI enrichment batch UI
│   │   ├── AddProspectDialog.tsx    # (764 lines) New prospect form + AI enrichment trigger
│   │   ├── CSVUploadDialog.tsx      # (741 lines) CSV import with column mapping
│   │   ├── OpportunitySheet.tsx     # (467 lines) Deal detail slide-over
│   │   ├── ContactPickerDialog.tsx  # (466 lines) Multi-contact selection for bulk outreach (NEW)
│   │   ├── PasteImportDialog.tsx    # (445 lines) Paste-based import
│   │   ├── ShareTerritoryDialog.tsx # (331 lines) Territory sharing
│   │   ├── AIReadinessCard.tsx      # (311 lines) AI readiness score card
│   │   ├── OpportunityKanban.tsx    # (299 lines) Deal kanban (DnD)
│   │   ├── SignalsSection.tsx       # (283 lines) Buying signals per prospect
│   │   ├── ExportDialog.tsx         # (256 lines) CSV export (NEW)
│   │   ├── PendingOutreachDialog.tsx # (215 lines) Resume-bulk-outreach dialog (NEW)
│   │   ├── QuotaHeroBoxes.tsx       # (211 lines) Quota progress boxes for MyNumbersPage (NEW)
│   │   ├── BulkOutreachQueue.tsx    # (202 lines) Batch outreach drafting
│   │   ├── AddContactDialog.tsx     # (158 lines) Standalone contact creation (NEW)
│   │   ├── BulkEditDialog.tsx       # (147 lines) Multi-select field updates
│   │   ├── AccountCombobox.tsx      # (133 lines) Prospect search combobox
│   │   ├── StakeholderMap.tsx       # (100 lines) Contact relationship viz
│   │   ├── MultiSelect.tsx          # (97 lines) Filter multi-select
│   │   ├── RichTextEditor.tsx       # (90 lines) TipTap editor wrapper
│   │   ├── ContactBadges.tsx        # (68 lines) Role/strength badges
│   │   ├── NavLink.tsx              # (28 lines) Navigation link
│   │   ├── SafeHTML.tsx             # (14 lines) DOMPurify-sanitized HTML renderer (NEW)
│   │   ├── PublicTerritoryView.tsx  # (166 lines) Public share view
│   │   ├── TerritoryPlanner.test.tsx   # (5 lines) Smoke test
│   │   ├── ProspectSheet.test.tsx      # (15 lines) Smoke test
│   │   ├── PendingOutreachDialog.test.tsx # (102 lines) Unit tests
│   │   └── SafeHTML.test.tsx        # (21 lines) Unit tests
│   ├── data/
│   │   └── prospects.ts             # (621 lines) Types, constants, scoring, seed data
│   ├── hooks/
│   │   ├── useProspects.ts          # (656 lines) Prospect CRUD + per-row sub-collection CRUD + rollback snapshots
│   │   ├── useTerritories.ts        # (206 lines) Territory CRUD + member management
│   │   ├── useSignals.ts            # (120 lines) Signal CRUD
│   │   ├── useOpportunities.ts      # (118 lines) Opportunity CRUD with sanitizeForDb guard
│   │   ├── useAuth.tsx              # (77 lines) Auth context provider
│   │   ├── use-toast.ts             # (186 lines) Toast state (shadcn)
│   │   ├── use-mobile.tsx           # (19 lines) Viewport detection (now .tsx)
│   │   └── useProspects.test.ts     # (158 lines) Unit tests
│   ├── integrations/
│   │   ├── supabase/
│   │   │   ├── client.ts            # (17 lines) Supabase singleton client
│   │   │   └── types.ts             # (600 lines) Auto-generated DB types
│   │   └── lovable/
│   │       └── index.ts             # (39 lines) Lovable OAuth adapter (auto-generated)
│   ├── lib/
│   │   ├── utils.ts                 # (12 lines) cn() + normalizeUrl()
│   │   ├── buildContactPrompt.ts    # (197 lines) Anthropic prompt builder for bulk outreach (NEW)
│   │   ├── pendingBatch.ts          # (32 lines) localStorage helpers for pending bulk-outreach (NEW)
│   │   └── pendingBatch.test.ts     # (90 lines) Unit tests
│   ├── pages/
│   │   ├── Index.tsx                # (5 lines) Dashboard wrapper -> TerritoryPlanner
│   │   ├── ProspectPage.tsx         # (917 lines) Full-page prospect view
│   │   ├── MyNumbersPage.tsx        # (875 lines) Quota/activity tracking (grew ~630 lines)
│   │   ├── OpportunitiesPage.tsx    # (724 lines) Deal pipeline (table + kanban)
│   │   ├── InsightsPage.tsx         # (540 lines) Analytics / charts
│   │   ├── TodayPage.tsx            # (278 lines) Daily briefing
│   │   ├── SignalsPage.tsx          # (211 lines) Legacy signals view (route redirects to /insights)
│   │   ├── LandingPage.tsx          # (168 lines) Unauthenticated landing
│   │   ├── AuthPage.tsx             # (159 lines) Login/signup (OAuth buttons via Lovable)
│   │   ├── ShareJoinPage.tsx        # (103 lines) Territory invite join
│   │   ├── ResetPasswordPage.tsx    # (68 lines) Password reset
│   │   └── NotFound.tsx             # (24 lines) 404
│   ├── test/
│   │   ├── setup.ts                 # Vitest setup (jest-dom matchers)
│   │   └── example.test.ts          # Sanity test
│   ├── App.tsx                      # (76 lines) Provider tree + routes
│   ├── App.css                      # Minimal (legacy Vite boilerplate)
│   ├── main.tsx                     # React DOM mount
│   ├── index.css                    # Global styles + custom classes
│   └── vite-env.d.ts
├── supabase/
│   ├── functions/
│   │   ├── ai-readiness/index.ts       # AI readiness scoring
│   │   ├── draft-outreach/index.ts     # Email draft generation
│   │   ├── meeting-prep/index.ts       # Meeting brief generation
│   │   ├── enrich-prospect/index.ts    # Prospect enrichment
│   │   ├── enrich-prospect-add/index.ts # Enrichment during add flow
│   │   ├── categorize-signal/index.ts  # Signal categorization
│   │   ├── chat/index.ts               # Conversational AI
│   │   └── research-account/index.ts   # Deeper account research (NEW, not yet wired)
│   └── migrations/                     # 11 SQL migration files (latest 2026-03-26)
├── public/                             # Static assets (favicons, robots.txt)
├── components.json                     # shadcn/ui config (default style, slate base, CSS variables)
├── tailwind.config.ts                  # Tailwind configuration
├── vite.config.ts                      # Vite build (port 8080, @/ alias, SWC)
├── vitest.config.ts                    # Vitest (jsdom env, globals)
├── tsconfig.json / tsconfig.app.json / tsconfig.node.json   # TS configs (strict: false)
├── eslint.config.js                    # ESLint flat config
├── postcss.config.js                   # Tailwind + autoprefixer
├── bun.lock / bun.lockb                # Bun lockfiles
└── package.json
```

## Key Files

| File | Purpose | Lines | Complexity |
|------|---------|-------|------------|
| `src/components/TerritoryPlanner.tsx` | Main app shell: table, filters, sorting, inline editing, all dialog launchers | 2401 | Very High — god component, still growing |
| `src/components/ProspectSheet.tsx` | Slide-over prospect detail panel; edge-function calls for draft/meeting-prep/chat | 1141 | High — long vertical scroll, enhanced contact notes UI |
| `src/components/EnrichmentQueue.tsx` | AI enrichment batch processing UI | 925 | High — async queue management |
| `src/pages/ProspectPage.tsx` | Full-page prospect view (alternative to sheet) | 917 | High — duplicates some ProspectSheet logic |
| `src/pages/MyNumbersPage.tsx` | Quota / activity tracking | 875 | High — numerous charts and stat computations (grew ~630 lines since March) |
| `src/components/AddProspectDialog.tsx` | New prospect creation form with AI enrichment | 764 | Medium |
| `src/components/CSVUploadDialog.tsx` | CSV import with column mapping | 741 | High |
| `src/pages/OpportunitiesPage.tsx` | Deal pipeline table + kanban views | 724 | Medium |
| `src/hooks/useProspects.ts` | All prospect data ops + rollback snapshots + per-row sub-collection CRUD | 656 | High |
| `src/data/prospects.ts` | Domain types, constants, scoring, seed data | 621 | Medium |
| `src/integrations/supabase/types.ts` | Auto-generated DB types | 600 | Low — generated |
| `src/pages/InsightsPage.tsx` | Analytics charts | 540 | Medium |
| `src/components/OpportunitySheet.tsx` | Deal detail slide-over | 467 | Medium |
| `src/components/ContactPickerDialog.tsx` | Multi-contact selector for bulk outreach (NEW) | 466 | Medium |
| `src/components/PasteImportDialog.tsx` | Paste-based import | 445 | Medium |
| `src/lib/buildContactPrompt.ts` | Anthropic prompt builder for bulk outreach | 197 | Medium — pure logic |
| `src/hooks/useTerritories.ts` | Territory CRUD + members | 206 | Medium |
| `src/hooks/useOpportunities.ts` | Opportunity CRUD with sanitizeForDb | 118 | Low |
| `src/hooks/useSignals.ts` | Signal CRUD | 120 | Low |
| `src/App.tsx` | Provider tree + route definitions | 76 | Low |
| `src/hooks/useAuth.tsx` | Auth context | 77 | Low |
| `src/lib/utils.ts` | cn() and normalizeUrl() | 12 | Low |

## Module Boundaries

**Hook -> Supabase (mostly clean):**
All Supabase table CRUD goes through hooks in `src/hooks/`. Components should not import `supabase` directly for data queries. Exceptions (pragmatic, for Edge Functions):
- `src/components/AIReadinessCard.tsx` — invokes `ai-readiness`
- `src/components/AddProspectDialog.tsx` — invokes `enrich-prospect-add`
- `src/components/BulkOutreachQueue.tsx` — invokes `draft-outreach`
- `src/components/EnrichmentQueue.tsx` — invokes `enrich-prospect`
- `src/components/ProspectSheet.tsx` — invokes `draft-outreach`, `meeting-prep`, `chat`
- `src/components/SignalsSection.tsx` — invokes `categorize-signal`

**Data model is centralized:**
`src/data/prospects.ts` is the single source for all prospect domain types and constants. Hooks and components both import from here. Do not duplicate type definitions elsewhere. `useOpportunities.ts` and `useSignals.ts` define their own entity types and constants locally.

**Shared logic in `src/lib/`:**
- Pure prompt construction: `src/lib/buildContactPrompt.ts`
- Persistence helpers: `src/lib/pendingBatch.ts`
- Generic helpers: `src/lib/utils.ts`
Keep prompt-building logic out of components — add new prompt builders here.

**Components -> Hooks (prop drilling):**
`TerritoryPlanner` calls all hooks and passes data + mutation functions down to child components via props. There is no shared context for prospect data — components like `ProspectSheet` receive `data`, `update`, `remove`, `addContact`, `updateContact`, `removeContact`, `addInteraction`, `updateInteraction`, `removeInteraction`, `addNote`, `updateNote`, `deleteNote`, `addTask`, `updateTask`, `removeTask`, `signals`, etc. as individual props.

**Sub-collection writes go through per-row CRUD:**
Since March 2026, `useProspects.update()` **intentionally ignores** `contacts`, `interactions`, `noteLog`, and `tasks` fields. Never pass these to `update()`. Use:
- Contacts: `addContact`, `updateContact`, `removeContact`
- Interactions: `addInteraction`, `updateInteraction`, `removeInteraction`
- Notes: `addNote`, `updateNote`, `deleteNote`
- Tasks: `addTask`, `updateTask`, `removeTask`

**Import patterns:**
- Path alias: `@/` maps to `src/`
- Components import from `@/components/ui/` for primitives
- Components import from `@/data/prospects` for types / constants
- Components import from `@/hooks/` for data hooks
- Components import from `@/lib/utils` for `cn()`, `@/lib/buildContactPrompt` / `@/lib/pendingBatch` as needed
- Icons always from `lucide-react`
- No circular dependencies detected

**Edge Functions are isolated:**
`supabase/functions/` contains Deno-based edge functions with their own import patterns. They share no code with the frontend `src/` directory.

## Configuration Files

| File | Purpose |
|------|---------|
| `components.json` | shadcn/ui configuration (default style, slate base color, CSS variables, aliases) |
| `tailwind.config.ts` | Tailwind CSS with custom theme extensions + animations |
| `vite.config.ts` | Vite build (dev port 8080, `@/` alias, SWC, HMR overlay off) |
| `vitest.config.ts` | Vitest (jsdom env, globals enabled, setup file `src/test/setup.ts`) |
| `tsconfig.json` / `tsconfig.app.json` / `tsconfig.node.json` | TypeScript configs; strict mode is **disabled** |
| `eslint.config.js` | ESLint flat config; `@typescript-eslint/no-unused-vars` off |
| `postcss.config.js` | PostCSS with Tailwind + autoprefixer |
| `package.json` | Dependencies + scripts |
| `supabase/config.toml` | Supabase project configuration (if present) |

## Naming Conventions

**Files:**
- Pages: `PascalCase.tsx` (e.g., `ProspectPage.tsx`, `InsightsPage.tsx`)
- Components: `PascalCase.tsx` (e.g., `ProspectSheet.tsx`, `AddProspectDialog.tsx`)
- Hooks: `camelCase.ts` or `camelCase.tsx` prefixed with `use` (e.g., `useProspects.ts`, `useAuth.tsx`)
- Exception: `use-mobile.tsx` and `use-toast.ts` use kebab-case (shadcn convention)
- UI primitives: `kebab-case.tsx` in `src/components/ui/` (shadcn convention)
- Data / utils: `camelCase.ts` (e.g., `prospects.ts`, `utils.ts`, `buildContactPrompt.ts`, `pendingBatch.ts`)
- Test files: `<name>.test.ts` or `<name>.test.tsx` co-located with source

**Directories:**
- All lowercase: `pages/`, `components/`, `hooks/`, `data/`, `lib/`, `integrations/`, `test/`
- Exception: `brand/` subdirectory under `components/` for brand-specific components (e.g., Wordmark)

## Where to Add New Code

**New page / route:**
1. Create component in `src/pages/NewPage.tsx`
2. Add route in `src/App.tsx` (wrap with `<ProtectedRoute>` if auth-required)
3. Add navigation link in `src/components/TerritoryPlanner.tsx` header nav

**New feature component (dialog, sheet, section):**
1. Create in `src/components/NewFeature.tsx`
2. Import and render from the parent that owns it (usually `TerritoryPlanner.tsx` or a page)
3. Pass data + mutation functions via props from the parent hook consumer
4. Co-locate a `.test.tsx` next to the component if it has non-trivial logic

**New brand / identity element:**
- Place in `src/components/brand/` (see `Wordmark.tsx` for pattern)

**New data hook:**
1. Create in `src/hooks/useNewHook.ts` (or `.tsx` if it exports a provider)
2. Import `supabase` from `@/integrations/supabase/client`
3. Import `useAuth` from `@/hooks/useAuth` for user context
4. Follow existing pattern: `useState` for data, `useCallback` for mutations, `useEffect` for initial load
5. For mutations: snapshot previous state, optimistic update, write to Supabase, roll back + `toast.error` on failure
6. Return data + mutation functions

**New domain types / constants:**
1. Add to `src/data/prospects.ts` if prospect-related
2. For new domain entities (like `Signal`, `Opportunity`), define interface + constants at the top of the corresponding hook file or introduce a new file in `src/data/`

**New pure-logic helper (prompts, formatters, storage):**
1. Add to `src/lib/`
2. Co-locate a `.test.ts` alongside it — pure modules are our highest-coverage targets

**New shadcn/ui component:**
1. Use CLI: `bunx shadcn@latest add <component>` (or npx)
2. Check `components.json` for configuration
3. Do not modify files in `src/components/ui/` directly

**New Supabase Edge Function:**
1. Create directory `supabase/functions/function-name/`
2. Add `index.ts` with Deno-compatible code
3. Invoke from frontend via `supabase.functions.invoke("function-name", { body: {...} })`
4. Invocation site should live in a component that owns the relevant UI; over time, consider extracting to a hook if the same function is called from multiple places

**New utility function:**
- General utilities (class-merge, URL): `src/lib/utils.ts`
- Prospect-specific logic: `src/data/prospects.ts`
- Prompt construction: new file in `src/lib/` (see `buildContactPrompt.ts`)
- localStorage helpers: new file in `src/lib/` (see `pendingBatch.ts`)

## Special Directories

**`src/components/ui/`:**
- Purpose: shadcn/ui component library (50 files)
- Generated: Yes (via shadcn CLI)
- Committed: Yes
- Rule: Do not modify directly — re-run shadcn CLI to update

**`src/components/brand/`:**
- Purpose: Brand / identity components (Wordmark and similar)
- Generated: No
- Committed: Yes

**`supabase/migrations/`:**
- Purpose: Database schema migrations
- Generated: Partially (some via Lovable platform)
- Committed: Yes (11 files as of April 2026)
- Rule: Append-only — never modify existing migration files

**`src/integrations/supabase/`:**
- Purpose: Supabase client + auto-generated DB types
- Generated: `types.ts` is auto-generated; `client.ts` is manual
- Committed: Yes

**`src/integrations/lovable/`:**
- Purpose: Lovable Cloud OAuth adapter
- Generated: Yes (auto-generated by Lovable, do not modify)
- Committed: Yes

**`supabase/functions/`:**
- Purpose: Supabase Edge Functions (Deno runtime, 8 functions)
- Generated: No
- Committed: Yes
- Note: These run server-side on Supabase infrastructure, not in the browser

**`src/test/`:**
- Purpose: Vitest setup + sample tests
- Generated: No
- Committed: Yes

---

*Structure analysis: 2026-04-24*

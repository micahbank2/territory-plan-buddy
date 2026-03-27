# Codebase Structure

**Analysis Date:** 2026-03-26

## Directory Layout

```
territory-plan-buddy/
├── src/
│   ├── assets/                 # Static images (Yext logos)
│   ├── components/
│   │   ├── ui/                 # shadcn/ui primitives (49 components, DO NOT modify)
│   │   ├── TerritoryPlanner.tsx  # Main app shell (2194 lines)
│   │   ├── ProspectSheet.tsx     # Prospect detail slide-over (989 lines)
│   │   ├── EnrichmentQueue.tsx   # AI enrichment batch UI (925 lines)
│   │   ├── AddProspectDialog.tsx # New prospect form (764 lines)
│   │   ├── CSVUploadDialog.tsx   # CSV import with mapping (741 lines)
│   │   ├── PasteImportDialog.tsx # Paste-based import (445 lines)
│   │   ├── OpportunitySheet.tsx  # Deal detail slide-over (442 lines)
│   │   ├── OpportunityKanban.tsx # Deal kanban board (292 lines)
│   │   ├── ShareTerritoryDialog.tsx # Territory sharing (331 lines)
│   │   ├── AIReadinessCard.tsx   # AI readiness display (311 lines)
│   │   ├── SignalsSection.tsx    # Buying signals (283 lines)
│   │   ├── BulkOutreachQueue.tsx # Batch outreach (202 lines)
│   │   ├── BulkEditDialog.tsx    # Multi-select edits (148 lines)
│   │   ├── MultiSelect.tsx       # Filter multi-select (standalone)
│   │   ├── ContactBadges.tsx     # Role/strength badges
│   │   ├── AccountCombobox.tsx   # Prospect search combobox (133 lines)
│   │   ├── PublicTerritoryView.tsx # Public share view (166 lines)
│   │   ├── NavLink.tsx           # Navigation link component
│   │   ├── RichTextEditor.tsx    # Rich text for notes
│   │   └── StakeholderMap.tsx    # Contact relationship viz
│   ├── data/
│   │   └── prospects.ts          # Types, constants, scoring, seed data (612 lines)
│   ├── hooks/
│   │   ├── useProspects.ts       # Prospect CRUD + sub-collections (580 lines)
│   │   ├── useTerritories.ts     # Territory CRUD + members (206 lines)
│   │   ├── useOpportunities.ts   # Opportunity CRUD (105 lines)
│   │   ├── useSignals.ts         # Signal CRUD (113 lines)
│   │   ├── useAuth.tsx           # Auth context + provider (77 lines)
│   │   ├── use-mobile.ts         # Viewport detection
│   │   └── use-toast.ts          # Toast state (186 lines)
│   ├── integrations/
│   │   ├── supabase/
│   │   │   ├── client.ts         # Supabase singleton client
│   │   │   └── types.ts          # Auto-generated DB types (591 lines)
│   │   └── lovable/
│   │       └── ...               # Lovable platform integration
│   ├── lib/
│   │   └── utils.ts              # cn() + normalizeUrl() helpers
│   ├── pages/
│   │   ├── Index.tsx             # Dashboard (thin wrapper -> TerritoryPlanner)
│   │   ├── ProspectPage.tsx      # Full-page prospect view (923 lines)
│   │   ├── OpportunitiesPage.tsx # Deal pipeline (738 lines)
│   │   ├── InsightsPage.tsx      # Analytics/charts (543 lines)
│   │   ├── TodayPage.tsx         # Daily briefing (282 lines)
│   │   ├── MyNumbersPage.tsx     # Quota tracking (247 lines)
│   │   ├── SignalsPage.tsx       # Signals view (214 lines, redirects to /insights)
│   │   ├── LandingPage.tsx       # Public landing (170 lines)
│   │   ├── AuthPage.tsx          # Login/signup (163 lines)
│   │   ├── ResetPasswordPage.tsx # Password reset
│   │   ├── ShareJoinPage.tsx     # Territory invite join
│   │   └── NotFound.tsx          # 404
│   ├── test/
│   │   └── ...                   # Test utilities
│   ├── App.tsx                   # Provider tree + routes (77 lines)
│   ├── main.tsx                  # React DOM mount (5 lines)
│   └── index.css                 # Global styles + custom classes
├── supabase/
│   ├── functions/
│   │   ├── ai-readiness/index.ts       # AI readiness scoring
│   │   ├── draft-outreach/index.ts     # Email draft generation
│   │   ├── meeting-prep/index.ts       # Meeting brief generation
│   │   ├── enrich-prospect/index.ts    # Prospect enrichment
│   │   ├── enrich-prospect-add/index.ts # Enrichment + add
│   │   ├── categorize-signal/index.ts  # Signal categorization
│   │   └── chat/index.ts              # Conversational AI
│   └── migrations/                     # 9 SQL migration files
├── public/                             # Static assets
├── components.json                     # shadcn/ui config
├── tailwind.config.ts                  # Tailwind configuration
├── vite.config.ts                      # Vite build config
├── vitest.config.ts                    # Vitest test config
├── tsconfig.json                       # TypeScript config (base)
├── tsconfig.app.json                   # TypeScript config (app)
├── tsconfig.node.json                  # TypeScript config (node)
├── eslint.config.js                    # ESLint config
├── postcss.config.js                   # PostCSS config
└── package.json                        # Dependencies + scripts
```

## Key Files

| File | Purpose | Lines | Complexity |
|------|---------|-------|------------|
| `src/components/TerritoryPlanner.tsx` | Main app shell: table, filters, sorting, inline editing, all dialogs | 2194 | Very High -- god component, needs extraction |
| `src/components/ProspectSheet.tsx` | Slide-over prospect detail panel | 989 | High -- long vertical scroll, many sections |
| `src/components/EnrichmentQueue.tsx` | AI enrichment batch processing UI | 925 | High -- async queue management |
| `src/pages/ProspectPage.tsx` | Full-page prospect view (alternative to sheet) | 923 | High -- duplicates some ProspectSheet logic |
| `src/components/AddProspectDialog.tsx` | New prospect creation form | 764 | Medium -- form with many fields |
| `src/components/CSVUploadDialog.tsx` | CSV import with column mapping | 741 | High -- file parsing + preview |
| `src/data/prospects.ts` | Domain types, constants, scoring, seed data | 612 | Medium -- pure functions + large seed array |
| `src/integrations/supabase/types.ts` | Auto-generated DB types | 591 | Low -- generated, read-only |
| `src/hooks/useProspects.ts` | All prospect data operations | 580 | High -- CRUD + sub-collection sync + optimistic updates |
| `src/pages/OpportunitiesPage.tsx` | Deal pipeline table + kanban views | 738 | Medium -- two view modes |
| `src/pages/InsightsPage.tsx` | Analytics charts | 543 | Medium -- chart compositions |
| `src/App.tsx` | Provider tree + route definitions | 77 | Low -- boilerplate |
| `src/hooks/useAuth.tsx` | Auth context with token refresh guard | 77 | Low -- well-scoped |
| `src/lib/utils.ts` | cn() and normalizeUrl() | 13 | Low |

## Module Boundaries

**Hook -> Supabase (clean boundary):**
All Supabase calls go through hooks in `src/hooks/`. Components should never import `supabase` directly for data queries. Exception: `src/components/ProspectSheet.tsx` calls `supabase.functions.invoke()` directly for edge functions -- this is a boundary violation but pragmatic.

**Data model is centralized:**
`src/data/prospects.ts` is the single source for all domain types and constants. Hooks and components both import from here. Do not duplicate type definitions elsewhere.

**Components -> Hooks (prop drilling):**
`TerritoryPlanner` calls all hooks and passes data + mutation functions down to child components via props. There is no shared context for prospect data -- this means components like `ProspectSheet` receive `data`, `update`, `remove`, `addContact`, `updateContact`, `removeContact`, `signals`, etc. as individual props.

**Import patterns:**
- Path alias: `@/` maps to `src/`
- Components import from `@/components/ui/` for primitives
- Components import from `@/data/prospects` for types/constants
- Components import from `@/hooks/` for data hooks
- Components import from `@/lib/utils` for `cn()`
- Icons always from `lucide-react`
- No circular dependencies detected

**Edge Functions are isolated:**
`supabase/functions/` contains Deno-based edge functions with their own import patterns. They share no code with the frontend `src/` directory.

## Configuration Files

| File | Purpose |
|------|---------|
| `components.json` | shadcn/ui component configuration (aliases, styling approach) |
| `tailwind.config.ts` | Tailwind CSS configuration with custom theme extensions |
| `vite.config.ts` | Vite build configuration with path aliases |
| `vitest.config.ts` | Vitest test runner configuration |
| `tsconfig.json` | Base TypeScript configuration |
| `tsconfig.app.json` | App-specific TypeScript config (extends base) |
| `tsconfig.node.json` | Node/tooling TypeScript config (extends base) |
| `eslint.config.js` | ESLint linting rules |
| `postcss.config.js` | PostCSS with Tailwind and autoprefixer |
| `package.json` | Dependencies, scripts, project metadata |
| `supabase/config.toml` | Supabase project configuration (if present) |

## Naming Conventions

**Files:**
- Pages: `PascalCase.tsx` (e.g., `ProspectPage.tsx`, `InsightsPage.tsx`)
- Components: `PascalCase.tsx` (e.g., `ProspectSheet.tsx`, `AddProspectDialog.tsx`)
- Hooks: `camelCase.ts` or `camelCase.tsx` prefixed with `use` (e.g., `useProspects.ts`, `useAuth.tsx`)
- UI primitives: `kebab-case.tsx` in `src/components/ui/` (shadcn convention)
- Data/utils: `camelCase.ts` (e.g., `prospects.ts`, `utils.ts`)

**Directories:**
- All lowercase: `pages/`, `components/`, `hooks/`, `data/`, `lib/`, `integrations/`

## Where to Add New Code

**New page/route:**
1. Create component in `src/pages/NewPage.tsx`
2. Add route in `src/App.tsx` (wrap with `<ProtectedRoute>` if auth-required)
3. Add navigation link in `src/components/TerritoryPlanner.tsx` header nav

**New feature component (dialog, sheet, section):**
1. Create in `src/components/NewFeature.tsx`
2. Import and render from the parent that owns it (usually `TerritoryPlanner.tsx` or a page)
3. Pass data + mutation functions via props from the parent hook consumer

**New data hook:**
1. Create in `src/hooks/useNewHook.ts`
2. Import `supabase` from `@/integrations/supabase/client`
3. Import `useAuth` from `@/hooks/useAuth` for user context
4. Follow existing pattern: `useState` for data, `useCallback` for mutations, `useEffect` for initial load
5. Return data + mutation functions

**New domain types/constants:**
1. Add to `src/data/prospects.ts` if prospect-related
2. For new domain entities, consider a new file in `src/data/`

**New shadcn/ui component:**
1. Use CLI: `npx shadcn@latest add <component>`
2. Check `components.json` for configuration
3. Do not modify files in `src/components/ui/` directly

**New Supabase Edge Function:**
1. Create directory `supabase/functions/function-name/`
2. Add `index.ts` with Deno-compatible code
3. Invoke from frontend via `supabase.functions.invoke("function-name", { body: {...} })`

**New utility function:**
1. Add to `src/lib/utils.ts` for general utilities
2. Add to `src/data/prospects.ts` for prospect-specific logic

## Special Directories

**`src/components/ui/`:**
- Purpose: shadcn/ui component library
- Generated: Yes (via shadcn CLI)
- Committed: Yes
- Rule: Do not modify directly -- re-run shadcn CLI to update

**`supabase/migrations/`:**
- Purpose: Database schema migrations
- Generated: Partially (some via Lovable platform)
- Committed: Yes
- Rule: Append-only -- never modify existing migration files

**`src/integrations/supabase/`:**
- Purpose: Auto-generated Supabase client + types
- Generated: `types.ts` is auto-generated; `client.ts` is manual
- Committed: Yes

**`supabase/functions/`:**
- Purpose: Supabase Edge Functions (Deno runtime)
- Generated: No
- Committed: Yes
- Note: These run server-side on Supabase infrastructure, not in the browser

---

*Structure analysis: 2026-03-26*

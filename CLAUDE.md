# Territory Plan Buddy — CLAUDE.md

This file gives you full context on the codebase. Read it before making any changes.

---

## What This Is

A territory planning tool for a Yext Senior AE (Micah, Mid-Enterprise North). Manages 300+ multi-location brand prospects across verticals: QSR, retail, franchise, automotive, property management. Backed by Supabase, deployed via Lovable, GitHub-connected for Claude Code edits.

This is a personal productivity tool, not a public SaaS product. Optimizations should favor speed and workflow over generalization.

---

## Tech Stack

- **React + TypeScript** via Vite
- **Tailwind CSS** for styling — use utility classes, avoid arbitrary values where possible
- **shadcn/ui** for base components (Button, Dialog, Sheet, etc.) — check components.json before adding new UI
- **Supabase** for database + auth (Lovable Cloud instance — no direct CLI access)
- **React Router v6** for routing
- **TanStack Query** is installed but underused — currently most data fetching is in custom hooks
- **next-themes** for dark/light mode
- **sonner** for toasts
- **date-fns** for date formatting
- **lucide-react** for icons

---

## File Structure

```
src/
  pages/
    Index.tsx              → thin wrapper, renders <TerritoryPlanner />
    ProspectPage.tsx       → full-page view for a single prospect
    InsightsPage.tsx       → analytics/charts view
    OpportunitiesPage.tsx  → deal pipeline table
    AuthPage.tsx
    LandingPage.tsx
    ShareJoinPage.tsx
  components/
    TerritoryPlanner.tsx   → main app shell (~1000 lines, the core UI)
    ProspectSheet.tsx      → slide-over panel for prospect detail
    OpportunitySheet.tsx   → slide-over for deal detail
    AddProspectDialog.tsx
    CSVUploadDialog.tsx
    PasteImportDialog.tsx
    BulkEditDialog.tsx
    ShareTerritoryDialog.tsx
    EnrichmentQueue.tsx
    AIReadinessCard.tsx
    SignalsSection.tsx
    MultiSelect.tsx
    ContactBadges.tsx
    AccountCombobox.tsx
    ui/                    → shadcn components, don't modify directly
  hooks/
    useProspects.ts        → all prospect CRUD, Supabase sync
    useOpportunities.ts    → deal CRUD
    useTerritories.ts      → territory management + sharing
    useSignals.ts          → buying signals per prospect
    useAuth.ts
    use-mobile.ts
  data/
    prospects.ts           → data model, scoring logic, seed data (309 accounts)
  integrations/
    supabase/client.ts     → Supabase client
  assets/
    yext-logo-black.jpg
    yext-logo-white.jpg
```

---

## Database Schema

### prospects
| column | type | notes |
|--------|------|-------|
| id | uuid PK | |
| user_id | uuid | FK to auth.users |
| territory_id | uuid | FK to territories, nullable |
| name | text | |
| website | text | used for favicon via Google S2 |
| status | text | "Prospect" or "Churned" |
| industry | text | see INDUSTRIES constant |
| location_count | int | null = unknown |
| location_notes | text | e.g. "CLOSED" triggers score penalty |
| outreach | text | see STAGES constant |
| priority | text | "Hot", "Warm", "Cold", "Dead", or "" |
| tier | text | "Tier 1"-"Tier 4" or "" |
| competitor | text | see COMPETITORS constant |
| notes | text | legacy single note field |
| last_touched | date | auto-updated on any update() call |
| estimated_revenue | int | nullable |
| contact_name | text | legacy, use prospect_contacts instead |
| contact_email | text | legacy |
| custom_logo | text | base64 image string |
| ai_readiness_score | int | nullable, 0-100 |
| ai_readiness_grade | text | nullable |
| ai_readiness_data | jsonb | {summary, strengths, risks, yext_opportunity, talking_point} |
| ai_readiness_updated_at | timestamptz | |
| created_at | timestamptz | |

### prospect_contacts
| column | type |
|--------|------|
| id | uuid PK |
| prospect_id | uuid FK |
| user_id | uuid FK |
| name | text |
| title | text |
| email | text |
| phone | text |
| notes | text |
| role | text | "Champion", "Decision Maker", "Influencer", "Technical Evaluator", "Blocker", "End User", "Executive Sponsor", "Unknown" |
| relationship_strength | text | "Strong", "Warm", "Cold", "At Risk", "Unknown" |

### prospect_interactions
| column | type |
|--------|------|
| id | uuid PK |
| prospect_id | uuid FK |
| user_id | uuid FK |
| type | text | "Email", "Call", "LinkedIn Message", "Task Completed" |
| date | date | YYYY-MM-DD string |
| notes | text |

### prospect_notes
| column | type |
|--------|------|
| id | uuid PK |
| prospect_id | uuid FK |
| user_id | uuid FK |
| text | text |
| timestamp | timestamptz |

### prospect_tasks
| column | type |
|--------|------|
| id | uuid PK |
| prospect_id | uuid FK |
| user_id | uuid FK |
| text | text |
| due_date | date | nullable |

### opportunities
| column | type | notes |
|--------|------|-------|
| id | uuid PK | |
| territory_id | uuid FK | |
| user_id | uuid FK | |
| name | text | |
| type | text | "Net New", "Renewal", "Order Form" |
| potential_value | int | ACV in dollars |
| stage | text | see OPP_STAGES |
| products | text | e.g. "Listings, Pages, Reviews" |
| point_of_contact | text | |
| notes | text | |
| close_date | date | |
| prospect_id | uuid | nullable FK to prospects |
| created_at | timestamptz | |

### territories
| column | type |
|--------|------|
| id | uuid PK |
| name | text |
| owner_id | uuid FK |
| created_at | timestamptz |

### territory_members
| column | type | notes |
|--------|------|-------|
| territory_id | uuid FK | |
| user_id | uuid FK | |
| role | text | "owner", "editor", "viewer" |

### signals
Buying signals attached to prospects. Referenced via `useSignals` hook.

---

## Data Model — Key Types

```typescript
interface Prospect {
  id: uuid
  name: string
  website: string
  status: "Prospect" | "Churned"
  industry: string           // from INDUSTRIES constant
  locationCount: number | null
  outreach: string           // from STAGES constant
  priority: string           // "Hot" | "Warm" | "Cold" | "Dead" | ""
  tier: string               // "Tier 1" | "Tier 2" | "Tier 3" | "Tier 4" | ""
  competitor: string         // from COMPETITORS constant
  contacts: Contact[]
  interactions: InteractionLog[]
  noteLog: NoteEntry[]
  tasks: Task[]
  aiReadinessScore?: number | null
  aiReadinessData?: AIReadinessData | null
  customLogo?: string        // base64
  lastTouched: string | null // YYYY-MM-DD, auto-updated
}

// nextStep and nextStepDate are DEPRECATED — use tasks[] instead
```

---

## Scoring System

Lives in `src/data/prospects.ts`. Score = sum of these factors:

| Condition | Points |
|-----------|--------|
| 500+ locations | +40 |
| 100+ locations | +30 |
| 50+ locations | +20 |
| 1+ locations | +10 |
| High-value industry (QSR, Grocery, Casual Dining, Gas, Hotels, Healthcare, Car Wash) | +20 |
| Outreach: Meeting Booked | +15 |
| Outreach: Actively Prospecting | +5 |
| Priority: Hot | +25 |
| Priority: Warm | +10 |
| Priority: Dead | -30 |
| Status: Churned | -10 |
| locationCount=0 AND locationNotes contains "CLOSED" | -50 |

Score labels: 60+ = Excellent (A+), 40+ = Strong (A), 20+ = Moderate (B), 1+ = Low (C), 0 = Needs Work (D)

**The score is currently just displayed — it does not drive recommended actions. This is a known gap to fix.**

---

## Key Constants (src/data/prospects.ts)

```typescript
STAGES = ["Not Started", "Actively Prospecting", "Meeting Booked", "Closed Lost", "Closed Won"]
PRIORITIES = ["", "Hot", "Warm", "Cold", "Dead"]
TIERS = ["", "Tier 1", "Tier 2", "Tier 3", "Tier 4"]
INDUSTRIES = [...26 verticals...]
COMPETITORS = ["", "SOCi", "Yext", "Birdeye", "Podium", "Reputation.com", "Uberall", "Rio SEO", "Chatmeter", "Unknown", "Other"]
CONTACT_ROLES = ["Unknown", "Champion", "Decision Maker", "Influencer", "Technical Evaluator", "Blocker", "End User", "Executive Sponsor"]
RELATIONSHIP_STRENGTHS = ["Unknown", "Strong", "Warm", "Cold", "At Risk"]
OPP_STAGES = ["Develop", "Discovery", "Business Alignment", "Validate", "Propose", "Negotiate", "Won", "Closed Won", "Closed Lost", "Dead"]
OPP_TYPES = ["Net New", "Renewal", "Order Form"]
```

---

## Hooks — How Data Flows

### useProspects(territoryId?)
The main data hook. Returns:
- `data: Prospect[]` — all prospects for territory
- `ok: boolean` — whether initial load completed
- `update(id, Partial<Prospect>)` — handles sub-collections (contacts, interactions, noteLog, tasks) by full replace
- `add(partial)` → returns new uuid
- `remove(id)` — hard delete (no soft delete currently)
- `bulkUpdate(ids[], changes)` — only handles top-level prospect fields
- `bulkAdd(partials[])` — batch insert, no sub-collections
- `bulkMerge(updates[])` — merge with sub-collection support
- `seedData()` — owner-only, imports 309 seed accounts
- `deleteNote(prospectId, noteId)`
- `addNote(prospectId, text)`

**Important:** `update()` does a full replace on sub-collections. If you pass `contacts: [...]`, it deletes all existing contacts and re-inserts. Don't pass sub-collections unless you mean to replace them entirely.

### useOpportunities(territoryId)
- `opportunities: Opportunity[]`
- `add(partial)`, `update(id, partial)`, `remove(id)`
- Requires territoryId — returns empty if null

### useTerritories()
- `territories[]`, `activeTerritory: string | null`
- `myRole: "owner" | "editor" | "viewer"`
- `switchTerritory(id)`, `createTerritory(name)`
- `inviteMember(email, role)`, `removeMember(userId)`, `updateMemberRole(userId, role)`

---

## Component Patterns

### Inline editing
Triple state: display → editing (click/double-click) → saved (blur/enter). Pattern in TerritoryPlanner.tsx:
```tsx
{editingCell?.id === p.id && editingCell?.field === "industry" ? (
  <select autoFocus onBlur={() => setEditingCell(null)} ... />
) : (
  <span onClick={() => setEditingCell({ id: p.id, field: "industry" })} ... />
)}
```

### Logo display
`getLogoUrl(website, size)` uses Google S2 favicons. Falls back to `<Building2>` icon. Supports custom base64 logo via `customLogo` field.

### ProspectSheet
Slide-over panel (Sheet on desktop, Drawer on mobile). Opens via `sheetProspectId` state in TerritoryPlanner. This is where most per-account work happens. Currently a long vertical scroll — tabbed layout is a planned improvement.

### Aging dots
Color-coded last-contact indicator. Green = <7 days, Yellow = 7-30 days, Red = 30+ days, Gray = never contacted. Class names: `aging-green`, `aging-yellow`, `aging-red`, `aging-gray`.

---

## Known Patterns & Gotchas

1. **Sub-collection replace**: `update(id, { contacts: [...] })` replaces ALL contacts. Always pass the full array including unchanged items.

2. **Optimistic updates**: All hooks update local state immediately, then sync to Supabase. If Supabase fails, local state is stale until next reload. No error recovery currently.

3. **territoryId can be null**: `useOpportunities` returns empty if territoryId is null. `useProspects` without territoryId falls back to user-owned prospects.

4. **Owner-only features**: `seedData()`, reset data, and some admin actions are gated by `OWNER_EMAILS = ["micahbank2@gmail.com", "mbank@yext.com"]`.

5. **TerritoryPlanner.tsx is ~1000 lines**: All state, filtering, views, dialogs live here. Extract to sub-components when adding new features, don't make it bigger.

6. **Deprecated fields**: `nextStep` and `nextStepDate` on Prospect are deprecated. All task data lives in `tasks[]`. The migration in `initProspect()` handles old data.

7. **CSS custom classes**: Several non-Tailwind classes exist in the CSS: `glass-card`, `glow-blue`, `aging-dot`, `aging-green/yellow/red/gray`, `skeleton-shimmer`, `gradient-text`, `yext-grid-bg`, `pipeline-segment`, `kanban-card`, `row-hover-lift`, `overdue-flag`, `delete-glow`, `inline-edit-cell`. Don't remove these.

8. **Score does not drive actions**: The scoring system produces a number but nothing downstream uses it to suggest actions. This is intentional tech debt to address.

9. **Archive is simplified**: The `restore` and `permanentDelete` functions in useProspects are stubs (`() => {}`). Archive is visual only — items are hard deleted.

---

## Priority Build Roadmap

Work on these in order. Do NOT skip ahead.

### 1. CLAUDE.md (this file) ✅
### 2. Log + Next Step — single interaction widget in ProspectSheet
One action captures: interaction type, notes, and creates a follow-up task. Currently requires scrolling to two separate sections. Target: a single "Log Activity" widget that does both in one submit.

### 3. AI Outreach Drafting in ProspectSheet
Button that calls Anthropic API with full prospect context (name, industry, locationCount, competitor, tier, contacts, recent interactions) and returns a draft first-touch email. Uses cold-email-ae skill logic. Add as a tab or collapsible section in ProspectSheet.

### 4. Daily Briefing Artifact
Claude reads Supabase data and generates a single HTML page: overdue tasks, stale accounts, pipeline movement, what to do today. No app to open, just a bookmark.

### 5. Score → Recommended Action
Surface a "Why call this account" block in ProspectSheet header using score breakdown data + contact coverage gaps + staleness. Example: "Score 82 — missing Decision Maker, 45 days since last touch, competing with SOCi."

### 6. Supabase MCP
Point at territory database for conversational querying. Blocked on Lovable Cloud credential access — revisit.

### 7. Weighted Pipeline Forecast in Opportunities
Stage-weighted ACV: Propose=70%, Validate=50%, Discovery=20%, Develop=10%. Add forecast bar above the table and quota tracker.

### 8. Meeting Prep Skill
Takes prospect ID, outputs one-page brief: context, history, contacts, tasks, talking points, suggested ask.

### 9. Firecrawl Enrichment
Replace manual enrichment queue with Firecrawl-powered flow. No company quota limits.

### 10. My Numbers Tab
Quota attainment, activity rate, pipeline coverage tracked over time.

---

## Yext Context (for AI-assisted features)

Micah is a Senior AE at Yext, Mid-Enterprise North territory. Key Yext products: Listings, Pages, Reviews, Search (Scout), Reputation Management, Analytics. Primary competitors: SOCi, Birdeye, Uberall, Chatmeter, Rio SEO. Target verticals: QSR/Fast Casual, Grocery, Auto Dealerships, Car Wash, Multifamily, Healthcare. Top current accounts/prospects: Shake Shack (win-back, April 1 meeting), Dollar Tree, Morgan Properties, Goddard Schools, Charleys Philly Steaks. RVP: Lauren Goldman. SE: Zoe Byerly.

When generating outreach or meeting prep, position Yext around: AI search visibility, multi-location brand consistency, local SEO at scale, competitive displacement of SOCi/Birdeye.

---

## Environment

- Node via Bun
- Vite dev server
- Supabase client at `src/integrations/supabase/client.ts`
- Anthropic API available for in-app AI features (call via fetch to `/v1/messages`, key handled by environment)
- Deployed on Lovable Cloud, GitHub-connected — push to main triggers deploy

<!-- GSD:project-start source:PROJECT.md -->
## Project

**Territory Plan Buddy — Hardening & Polish**

A quality, reliability, and UX improvement pass on Territory Plan Buddy — a personal territory planning tool for a Yext Senior AE managing 300+ multi-location brand prospects. This project focuses on fixing data integrity risks, modernizing the component architecture, adding test coverage, and building in-app AI-assisted outreach/research capabilities.

**Core Value:** The app must never silently lose data. Every edit the user makes must either persist to Supabase or visibly fail with a clear error.

### Constraints

- **Deployment**: Lovable Cloud — push to main triggers deploy, no custom CI
- **Database**: Supabase Cloud instance — no direct migration CLI, schema changes via dashboard
- **No backend server**: All data access is client → Supabase SDK, AI calls via Edge Functions
- **Personal tool**: Single active user (Micah), shared territories with viewer/editor roles
- **Package manager**: Bun
<!-- GSD:project-end -->

<!-- GSD:stack-start source:codebase/STACK.md -->
## Technology Stack

## Languages
- TypeScript ^5.8.3 - All application code (`src/**/*.ts`, `src/**/*.tsx`)
- TSX - React components
- CSS - Custom styles in `src/index.css` (Tailwind + custom classes)
- Target: ES2020
- Strict mode: **disabled** (`strict: false` in `tsconfig.app.json`)
- `noImplicitAny`: disabled
- Path alias: `@/*` maps to `./src/*`
## Runtime
- Bun (package manager and runtime)
- Browser (SPA, no SSR)
- Bun
- Lockfiles: `bun.lock` and `bun.lockb` present
## Frameworks
- React ^18.3.1 - UI framework
- Vite ^5.4.19 - Build tool and dev server (SWC plugin via `@vitejs/plugin-react-swc`)
- React Router DOM ^6.30.1 - Client-side routing
- Tailwind CSS ^3.4.17 - Utility-first styling
- shadcn/ui (default style, slate base color, CSS variables) - Component library
- next-themes ^0.3.0 - Dark/light mode toggle
- lucide-react ^0.462.0 - Icons
- TanStack React Query ^5.83.0 - Installed but underused; most fetching in custom hooks
- @supabase/supabase-js ^2.98.0 - Database client
- Vitest ^3.2.4 - Test runner (jsdom environment)
- @testing-library/react ^16.0.0 - Component testing
- @testing-library/jest-dom ^6.6.0 - DOM matchers
- Config: `vitest.config.ts`, setup file: `src/test/setup.ts`
- @vitejs/plugin-react-swc ^3.11.0 - Fast React transforms
- lovable-tagger ^1.1.13 - Dev-only component tagging (Lovable platform)
- PostCSS ^8.5.6 + Autoprefixer ^10.4.21 - CSS processing
- ESLint ^9.32.0 + typescript-eslint ^8.38.0 - Linting
## Key Dependencies
- `@supabase/supabase-js` ^2.98.0 - All data persistence and auth
- `react-router-dom` ^6.30.1 - Page routing
- `sonner` ^1.7.4 - Toast notifications (used throughout for user feedback)
- `date-fns` ^3.6.0 - Date formatting and manipulation
- `recharts` ^2.15.4 - Charts on InsightsPage
- `react-hook-form` ^7.61.1 + `@hookform/resolvers` ^3.10.0 + `zod` ^3.25.76 - Form validation
- `vaul` ^0.9.9 - Mobile drawer (used by ProspectSheet on mobile)
- `cmdk` ^1.1.1 - Command palette / combobox
- `react-day-picker` ^8.10.1 - Date picker
- `embla-carousel-react` ^8.6.0 - Carousel component
- `react-resizable-panels` ^2.1.9 - Resizable panel layouts
- `react-markdown` ^10.1.0 - Markdown rendering (AI readiness data)
- `input-otp` ^1.4.2 - OTP input component
- `@tiptap/react` ^3.20.5 + `@tiptap/starter-kit` ^3.20.5 + `@tiptap/pm` ^3.20.5 - Rich text editor
- `@dnd-kit/core` ^6.3.1 + `@dnd-kit/sortable` ^10.0.0 + `@dnd-kit/utilities` ^3.2.2 - Drag-and-drop (kanban board)
- `class-variance-authority` ^0.7.1 - Component variant management (shadcn pattern)
- `clsx` ^2.1.1 + `tailwind-merge` ^2.6.0 - Class name utilities
- `tailwindcss-animate` ^1.0.7 - Animation utilities
- `@lovable.dev/cloud-auth-js` ^0.0.3 - Lovable Cloud authentication integration
## Configuration
- `.env` file present
- `VITE_SUPABASE_URL` - Supabase project URL
- `VITE_SUPABASE_PUBLISHABLE_KEY` - Supabase anon/public key
- `VITE_ANTHROPIC_API_KEY` - Anthropic API key for AI features
- `vite.config.ts` - Dev server on port 8080, `@` path alias, HMR overlay disabled
- `tailwind.config.ts` - shadcn color system via CSS variables, custom keyframes
- `postcss.config.js` - Tailwind + Autoprefixer
- `tsconfig.app.json` - Lenient TS settings (no strict, no unused checks)
- `eslint.config.js` - Flat config, recommended rules, unused-vars disabled
- `vitest.config.ts` - jsdom environment, globals enabled
- Style: default
- Base color: slate
- CSS variables: enabled
- No RSC (not Next.js)
- Aliases configured in `components.json`
## Platform Requirements
- Bun installed
- Node.js compatible (ES2020 target)
- `bun install` then `bun run dev` (Vite dev server on :8080)
- `bun run build` outputs to `dist/`
- Deployed on Lovable Cloud
- GitHub-connected: push to `main` triggers deploy
- SPA with client-side routing
## Scripts
<!-- GSD:stack-end -->

<!-- GSD:conventions-start source:CONVENTIONS.md -->
## Conventions

## Naming Patterns
- React components: PascalCase `.tsx` files (`ProspectSheet.tsx`, `TerritoryPlanner.tsx`, `AddProspectDialog.tsx`)
- Custom hooks: camelCase with `use` prefix, `.ts` extension (`useProspects.ts`, `useTerritories.ts`, `useSignals.ts`)
- Exception: `use-mobile.ts` and `use-toast.ts` use kebab-case (shadcn convention)
- Data/utility files: camelCase `.ts` (`prospects.ts`, `utils.ts`)
- Pages: PascalCase (`Index.tsx`, `ProspectPage.tsx`, `InsightsPage.tsx`)
- shadcn UI components in `src/components/ui/`: kebab-case (`alert-dialog.tsx`, `dropdown-menu.tsx`)
- Use camelCase for all functions: `loadData`, `dbToProspect`, `scoreProspect`, `getAgingClass`
- React components use PascalCase: `ProspectSheet`, `RoleBadge`, `StrengthDot`
- Inline helper functions defined above component body: `relativeTime()`, `getAgingClass()`, `InteractionIcon()`
- camelCase for local/state variables: `editingCell`, `sheetProspectId`, `activeTerritory`
- State setter follows React convention: `[data, setData]`, `[ok, setOk]`
- SCREAMING_SNAKE_CASE for domain constants: `STAGES`, `PRIORITIES`, `TIERS`, `INDUSTRIES`, `COMPETITORS`
- SCREAMING_SNAKE_CASE for config objects: `STAGE_COLORS`, `STAGE_EMOJI`, `ROLE_CONFIG`, `STRENGTH_CONFIG`
- SCREAMING_SNAKE_CASE for localStorage keys: `VIEWS_KEY = "tp-saved-views"`
- DB field sets use SCREAMING_SNAKE_CASE: `DB_FIELDS` in `src/hooks/useOpportunities.ts`
- PascalCase, use `interface` for data shapes: `Prospect`, `Contact`, `InteractionLog`, `Territory`
- `type` keyword for unions from `as const` arrays: `type ContactRole = typeof CONTACT_ROLES[number]`
- Export types alongside constants from data files: `src/data/prospects.ts`
## Component Patterns
- Components are defined as either arrow functions or `function` declarations (no class components)
- Pages are thin wrappers that compose hooks + components: `src/pages/Index.tsx` just renders `<TerritoryPlanner />`
- Props interfaces defined immediately above the component, named `{ComponentName}Props`:
- Pages use default export: `export default Index`
- Components use named export: `export function ProspectSheet(...)`, `export { NavLink }`
- Hooks use named export: `export function useProspects(...)`
- Constants/types use named export from data files
- useState for all local UI state (editing cells, open dialogs, filter values)
- useMemo for derived/filtered data
- useCallback for memoized handlers passed to children
- useRef for DOM refs and mutable values that should not trigger re-render
- Use `useIsMobile()` hook from `src/hooks/use-mobile.ts` for mobile detection
- Render Sheet on desktop, Drawer on mobile (see `ProspectSheet.tsx`)
## Styling
- Colors use `hsl(var(--variable))` pattern through Tailwind config
- Semantic tokens: `--background`, `--foreground`, `--primary`, `--secondary`, `--destructive`, `--muted`, `--accent`, `--card`, `--popover`
- Custom tokens: `--success`, `--warning` (not standard shadcn)
- Dark mode: `.dark` class on root, toggled by `next-themes`
- `glass-card`, `glow-blue`, `aging-dot`, `aging-green`, `aging-yellow`, `aging-red`, `aging-gray`
- `skeleton-shimmer`, `gradient-text`, `yext-grid-bg`, `pipeline-segment`, `kanban-card`
- `row-hover-lift`, `overdue-flag`, `delete-glow`, `inline-edit-cell`
- Do NOT remove these; they are actively used
## Error Handling
- Check `error` return from Supabase calls
- Log to `console.error("Error loading prospects:", error)` on failure
- Use `toast.error("Failed to add contact")` via sonner for user-facing errors
- No retry logic, no error recovery -- stale local state persists until reload
- All hooks update local `useState` immediately after DB call
- If Supabase call fails, local state diverges from DB silently
- No rollback mechanism
- Most hook functions start with `if (!user) return;` guard
- No input validation beyond presence checks
## State Management
- Custom hooks call Supabase directly via `@/integrations/supabase/client`
- Load on mount via `useEffect` + `useCallback`
- TanStack Query is installed and configured (`QueryClientProvider` in `App.tsx` with `refetchOnWindowFocus: false`) but NOT used for data fetching -- all hooks use raw `useState`/`useEffect`
- `App.tsx` wraps everything in `ThemeProvider > QueryClientProvider > TooltipProvider > AuthProvider > BrowserRouter`
- Pages call hooks directly: `const { data, update, add } = useProspects(territoryId)`
- Props drill from parent components to children (no prop tunneling or context for domain data)
## Import Conventions
- `@/*` maps to `./src/*` (configured in `tsconfig.json` and `vite.config.ts`)
- Always use `@/` prefix for internal imports. Never use relative paths like `../../hooks/useAuth`
## Logging
## Comments
## Function Design
## TypeScript Strictness
- `noImplicitAny: false` -- `any` is used freely throughout
- `strictNullChecks: false`
- `@typescript-eslint/no-unused-vars: "off"` in ESLint
- Prospect `id` field is typed as `any` (used as both number for seed data and UUID string from DB)
- DB row parameters: `function dbToProspect(row: any, contacts: any[], ...)`
- Hook parameters: `update(id: any, ...)`
<!-- GSD:conventions-end -->

<!-- GSD:architecture-start source:ARCHITECTURE.md -->
## Architecture

## Pattern Overview
- No backend server -- all data access goes directly from React hooks to Supabase client SDK
- State lives in custom hooks using `useState` with optimistic updates (no Redux, no Zustand, no TanStack Query for mutations)
- Supabase Edge Functions handle AI/enrichment workloads (Anthropic API calls, web scraping)
- Auth via Supabase Auth with React Context provider pattern
- Territory-scoped data: almost all queries filter by `territory_id`
## Layers
- Purpose: Bootstrap providers, define routes, gate auth
- Location: `src/App.tsx`, `src/main.tsx`
- Contains: Route definitions, `ProtectedRoute` wrapper, provider tree (Theme > QueryClient > Tooltip > Auth > Router)
- Depends on: `src/hooks/useAuth.tsx`, all page components
- Used by: Browser entry point
- Purpose: Top-level route handlers, each renders one view
- Location: `src/pages/`
- Contains: Route-level components that compose hooks + feature components
- Key files:
- Depends on: hooks, feature components
- Used by: `src/App.tsx` routes
- Purpose: Reusable UI features (dialogs, sheets, sections)
- Location: `src/components/`
- Contains: Complex interactive components with local state
- Key files:
- Depends on: hooks, `src/data/prospects.ts`, `src/components/ui/`
- Used by: Pages and TerritoryPlanner
- Purpose: shadcn/ui component library (do not modify directly)
- Location: `src/components/ui/`
- Contains: 49 shadcn components (Button, Dialog, Sheet, Drawer, Select, Table, Tabs, etc.)
- Depends on: Radix UI primitives, `src/lib/utils.ts`
- Used by: All feature components and pages
- Purpose: All data fetching, mutation, and local state management
- Location: `src/hooks/`
- Contains: Custom React hooks that wrap Supabase queries with optimistic local state
- Key files:
- Depends on: `src/integrations/supabase/client.ts`, `src/data/prospects.ts`
- Used by: Pages and feature components
- Purpose: Type definitions, scoring logic, seed data, domain constants
- Location: `src/data/prospects.ts` (612 lines)
- Contains: All TypeScript interfaces (`Prospect`, `Contact`, `InteractionLog`, `NoteEntry`, `Task`, `AIReadinessData`), scoring functions (`scoreProspect`, `scoreBreakdown`, `getScoreLabel`), domain constants (`STAGES`, `INDUSTRIES`, `COMPETITORS`, `TIERS`, `PRIORITIES`, `CONTACT_ROLES`, `RELATIONSHIP_STRENGTHS`, `INTERACTION_TYPES`), `initProspect()` factory, `SEED` array (309 accounts), logo URL helper (`getLogoUrl`)
- Depends on: Nothing
- Used by: All hooks and components
- Purpose: Singleton Supabase client instance
- Location: `src/integrations/supabase/client.ts`
- Contains: Client creation with `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY`
- Depends on: Environment variables
- Used by: All hooks, some components directly (ProspectSheet calls supabase for edge functions)
- Purpose: Auto-generated TypeScript types for database schema
- Location: `src/integrations/supabase/types.ts` (591 lines)
- Contains: `Database` type with all table definitions
- Depends on: Nothing (generated)
- Used by: `src/integrations/supabase/client.ts`
- Purpose: Server-side AI processing (runs on Supabase infrastructure)
- Location: `supabase/functions/`
- Contains:
- Depends on: Anthropic API, Supabase DB
- Used by: Components invoke these via `supabase.functions.invoke()`
- Purpose: Shared helper functions
- Location: `src/lib/utils.ts`
- Contains: `cn()` (Tailwind class merge), `normalizeUrl()` (URL normalization)
- Depends on: `clsx`, `tailwind-merge`
- Used by: All components
## Data Flow
- Auth state: React Context (`AuthProvider` in `src/hooks/useAuth.tsx`)
- Prospect data: `useState` in `useProspects` hook, consumed by components that call the hook
- Territory state: `useState` in `useTerritories` hook, active territory persisted in `localStorage`
- Opportunity data: `useState` in `useOpportunities` hook
- Signal data: `useState` in `useSignals` hook
- UI state (filters, sort, editing cells, selected rows, open dialogs): `useState` in `TerritoryPlanner.tsx`
- TanStack Query: installed and configured (`QueryClientProvider` in App.tsx with `refetchOnWindowFocus: false`) but NOT used for data fetching -- all hooks use raw `useState`/`useEffect` patterns
## Key Abstractions
- Purpose: Core domain entity -- a company being prospected
- Examples: `src/data/prospects.ts` (interface), `src/hooks/useProspects.ts` (CRUD)
- Pattern: Flat object with nested sub-collection arrays (contacts, interactions, noteLog, tasks)
- Purpose: Data partition for multi-user collaboration
- Examples: `src/hooks/useTerritories.ts`
- Pattern: All data queries filter by `territory_id`; role-based access (owner/editor/viewer)
- Purpose: Sales deal linked to a prospect
- Examples: `src/hooks/useOpportunities.ts`
- Pattern: Separate table with optional `prospect_id` FK
- Purpose: Buying signal or trigger event for a prospect
- Examples: `src/hooks/useSignals.ts`
- Pattern: Categorized event with relevance level (Hot/Warm/Low)
- Purpose: Prospect prioritization metric (0-100+)
- Examples: `src/data/prospects.ts` (`scoreProspect`, `scoreBreakdown`, `getScoreLabel`)
- Pattern: Pure function that sums weighted factors from prospect fields; display-only (does not drive actions)
## Entry Points
- Location: `src/main.tsx`
- Triggers: Page load
- Responsibilities: Mounts React root to `#root` DOM element
- Location: `src/App.tsx`
- Triggers: React render
- Responsibilities: Provider tree setup (Theme, QueryClient, Tooltip, Auth, Router), route definitions, auth gating via `ProtectedRoute`
- Location: `src/pages/Index.tsx` -> `src/components/TerritoryPlanner.tsx`
- Triggers: Authenticated user navigates to `/`
- Responsibilities: Primary UI -- prospect table, filtering, inline editing, all dialog launchers
## Error Handling
- Hooks log errors via `console.error()` and show `toast.error()` for user-facing failures
- No rollback on failed optimistic updates -- local state becomes stale until page reload
- Supabase client errors are checked but not thrown -- most functions return silently on error
- Edge Function failures surface via toast in the calling component
- No global error boundary
## Cross-Cutting Concerns
<!-- GSD:architecture-end -->

<!-- GSD:workflow-start source:GSD defaults -->
## GSD Workflow Enforcement

Before using Edit, Write, or other file-changing tools, start work through a GSD command so planning artifacts and execution context stay in sync.

Use these entry points:
- `/gsd:quick` for small fixes, doc updates, and ad-hoc tasks
- `/gsd:debug` for investigation and bug fixing
- `/gsd:execute-phase` for planned phase work

Do not make direct repo edits outside a GSD workflow unless the user explicitly asks to bypass it.
<!-- GSD:workflow-end -->

<!-- GSD:profile-start -->
## Developer Profile

> Profile not yet configured. Run `/gsd:profile-user` to generate your developer profile.
> This section is managed by `generate-claude-profile` -- do not edit manually.
<!-- GSD:profile-end -->

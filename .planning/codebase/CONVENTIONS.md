# Coding Conventions

**Analysis Date:** 2026-04-24

## Naming Patterns

**Files:**
- React components: PascalCase `.tsx` files (`ProspectSheet.tsx`, `TerritoryPlanner.tsx`, `AddProspectDialog.tsx`, `ContactPickerDialog.tsx`, `PendingOutreachDialog.tsx`, `SafeHTML.tsx`)
- Custom hooks: camelCase with `use` prefix, `.ts` extension (`useProspects.ts`, `useTerritories.ts`, `useSignals.ts`, `useOpportunities.ts`)
- Exception: `use-mobile.ts` and `use-toast.ts` use kebab-case (shadcn convention)
- Data/utility files: camelCase `.ts` (`prospects.ts`, `utils.ts`, `pendingBatch.ts`)
- Pages: PascalCase (`Index.tsx`, `ProspectPage.tsx`, `InsightsPage.tsx`)
- shadcn UI components in `src/components/ui/`: kebab-case (`alert-dialog.tsx`, `dropdown-menu.tsx`)
- Test files: co-located with source using `.test.ts(x)` suffix (`SafeHTML.test.tsx`, `useProspects.test.ts`, `pendingBatch.test.ts`)

**Functions:**
- Use camelCase for all functions: `loadData`, `dbToProspect`, `scoreProspect`, `getAgingClass`
- React components use PascalCase: `ProspectSheet`, `RoleBadge`, `StrengthDot`, `SafeHTML`
- Inline helper functions defined above component body: `relativeTime()`, `getAgingClass()`, `InteractionIcon()`
- Direct CRUD helpers use verb+noun: `addContact`, `updateContact`, `removeContact`, `addInteraction`, `updateInteraction`, `removeInteraction`, `addTask`, `updateTask`, `removeTask`, `addNote`, `updateNote`, `deleteNote`

**Variables:**
- camelCase for local/state variables: `editingCell`, `sheetProspectId`, `activeTerritory`
- State setter follows React convention: `[data, setData]`, `[ok, setOk]`
- Snapshot variables for rollback use `previous` prefix: `previousProspect`, `previousItem`, `previousItems`, `previous`

**Constants:**
- SCREAMING_SNAKE_CASE for domain constants: `STAGES`, `PRIORITIES`, `TIERS`, `INDUSTRIES`, `COMPETITORS`
- SCREAMING_SNAKE_CASE for config objects: `STAGE_COLORS`, `STAGE_EMOJI`, `ROLE_CONFIG`, `STRENGTH_CONFIG`
- SCREAMING_SNAKE_CASE for localStorage keys: `VIEWS_KEY = "tp-saved-views"`, `"tp-pending-outreach"`
- DB field sets use SCREAMING_SNAKE_CASE: `DB_FIELDS` in `src/hooks/useOpportunities.ts`

**Types/Interfaces:**
- PascalCase, use `interface` for data shapes: `Prospect`, `Contact`, `InteractionLog`, `Territory`, `PendingBatch`
- `type` keyword for unions from `as const` arrays: `type ContactRole = typeof CONTACT_ROLES[number]`
- Export types alongside constants from data files: `src/data/prospects.ts`

## Component Patterns

**Structure:**
- Components are defined as either arrow functions or `function` declarations (no class components)
- Pages are thin wrappers that compose hooks + components: `src/pages/Index.tsx` just renders `<TerritoryPlanner />`
- Props interfaces defined immediately above the component, named `{ComponentName}Props`:
  ```typescript
  interface ProspectSheetProps {
    prospectId: any;
    onClose: () => void;
    data: Prospect[];
    update: (id: any, u: Partial<Prospect>) => void;
    // ...
  }
  ```

**Default exports vs named exports:**
- Pages use default export: `export default Index`
- Components use named export: `export function ProspectSheet(...)`, `export { NavLink }`
- Hooks use named export: `export function useProspects(...)`
- Constants/types use named export from data files

**State management inside components:**
- useState for all local UI state (editing cells, open dialogs, filter values)
- useMemo for derived/filtered data
- useCallback for memoized handlers passed to children
- useRef for DOM refs and mutable values that should not trigger re-render

**Inline editing pattern (TerritoryPlanner.tsx):**
```tsx
{editingCell?.id === p.id && editingCell?.field === "industry" ? (
  <select autoFocus onBlur={() => setEditingCell(null)} ... />
) : (
  <span onClick={() => setEditingCell({ id: p.id, field: "industry" })} ... />
)}
```

**Responsive pattern:**
- Use `useIsMobile()` hook from `src/hooks/use-mobile.ts` for mobile detection
- Render Sheet on desktop, Drawer on mobile (see `ProspectSheet.tsx`)

## Styling

**Approach:** Tailwind CSS utility classes. No CSS modules, no styled-components.

**Class merging:** Always use `cn()` from `src/lib/utils.ts` for conditional classes:
```typescript
import { cn } from "@/lib/utils";
cn("base-class", isActive && "active-class", className)
```

**Design tokens:** CSS custom properties defined in `src/index.css` via HSL values:
- Colors use `hsl(var(--variable))` pattern through Tailwind config
- Semantic tokens: `--background`, `--foreground`, `--primary`, `--secondary`, `--destructive`, `--muted`, `--accent`, `--card`, `--popover`
- Custom tokens: `--success`, `--warning` (not standard shadcn)
- Dark mode: `.dark` class on root, toggled by `next-themes`

**Custom CSS classes in `src/index.css`:**
- `glass-card`, `glow-blue`, `aging-dot`, `aging-green`, `aging-yellow`, `aging-red`, `aging-gray`
- `skeleton-shimmer`, `gradient-text`, `yext-grid-bg`, `pipeline-segment`, `kanban-card`
- `row-hover-lift`, `overdue-flag`, `delete-glow`, `inline-edit-cell`
- Do NOT remove these; they are actively used

**Tailwind config:** `tailwind.config.ts` extends shadcn defaults with sidebar colors, custom animations (`grid`, `accordion-down/up`), and uses `tailwindcss-animate` plugin.

**Icons:** All icons from `lucide-react`. Import individually:
```typescript
import { Search, Plus, X, Building2 } from "lucide-react";
```
Use with className for sizing: `<Search className="w-4 h-4" />`

**shadcn/ui:** Base UI components in `src/components/ui/`. Do not modify directly. Config at `components.json` with `@/components/ui` alias, slate base color, CSS variables enabled.

## Error Handling

**Strategy:** Optimistic updates with explicit rollback on Supabase failure. Toast-based user feedback. No global error boundary.

**Rollback snapshot pattern (Phase 01 — DATA-01 through DATA-04):**

All mutations that do optimistic state updates MUST snapshot previous state BEFORE the optimistic update, then restore on Supabase error. Pattern established in `src/hooks/useProspects.ts`:

```typescript
const update = useCallback(async (id: any, u: Partial<Prospect>) => {
  if (!user) return;

  // 1. Snapshot BEFORE optimistic update
  const previousProspect = data.find(p => p.id === id);

  // 2. Optimistic update locally
  setData((prev) => prev.map((p) => (p.id === id ? { ...p, ...u } : p)));

  // 3. Persist
  const { error } = await supabase.from("prospects").update(dbFields).eq("id", id);

  // 4. Rollback on error + user-facing toast
  if (error) {
    setData((prev) => prev.map(p => p.id === id ? { ...p, ...previousProspect } : p));
    toast.error("Failed to save — changes not persisted");
    return;
  }
}, [user, data]);
```

**Standard error toast copy:**
- Update failure: `toast.error("Failed to save — changes not persisted")` (the canonical phrasing)
- Specific mutation: `toast.error("Failed to add contact")`, `toast.error("Failed to remove prospect")`, `toast.error("Failed to delete task")`
- Bulk failure: `toast.error("Failed to bulk update")`, `toast.error("Failed to remove prospects")`

**Required for new mutations:**
- Any function that calls `setData` BEFORE awaiting Supabase MUST snapshot previous state and rollback on error. See `update`, `remove`, `bulkUpdate`, `bulkRemove` in `src/hooks/useProspects.ts` and `remove` in `src/hooks/useOpportunities.ts`.
- Single-row sub-collection mutations (`addContact`, `updateTask`, etc.) use a simpler pattern: await Supabase first, only update local state on success.

**Single-row sub-collection CRUD pattern (Phase 01 — DATA-02/03/04):**

DO NOT use delete-all + re-insert for sub-collections. Use dedicated single-row CRUD functions:

```typescript
// GOOD — single-row insert, await first, then update state
const addInteraction = useCallback(async (prospectId: string, interaction: Omit<InteractionLog, "id">) => {
  if (!user) return;
  const { data: rows, error } = await supabase.from("prospect_interactions").insert({...}).select("id");
  if (error) { toast.error("Failed to add interaction"); return; }
  const newId = rows?.[0]?.id;
  if (newId) setData(prev => prev.map(p => /* add to p.interactions */));
}, [user]);

// BAD — do NOT do this anymore
// await supabase.from("prospect_interactions").delete().eq("prospect_id", id);
// await supabase.from("prospect_interactions").insert(interactions.map(...));
```

The legacy `bulkMerge` function in `src/hooks/useProspects.ts` still uses delete-all + re-insert for contacts only. A comment there explains: interactions, noteLog, and tasks MUST use dedicated CRUD functions to avoid race conditions.

**Supabase error handling:**
- Always destructure `{ error }` from Supabase calls
- Log to `console.error("[hookName] operation error:", error)` (bracketed hook prefix used in `useOpportunities.ts`)
- Use `toast.error(...)` via sonner for user-facing errors
- Do not throw — return early after toast

**Guard clauses:**
- Most hook functions start with `if (!user) return;` guard
- No input validation beyond presence checks

## XSS and HTML Sanitization (Phase 01 — SEC-03)

**Never use raw `dangerouslySetInnerHTML`.** Always route user-supplied or AI-generated HTML through `<SafeHTML>`.

**Canonical component:** `src/components/SafeHTML.tsx`
```typescript
import DOMPurify from "dompurify";

export function SafeHTML({ html, className }: SafeHTMLProps) {
  const clean = DOMPurify.sanitize(html, {
    ALLOWED_TAGS: ["p", "br", "strong", "em", "u", "s", "ul", "ol", "li", "a", "h1", "h2", "h3"],
    ALLOWED_ATTR: ["href", "target", "rel"],
  });
  return <div className={className} dangerouslySetInnerHTML={{ __html: clean }} />;
}
```

**Usage:** Note body HTML, AI-generated content. Example in `src/components/ProspectSheet.tsx`:
```tsx
<SafeHTML html={note.text} className="text-sm text-foreground prose prose-sm dark:prose-invert max-w-none" />
```

**Rules:**
- DOMPurify is the only HTML sanitizer. Do not introduce `sanitize-html` or custom regex scrubbing.
- If a new context needs broader tag support, extend `ALLOWED_TAGS` in `SafeHTML.tsx` — do not bypass it.
- Allowed exception: `src/components/ui/chart.tsx` uses `dangerouslySetInnerHTML` for CSS variable injection (trusted, developer-controlled content only).

## AI / Edge Function Calls (Phase 04)

**Never call the Anthropic API directly from the client.** All AI calls go through Supabase Edge Functions.

**Required pattern:**
```typescript
const { data: result, error } = await supabase.functions.invoke("draft-outreach", {
  body: { prospectId, contactId },
});
```

**Forbidden patterns (enforced by `src/components/ProspectSheet.test.tsx`):**
- Direct `fetch("https://api.anthropic.com/...")`
- Any import or reference to `VITE_ANTHROPIC_API_KEY` in client code

**Available Edge Functions** (in `supabase/functions/`):
- `draft-outreach` — Generates AI-drafted cold emails
- `meeting-prep` — One-page meeting brief
- `chat` — Conversational territory queries
- `ai-readiness` — AI readiness scoring
- `research-account` — Prospect research
- `enrich-prospect`, `enrich-prospect-add` — Data enrichment
- `categorize-signal` — Signal categorization

**Streaming Edge Functions:** Several functions (`research-account`, `enrich-prospect`, `enrich-prospect-add`, `ai-readiness`) stream responses. When the client consumes streamed output, use the Supabase SDK's streaming support rather than raw fetch — invocation still goes through `supabase.functions.invoke`.

## Soft Delete (Phase 01 — DATA-05 through DATA-08)

**Status:** Partially implemented — `remove()` and `restore()` are stubbed in `src/hooks/useProspects.ts` until the `deleted_at` column is added to the `prospects` table via Supabase dashboard. Tests exist as `it.todo(...)` placeholders.

**Target pattern when implemented:**
- `remove(id)` → `UPDATE prospects SET deleted_at = now() WHERE id = $1`
- `loadData()` → `SELECT ... WHERE deleted_at IS NULL`
- `loadArchivedData()` → `SELECT ... WHERE deleted_at IS NOT NULL`
- `restore(id)` → `UPDATE prospects SET deleted_at = NULL WHERE id = $1`
- `permanentDelete(id)` → `DELETE FROM prospects WHERE id = $1`

Until the column exists, `restore` and `permanentDelete` are `async () => {}` no-ops, and `loadArchivedData` returns an empty array.

## State Management

**No global state library.** All state managed via:

1. **React Context** for auth only: `AuthProvider` in `src/hooks/useAuth.tsx`
2. **Custom hooks with useState** for all domain data: `useProspects`, `useOpportunities`, `useTerritories`, `useSignals`
3. **Local component state** for UI concerns (filters, edit modes, dialogs)
4. **localStorage** for saved views (`tp-saved-views`) and pending outreach batches (`tp-pending-outreach` — see `src/lib/pendingBatch.ts`)

**Data fetching pattern:**
- Custom hooks call Supabase directly via `@/integrations/supabase/client`
- Load on mount via `useEffect` + `useCallback`
- TanStack Query is installed and configured (`QueryClientProvider` in `App.tsx` with `refetchOnWindowFocus: false`) but NOT used for data fetching — all hooks use raw `useState`/`useEffect`

**Data flow:**
- `App.tsx` wraps everything in `ThemeProvider > QueryClientProvider > TooltipProvider > AuthProvider > BrowserRouter`
- Pages call hooks directly: `const { data, update, add } = useProspects(territoryId)`
- Props drill from parent components to children (no prop tunneling or context for domain data)

## Import Conventions

**Order (observed, not enforced by tooling):**
1. React core (`useState`, `useMemo`, `useEffect`, `useCallback`, `useRef`)
2. Third-party libraries (`react-router-dom`, `date-fns`, `next-themes`, `dompurify`)
3. Internal UI components via `@/components/ui/` alias
4. Internal components via `@/components/` alias
5. Hooks via `@/hooks/` alias
6. Data/types via `@/data/` alias
7. Utilities via `@/lib/utils`
8. Integrations via `@/integrations/`
9. Assets via `@/assets/`
10. Icons from `lucide-react` (often large destructured import blocks)

**Path aliases:**
- `@/*` maps to `./src/*` (configured in `tsconfig.json` and `vite.config.ts`)
- Always use `@/` prefix for internal imports. Never use relative paths like `../../hooks/useAuth`
- Exception: co-located test files may use relative imports (e.g., `./SafeHTML`, `./PendingOutreachDialog`)

**Barrel exports:** Not used. Each file exports its own items directly. No `index.ts` barrel files.

## Logging

**Framework:** `console.error` for errors, `console.log` for debug. No structured logging.

**Preferred prefix format** (used in `useOpportunities.ts`): `console.error("[hookName] operation error:", error)` — the bracketed hook name makes log filtering easier.

**Toast notifications:** `sonner` library via `toast` import:
```typescript
import { toast } from "sonner";
toast.success("Seed data imported!");
toast.error("Failed to save — changes not persisted");
```

## Comments

**JSDoc:** Minimal. Used for deprecated field markers and phase-tracking test headers:
```typescript
/** @deprecated use tasks[] instead */
nextStep?: string;

/**
 * Tests for useProspects hook
 * DATA-01 through DATA-04: Rollback + direct CRUD
 * DATA-05 through DATA-08: Soft delete (stubbed — requires deleted_at column)
 */
```

**Inline comments:** Used for non-obvious logic and phase-scoped changes:
```typescript
// Snapshot current state for rollback — must happen before optimistic update
// contacts field is intentionally ignored here — use addContact/updateContact/removeContact instead
// Stubbed — will be implemented when deleted_at column is added to Supabase
// interactions, noteLog, tasks: use dedicated CRUD functions instead (per D-05)
```

**Phase identifiers:** When code or tests relate to a planned phase, reference the ticket ID (DATA-01, SEC-03, etc.) in comments so future readers can trace intent back to `.planning/phases/`.

**No TODO/FIXME comments in source** (tech debt tracked in CLAUDE.md roadmap and `.planning/codebase/CONCERNS.md`).

## Function Design

**Hook return pattern:** Return a flat object with data + all mutation methods. Example from `useProspects`:
```typescript
return {
  data, ok, update, add, remove,
  bulkUpdate, bulkRemove, bulkAdd, bulkMerge,
  reset, archivedData, loadArchivedData, restore, permanentDelete,
  seedData, seeding,
  deleteNote, addNote, updateNote,
  addContact, updateContact, removeContact,
  addInteraction, updateInteraction, removeInteraction,
  addTask, updateTask, removeTask,
};
```

**DB mapping:** Manual field-by-field mapping between camelCase TypeScript and snake_case DB columns. No ORM. Pattern in `useProspects.ts`:
```typescript
if ("locationCount" in prospectFields) dbFields.location_count = prospectFields.locationCount;
```

**Callback patterns:** All mutations wrapped in `useCallback`. Dependency array MUST include any state read inside the callback that is used for snapshot-and-rollback (`[user, data]` is the common pair for rollback-enabled mutations).

## TypeScript Strictness

**Loose configuration:** TypeScript strict mode is OFF (`"strict": false` in `tsconfig.app.json`).
- `noImplicitAny: false` — `any` is used freely throughout
- `strictNullChecks: false`
- `noUnusedLocals: false`, `noUnusedParameters: false`
- `@typescript-eslint/no-unused-vars: "off"` in ESLint

**Common `any` usage:**
- Prospect `id` field is typed as `any` (used as both number for seed data and UUID string from DB)
- DB row parameters: `function dbToProspect(row: any, contacts: any[], ...)`
- Hook parameters: `update(id: any, ...)`
- DB field assignment objects: `const dbFields: any = {};`

**ESLint:** Flat config (`eslint.config.js`) extends recommended rules + react-hooks + react-refresh. No format enforcement (Prettier not configured).

---

*Convention analysis: 2026-04-24*

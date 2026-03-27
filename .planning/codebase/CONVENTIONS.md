# Coding Conventions

**Analysis Date:** 2026-03-26

## Naming Patterns

**Files:**
- React components: PascalCase `.tsx` files (`ProspectSheet.tsx`, `TerritoryPlanner.tsx`, `AddProspectDialog.tsx`)
- Custom hooks: camelCase with `use` prefix, `.ts` extension (`useProspects.ts`, `useTerritories.ts`, `useSignals.ts`)
- Exception: `use-mobile.ts` and `use-toast.ts` use kebab-case (shadcn convention)
- Data/utility files: camelCase `.ts` (`prospects.ts`, `utils.ts`)
- Pages: PascalCase (`Index.tsx`, `ProspectPage.tsx`, `InsightsPage.tsx`)
- shadcn UI components in `src/components/ui/`: kebab-case (`alert-dialog.tsx`, `dropdown-menu.tsx`)

**Functions:**
- Use camelCase for all functions: `loadData`, `dbToProspect`, `scoreProspect`, `getAgingClass`
- React components use PascalCase: `ProspectSheet`, `RoleBadge`, `StrengthDot`
- Inline helper functions defined above component body: `relativeTime()`, `getAgingClass()`, `InteractionIcon()`

**Variables:**
- camelCase for local/state variables: `editingCell`, `sheetProspectId`, `activeTerritory`
- State setter follows React convention: `[data, setData]`, `[ok, setOk]`

**Constants:**
- SCREAMING_SNAKE_CASE for domain constants: `STAGES`, `PRIORITIES`, `TIERS`, `INDUSTRIES`, `COMPETITORS`
- SCREAMING_SNAKE_CASE for config objects: `STAGE_COLORS`, `STAGE_EMOJI`, `ROLE_CONFIG`, `STRENGTH_CONFIG`
- SCREAMING_SNAKE_CASE for localStorage keys: `VIEWS_KEY = "tp-saved-views"`
- DB field sets use SCREAMING_SNAKE_CASE: `DB_FIELDS` in `src/hooks/useOpportunities.ts`

**Types/Interfaces:**
- PascalCase, use `interface` for data shapes: `Prospect`, `Contact`, `InteractionLog`, `Territory`
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

**Strategy:** Minimal, console-based. No global error boundary.

**Supabase operations:**
- Check `error` return from Supabase calls
- Log to `console.error("Error loading prospects:", error)` on failure
- Use `toast.error("Failed to add contact")` via sonner for user-facing errors
- No retry logic, no error recovery -- stale local state persists until reload

**Optimistic updates:**
- All hooks update local `useState` immediately after DB call
- If Supabase call fails, local state diverges from DB silently
- No rollback mechanism

**Guard clauses:**
- Most hook functions start with `if (!user) return;` guard
- No input validation beyond presence checks

## State Management

**No global state library.** All state managed via:

1. **React Context** for auth only: `AuthProvider` in `src/hooks/useAuth.tsx`
2. **Custom hooks with useState** for all domain data: `useProspects`, `useOpportunities`, `useTerritories`, `useSignals`
3. **Local component state** for UI concerns (filters, edit modes, dialogs)
4. **localStorage** for saved views: `tp-saved-views` key in `TerritoryPlanner.tsx`

**Data fetching pattern:**
- Custom hooks call Supabase directly via `@/integrations/supabase/client`
- Load on mount via `useEffect` + `useCallback`
- TanStack Query is installed and configured (`QueryClientProvider` in `App.tsx` with `refetchOnWindowFocus: false`) but NOT used for data fetching -- all hooks use raw `useState`/`useEffect`

**Data flow:**
- `App.tsx` wraps everything in `ThemeProvider > QueryClientProvider > TooltipProvider > AuthProvider > BrowserRouter`
- Pages call hooks directly: `const { data, update, add } = useProspects(territoryId)`
- Props drill from parent components to children (no prop tunneling or context for domain data)

## Import Conventions

**Order (observed, not enforced by tooling):**
1. React core (`useState`, `useMemo`, `useEffect`, `useCallback`, `useRef`)
2. Third-party libraries (`react-router-dom`, `date-fns`, `next-themes`)
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

**Barrel exports:** Not used. Each file exports its own items directly. No `index.ts` barrel files.

## Logging

**Framework:** `console.error` for errors, `console.log` for debug. No structured logging.

**Toast notifications:** `sonner` library via `toast` import:
```typescript
import { toast } from "sonner";
toast.success("Seed data imported!");
toast.error("Failed to add contact");
```

## Comments

**JSDoc:** Minimal. Used only for deprecated field markers:
```typescript
/** @deprecated use tasks[] instead */
nextStep?: string;
```

**Inline comments:** Used sparingly for non-obvious logic:
```typescript
// contacts field is intentionally ignored here -- use addContact/updateContact/removeContact instead
// Track current user ID to avoid unnecessary state updates on TOKEN_REFRESHED events
```

**No TODO/FIXME comments in source** (tech debt tracked in CLAUDE.md roadmap instead).

## Function Design

**Hook return pattern:** Return a flat object with data + methods:
```typescript
return { data, ok, update, add, remove, bulkUpdate, seedData, ... };
```

**DB mapping:** Manual field-by-field mapping between camelCase TypeScript and snake_case DB columns. No ORM, no automatic mapping. Pattern in `useProspects.ts`:
```typescript
if ("locationCount" in prospectFields) dbFields.location_count = prospectFields.locationCount;
```

**Callback patterns:** All mutations wrapped in `useCallback` with `[user]` dependency. Fire-and-forget async -- no await at call site, no error propagation to caller.

## TypeScript Strictness

**Loose configuration:** TypeScript strict mode is OFF (`"strict": false` in `tsconfig.app.json`).
- `noImplicitAny: false` -- `any` is used freely throughout
- `strictNullChecks: false`
- `@typescript-eslint/no-unused-vars: "off"` in ESLint

**Common `any` usage:**
- Prospect `id` field is typed as `any` (used as both number for seed data and UUID string from DB)
- DB row parameters: `function dbToProspect(row: any, contacts: any[], ...)`
- Hook parameters: `update(id: any, ...)`

---

*Convention analysis: 2026-03-26*

# Technology Stack — Hardening & Quality

**Project:** Territory Plan Buddy (hardening pass)
**Researched:** 2026-03-26
**Scope:** Additive tooling on top of existing React + TypeScript + Vite + Supabase + Tailwind + shadcn/ui stack. Do not re-choose the base stack.

---

## Existing Stack (Do Not Change)

These are already installed and decided. Research only covers what to ADD.

| Already Present | Version | Status |
|----------------|---------|--------|
| React | ^18.3.1 | Keep |
| TypeScript | ^5.8.3 | Keep — but enable strict mode |
| Vite + SWC | ^5.4.19 | Keep |
| Tailwind CSS | ^3.4.17 | Keep |
| shadcn/ui | current | Keep |
| Supabase JS | ^2.98.0 | Keep |
| TanStack Query | ^5.83.0 | Installed but unused — migrate to it |
| Vitest | ^3.2.4 | Keep — already configured |
| @testing-library/react | ^16.0.0 | Keep |
| React Hook Form + Zod | ^7.x + ^3.x | Keep |
| sonner | ^1.7.4 | Keep |

---

## Recommended Additions

### 1. Error Boundaries — `react-error-boundary` ^6.1.1

**Install:**
```bash
bun add react-error-boundary
```

**Why this, not a custom class component:** The native React error boundary API requires class components and doesn't compose well with hooks. `react-error-boundary` (by Brian Vaughn, former React core team) wraps this into a functional-component-friendly `<ErrorBoundary>` that accepts a `fallbackRender` prop and a `resetKeys` prop to declaratively reset on state change. Version 6 (current: 6.1.1) adds a `useErrorBoundary()` hook to programmatically throw errors into the boundary from async event handlers — which is exactly what's needed to surface failed Supabase writes that don't happen during render.

**Confidence:** HIGH — official npm, widely adopted (1,879+ dependents), maintained, current.

**Do not use:**
- Hand-rolled class component error boundaries — more boilerplate, harder to compose
- React Router's built-in `errorElement` for component-level errors — that's route-level only, and this app doesn't use data routers

**Usage pattern for this codebase:**
```tsx
// Wrap ProspectSheet and TerritoryPlanner in a boundary
<ErrorBoundary fallbackRender={({ error, resetErrorBoundary }) => (
  <div>
    <p>Something went wrong: {error.message}</p>
    <Button onClick={resetErrorBoundary}>Try again</Button>
  </div>
)}>
  <TerritoryPlanner />
</ErrorBoundary>
```

For async mutation errors (Supabase write failures), use `useErrorBoundary()` to throw into the nearest boundary after exhausting retry/rollback logic.

---

### 2. XSS Sanitization — `dompurify` ^3.3.3 + `@types/dompurify`

**Install:**
```bash
bun add dompurify
bun add -d @types/dompurify
```

**Why this is mandatory:** The codebase renders TipTap-generated HTML via `dangerouslySetInnerHTML` in ProspectSheet without any sanitization. Shared territories with editor/viewer roles means a collaborator can inject arbitrary HTML. DOMPurify is the de facto standard: DOM-only (no server-side regex hacks), whitelist-based, ~30KB minified, and actively maintained (current: v3.3.3).

**Confidence:** HIGH — official GitHub cure53/DOMPurify, widely used, current.

**Do not use:**
- `sanitize-html` — heavier, slower, node-focused. DOMPurify is better for browsers.
- Manual allow-listing — too easy to miss vectors.

**Usage pattern:**
```tsx
import DOMPurify from 'dompurify';
<div dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(note.text) }} />
```

---

### 3. API Mocking for Tests — `msw` ^2.12.14

**Install:**
```bash
bun add -d msw
```

**Why this over vi.mock of the Supabase client:** The Supabase JS client makes real HTTP requests to `{SUPABASE_URL}/rest/v1/{table}`. Mock Service Worker intercepts at the network layer, so tests exercise the actual Supabase client code (query building, response mapping, error handling). This is the most faithful unit-test setup short of a real database. The alternative — `vi.mock('@supabase/supabase-js')` — means you're testing mocks of mocks and will miss mapping bugs.

**Confidence:** HIGH — official mswjs.io docs, current version 2.12.14, widely adopted.

**Do not use:**
- `nock` — Node-only, can't intercept Supabase's fetch-based client cleanly in jsdom
- Direct `vi.mock` of supabase client — testing mock behavior, not real client behavior

**Setup pattern (Node environment for Vitest):**
```ts
// src/test/server.ts
import { setupServer } from 'msw/node'
import { http, HttpResponse } from 'msw'

export const server = setupServer(
  http.get(`${import.meta.env.VITE_SUPABASE_URL}/rest/v1/prospects`, () => {
    return HttpResponse.json([/* fixture */])
  })
)

// src/test/setup.ts  (already exists — add these lines)
import { server } from './server'
beforeAll(() => server.listen({ onUnhandledRequest: 'error' }))
afterEach(() => server.resetHandlers())
afterAll(() => server.close())
```

---

### 4. TanStack Query Migration (already installed — just migrate)

**No new install needed.** `@tanstack/react-query` ^5.83.0 is already in package.json. The gap is that it's declared but custom hooks bypass it entirely.

**Why migrate from useState-based custom hooks:** The CONCERNS.md documents the exact failure: optimistic updates write to local state, Supabase mutation fires, if it fails the user sees success and data is silently lost. TanStack Query v5's `useMutation` with `onMutate`/`onError`/`onSettled` provides the standard rollback pattern with zero custom state machinery.

**v5 optimistic update rollback pattern (the right approach for this codebase):**
```ts
const updateProspect = useMutation({
  mutationFn: (vars: { id: string; changes: Partial<Prospect> }) =>
    supabase.from('prospects').update(toSnake(vars.changes)).eq('id', vars.id),
  onMutate: async (vars) => {
    // 1. Cancel any outgoing refetches
    await queryClient.cancelQueries({ queryKey: ['prospects'] })
    // 2. Snapshot previous value
    const previous = queryClient.getQueryData(['prospects'])
    // 3. Optimistically update
    queryClient.setQueryData(['prospects'], (old) =>
      old.map(p => p.id === vars.id ? { ...p, ...vars.changes } : p)
    )
    return { previous }
  },
  onError: (_err, _vars, ctx) => {
    // 4. Rollback on failure
    queryClient.setQueryData(['prospects'], ctx?.previous)
    toast.error('Save failed — your changes were reverted')
  },
  onSettled: () => {
    // 5. Always refetch to sync with server
    queryClient.invalidateQueries({ queryKey: ['prospects'] })
  },
})
```

**Migration strategy — incremental, don't rewrite everything at once:**
1. Wrap `main.tsx` in `QueryClientProvider` (may already be done — verify)
2. Convert `useProspects.loadData()` to a `useQuery` first — this gives caching and stale-while-revalidate with zero behavior change
3. Convert `update()` to `useMutation` with the rollback pattern above — this fixes the silent data loss bug
4. Convert remaining mutations incrementally per phase

**Key v5 API differences from older docs:**
- `useQuery` no longer accepts `onError`/`onSuccess` callbacks — use `useEffect` to watch `isError`
- `useMutation` keeps `onError`/`onSuccess` callbacks — the rollback pattern above is correct
- `isLoading` renamed to `isPending` for mutations
- All hooks use single object parameter: `useQuery({ queryKey, queryFn })`

**Confidence:** HIGH — official TanStack Query v5 docs, migrating from custom hooks to this is the documented path.

**Do not use:**
- SWR — it's installed implicitly via other deps, but TanStack Query is already in place; don't mix them
- Redux Toolkit Query — massive overkill for a personal tool with a single Supabase backend

---

### 5. Bundle Analysis — `rollup-plugin-visualizer` ^7.0.1

**Install (dev only):**
```bash
bun add -d rollup-plugin-visualizer
```

**Why this:** Vite uses Rollup under the hood. This plugin hooks directly into the Rollup pipeline and generates a `stats.html` treemap showing exact per-module sizes before and after compression. The CONCERNS.md flags base64 logos inflating the payload and no pagination — this tool will confirm the actual size impact and identify the largest offenders (likely `recharts`, `@tiptap/*`, and `@dnd-kit/*`).

**Confidence:** HIGH — widely adopted for Vite projects, current version 7.0.1, official GitHub btd/rollup-plugin-visualizer.

**Do not use:**
- `vite-bundle-analyzer` — similar but less mature and fewer output formats
- `webpack-bundle-analyzer` — wrong bundler (this is Vite/Rollup)

**One-time setup in `vite.config.ts`:**
```ts
import { visualizer } from 'rollup-plugin-visualizer'

export default defineConfig({
  plugins: [
    // ...existing plugins
    visualizer({
      open: true,            // auto-open stats.html after build
      gzipSize: true,        // show gzip sizes
      brotliSize: true,      // show brotli sizes
      template: 'treemap',   // treemap | sunburst | flamegraph
    })
  ]
})
```

Run `bun run build` and `stats.html` opens in the browser. This is a one-time audit tool — run it, capture findings, then remove or gate behind an env flag.

---

## TypeScript Strict Mode (No New Package — Config Change)

**What to do:** Enable `strict: true` in `tsconfig.app.json`. Currently disabled.

**Why it matters for hardening:** The CONCERNS.md documents 37 `as any` casts and `Prospect.id` typed as `any`. Strict mode makes these visible as errors, forcing them to be fixed rather than silently bypassed. It also enables `strictNullChecks` which will surface all the places where nullable `territory_id` or null `locationCount` are used unsafely.

**Migration approach — don't enable all at once:**
```json
// tsconfig.app.json — incremental approach
{
  "compilerOptions": {
    "strictNullChecks": true,    // enable first — catches the most bugs
    "noImplicitAny": true,       // enable second — forces explicit types
    "strict": true               // enable last — catches remaining issues
  }
}
```

Fix errors file by file rather than suppressing with `// @ts-ignore`. Each `as any` removal is a genuine bug fix.

**Confidence:** HIGH — this is standard TypeScript guidance, no third-party dependency.

---

## Supabase Edge Function for AI API Key (Existing Pattern — Extend It)

**No new package needed.** The `draft-outreach` Edge Function already exists in the codebase. The CONCERNS.md flags that the Anthropic API key is also called directly from `ProspectSheet.tsx` with `VITE_ANTHROPIC_API_KEY` — exposed in the client bundle.

**Fix:** Route the remaining direct Anthropic call through the same Edge Function pattern. Supabase Edge Functions read secrets via `Deno.env.get('ANTHROPIC_API_KEY')` — key never reaches the browser.

**Confidence:** HIGH — this is the documented Supabase pattern for AI integrations, and a working example already exists in this codebase.

---

## What NOT to Add

| Rejected Option | Why |
|----------------|-----|
| Playwright / Cypress E2E | Personal tool with single user, no CI/CD enforcement. Unit + integration tests for the data layer is sufficient for the hardening goal. E2E setup overhead is not justified. |
| Storybook | No design system or component library use case. The shadcn/ui components don't need documentation. |
| Zod schema for DB responses | Supabase TS codegen provides typed responses already. Adding Zod validation on every query response is over-engineering. Validate on write (inputs), not on read. |
| React Query DevTools | Dev-only add is reasonable, but the app deploys via Lovable Cloud push-to-main and there's no separate dev mode. Skip unless debugging becomes necessary. |
| `immer` for immutable updates | TanStack Query's `setQueryData` with spread operators is sufficient for this data scale. Immer adds a dependency without meaningful benefit. |
| `@sentry/react` | External error monitoring is overkill for a personal tool. `react-error-boundary` with toast feedback is enough. |

---

## Installation Summary

```bash
# Production dependencies
bun add react-error-boundary dompurify

# Dev/type dependencies
bun add -d msw @types/dompurify rollup-plugin-visualizer
```

TanStack Query and Vitest are already installed — no new installs required for those tracks.

---

## Confidence Assessment

| Area | Confidence | Source |
|------|------------|--------|
| `react-error-boundary` v6.1.1 | HIGH | npm registry, official GitHub |
| `dompurify` v3.3.3 | HIGH | official cure53/DOMPurify, npm registry |
| `msw` v2.12.14 | HIGH | official mswjs.io docs, npm registry |
| TanStack Query v5 rollback pattern | HIGH | official TanStack Query v5 docs |
| `rollup-plugin-visualizer` v7.0.1 | HIGH | npm registry, GitHub btd |
| TypeScript strict mode migration path | HIGH | TypeScript official docs |
| Supabase Edge Function AI proxy pattern | HIGH | Supabase official docs + existing pattern in codebase |

---

## Sources

- [react-error-boundary npm](https://www.npmjs.com/package/react-error-boundary)
- [react-error-boundary GitHub (bvaughn)](https://github.com/bvaughn/react-error-boundary)
- [TanStack Query v5 Optimistic Updates](https://tanstack.com/query/v5/docs/react/guides/optimistic-updates)
- [TanStack Query v5 Migration Guide](https://tanstack.com/query/v5/docs/framework/react/guides/migrating-to-v5)
- [MSW Quick Start](https://mswjs.io/docs/quick-start/)
- [MSW Node.js Integration](https://mswjs.io/docs/integrations/node/)
- [Testing React and Supabase with RTL and MSW](https://nygaard.dev/blog/testing-supabase-rtl-msw)
- [DOMPurify GitHub (cure53)](https://github.com/cure53/DOMPurify)
- [rollup-plugin-visualizer GitHub](https://github.com/btd/rollup-plugin-visualizer)
- [Supabase Edge Functions AI Models](https://supabase.com/docs/guides/functions/ai-models)

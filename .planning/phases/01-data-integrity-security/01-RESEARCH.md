# Phase 1: Data Integrity & Security — Research

**Researched:** 2026-03-26
**Domain:** React + Supabase brownfield hardening — error recovery, direct CRUD, soft delete, XSS, API key migration
**Confidence:** HIGH (all findings grounded in direct codebase inspection + established patterns)

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**Error Recovery UX**
- D-01: On failed Supabase write, show `toast.error()` via sonner with message like "Failed to save — changes not persisted". Revert local state to pre-edit snapshot.
- D-02: No auto-retry. No undo button. Simple toast + rollback. Keep it minimal.
- D-03: Apply rollback pattern to all three hooks: `useProspects`, `useOpportunities`, `useSignals`. Each mutation should snapshot state before optimistic update, restore on error.

**Direct CRUD for Sub-Collections**
- D-04: Follow the existing contact CRUD pattern (`addContact`, `updateContact`, `removeContact`). Create matching functions for interactions, notes, and tasks.
- D-05: The `update()` function should stop accepting `interactions`, `noteLog`, and `tasks` as fields. Callers should use the dedicated functions instead.
- D-06: `bulkMerge()` also does delete+re-insert for sub-collections — apply the same direct CRUD fix there.

**Archive / Soft Delete**
- D-07: Add `deleted_at timestamptz` column to `prospects` table via Supabase dashboard (manual step — document in plan).
- D-08: Archive view lives as a filter toggle in TerritoryPlanner — a small "Show Archived" toggle alongside existing filters. Not a separate page.
- D-09: Archived prospects show with a visual indicator (muted/strikethrough) and two actions: "Restore" and "Permanently Delete".
- D-10: `remove()` in useProspects becomes a soft delete (sets `deleted_at = now()`). Add a new `permanentDelete()` that actually deletes the row.
- D-11: Default prospect queries filter `deleted_at IS NULL`. Archive view queries `deleted_at IS NOT NULL`.
- D-12: RLS consideration: `deleted_at IS NULL` filter goes in the application query, NOT in the RLS SELECT policy — otherwise the UPDATE to set `deleted_at` gets blocked.

**XSS Sanitization**
- D-13: Install `dompurify` + `@types/dompurify`. Create a `SafeHTML` wrapper component that sanitizes before rendering.
- D-14: Apply `SafeHTML` to all `dangerouslySetInnerHTML` usages: `ProspectSheet.tsx` (line 722) and `chart.tsx` (if applicable). Also check `ProspectPage.tsx` for the same pattern.

**API Key Migration**
- D-15: Route all browser-side Anthropic API calls through Supabase Edge Functions. The `draft-outreach` Edge Function pattern already exists — use the same approach.
- D-16: Remove `VITE_ANTHROPIC_API_KEY` from `.env` / environment config. The key lives only in Supabase Edge Function secrets.
- D-17: ProspectSheet.tsx lines 344-412 (direct Anthropic call) gets replaced with a `supabase.functions.invoke()` call.

### Claude's Discretion

User said "you decide" for all areas. Claude has full flexibility on:
- Error message wording and toast duration
- Exact component API for SafeHTML wrapper
- Whether to create a shared utility for the rollback pattern or inline it per hook
- Archive toggle UI design (icon, placement, label)
- Edge Function naming and request/response shape

### Deferred Ideas (OUT OF SCOPE)

None — discussion stayed within phase scope.
</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| DATA-01 | User sees an error toast when a Supabase write fails, and the UI reverts to the pre-edit state | Rollback pattern using functional `setState` updater; `sonner` already installed |
| DATA-02 | Updating interactions uses direct row-level CRUD instead of delete-all + re-insert | Follow `addContact`/`updateContact`/`removeContact` pattern in useProspects.ts lines 502–556 |
| DATA-03 | Updating notes uses direct row-level CRUD instead of delete-all + re-insert | `addNote`/`deleteNote` already exist; need `updateNote` to complete the pattern |
| DATA-04 | Updating tasks uses direct row-level CRUD instead of delete-all + re-insert | No direct task CRUD exists; create `addTask`/`updateTask`/`removeTask` following contact pattern |
| DATA-05 | User can archive a prospect (soft delete) and it disappears from the main list | Requires `deleted_at` schema column + query filter + `remove()` becomes soft-delete |
| DATA-06 | User can view archived prospects in a separate view | "Show Archived" toggle in TerritoryPlanner, queries `deleted_at IS NOT NULL` |
| DATA-07 | User can restore an archived prospect | `restore()` stub in useProspects.ts line 487 needs real implementation |
| DATA-08 | User can permanently delete an archived prospect | `permanentDelete()` stub in useProspects.ts line 488 needs real implementation |
| SEC-01 | Anthropic API calls route through a Supabase Edge Function | `meeting-prep` Edge Function already exists at `supabase/functions/meeting-prep/index.ts`; client just needs to switch to `supabase.functions.invoke("meeting-prep", ...)` |
| SEC-02 | VITE_ANTHROPIC_API_KEY is removed from client-side environment variables | Remove from `.env` after confirming ProspectSheet no longer references `import.meta.env.VITE_ANTHROPIC_API_KEY` |
| SEC-03 | Rich text notes rendered with dangerouslySetInnerHTML are sanitized with DOMPurify before display | Install `dompurify@3.3.3` + `@types/dompurify@3.2.0`; wrap ProspectSheet.tsx line 722; `chart.tsx` line 70 uses static system-generated CSS strings (safe, no sanitization needed) |
</phase_requirements>

---

## Summary

This phase fixes three classes of correctness failure and one security vulnerability in a working brownfield React + Supabase app. The codebase is well-structured for these changes: `sonner` is already installed for toasts, a contact CRUD pattern already exists in `useProspects` to replicate for other sub-collections, a `meeting-prep` Edge Function already exists server-side (the client just hasn't been wired to it yet), and Vitest + jsdom are configured with a setup file.

The most important architectural insight: **the `meeting-prep` Edge Function already exists at `supabase/functions/meeting-prep/index.ts` and is functionally complete.** The client-side code in ProspectSheet.tsx (lines 344-412) is a direct duplicate of what the Edge Function does. SEC-01 and SEC-02 are purely a client-side wiring change — no new Edge Function needs to be written.

The most important correctness insight: **the rollback pattern for DATA-01 must use a functional `setState` updater form, not a captured snapshot variable.** If two mutations race (rapid inline edits), a captured snapshot is stale. The functional form `setData(current => revertOneChange(current, id, previousValue))` avoids overwriting a concurrent successful mutation.

**Primary recommendation:** Implement in dependency order — (1) rollback pattern on all three hooks, (2) direct CRUD functions for interactions/notes/tasks, (3) soft delete schema + implementation, (4) SafeHTML component + DOMPurify, (5) wire ProspectSheet to existing `meeting-prep` Edge Function and remove the client key.

---

## Project Constraints (from CLAUDE.md)

- **React + TypeScript via Vite** — no framework changes
- **Tailwind CSS** — utility classes only, avoid arbitrary values
- **shadcn/ui** — check components.json before adding new UI components; do not modify `ui/` components directly
- **Supabase** — Lovable Cloud instance, no direct CLI access; schema changes go through Supabase dashboard manually
- **sonner** already installed — use `toast.error()` for write failure notifications
- **TerritoryPlanner.tsx is ~1000+ lines** — do not make it bigger; extract to sub-components when adding features
- **Sub-collection replace gotcha** — `update(id, { contacts: [...] })` does full replace; after this phase, `interactions`, `noteLog`, and `tasks` must be removed from the `update()` contract
- **No auto-retry, no undo button** — per D-02
- **Anthropic API available** — call via Supabase Edge Function (`supabase.functions.invoke()`), not directly from browser
- **Owner-only features** — gated by `OWNER_EMAILS` array; do not touch this gating
- **Custom CSS classes** — do not remove `glass-card`, `aging-dot`, etc.

---

## Standard Stack

### Core (already installed)
| Library | Version | Purpose | Status |
|---------|---------|---------|--------|
| sonner | 1.7.4 | Toast notifications for error feedback | Installed, in use |
| @supabase/supabase-js | 2.98.0 | All Supabase operations including `functions.invoke()` | Installed, in use |
| vitest | 3.2.4 | Test runner | Installed, configured |
| @testing-library/react | 16.0.0 | Component testing | Installed |
| jsdom | 20.0.3 | DOM environment for tests | Installed via vitest config |

### To Install
| Library | Version | Purpose | Why |
|---------|---------|---------|-----|
| dompurify | 3.3.3 | XSS sanitization for HTML from TipTap | Standard sanitizer for dangerouslySetInnerHTML |
| @types/dompurify | 3.2.0 | TypeScript types for dompurify | Dev dependency |

**Installation:**
```bash
npm install dompurify@3.3.3
npm install -D @types/dompurify@3.2.0
```

**Version verification (confirmed 2026-03-26):**
- `dompurify`: 3.3.3 (latest as of research date)
- `@types/dompurify`: 3.2.0 (latest as of research date)

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| dompurify | isomorphic-dompurify | isomorphic needed only for SSR; this is a Vite CSR app, plain dompurify works |
| dompurify | sanitize-html | sanitize-html is heavier; dompurify is the standard choice for browser-only use |

---

## Architecture Patterns

### Pattern 1: Functional-Updater Rollback (DATA-01)

**What:** Before an optimistic update, capture the specific value that will change. On error, use the functional `setState` form to restore only that value, not the whole array.

**Why not snapshot:** Closures capture state at call time. Rapid mutations (two inline edits within milliseconds) each capture a different snapshot. Rolling back snapshot A after mutation B succeeds will overwrite B's result.

**Pattern:**
```typescript
// In useProspects update():
const update = useCallback(async (id: string, u: Partial<Prospect>) => {
  if (!user) return;

  // Capture pre-edit value for rollback (only the fields being changed)
  const previousProspect = data.find(p => p.id === id);

  // Optimistic update
  setData(prev => prev.map(p => p.id === id ? { ...p, ...u } : p));

  const { error } = await supabase.from("prospects").update(dbFields).eq("id", id);
  if (error) {
    // Functional form: restores only this specific prospect, safe under concurrent mutations
    setData(prev => prev.map(p => p.id === id ? { ...p, ...previousProspect } : p));
    toast.error("Failed to save — changes not persisted");
    return;
  }
}, [user, data]);
```

**Note on `data` dependency:** Including `data` in the dependency array is required to capture the current snapshot correctly. The `useCallback` will re-create when `data` changes. This is acceptable for Phase 1. Phase 2 (TanStack Query migration) will replace this with `onMutate`/`onError`, which is cleaner.

**Apply to:** `useProspects` (update, add, remove, bulkUpdate), `useOpportunities` (add, update, remove), `useSignals` (addSignal, removeSignal).

**Note on useOpportunities and useSignals:** Both hooks already show `toast.error()` on add failure (`useOpportunities`) but do NOT roll back optimistic local state. The pattern to add is: snapshot before optimistic update, restore in error branch.

---

### Pattern 2: Direct Sub-Collection CRUD (DATA-02, DATA-03, DATA-04)

**What:** Individual insert/update/delete calls per row. Matches the contact pattern already established in useProspects.ts lines 502–556.

**Template from existing contacts code:**
```typescript
// addInteraction — mirrors addContact pattern
const addInteraction = useCallback(async (prospectId: string, interaction: Omit<InteractionLog, "id">) => {
  if (!user) return;
  const { data: rows, error } = await supabase.from("prospect_interactions").insert({
    prospect_id: prospectId,
    user_id: user.id,
    type: interaction.type,
    date: interaction.date,
    notes: interaction.notes,
  }).select("id");
  if (error) { toast.error("Failed to add interaction"); return; }
  const newId = rows?.[0]?.id;
  if (newId) {
    setData(prev => prev.map(p =>
      p.id === prospectId
        ? { ...p, interactions: [...(p.interactions || []), { ...interaction, id: newId }] }
        : p
    ));
  }
}, [user]);

// updateInteraction
const updateInteraction = useCallback(async (interactionId: string, fields: Partial<InteractionLog>) => {
  if (!user) return;
  const dbFields: any = {};
  if ("type" in fields) dbFields.type = fields.type;
  if ("date" in fields) dbFields.date = fields.date;
  if ("notes" in fields) dbFields.notes = fields.notes;
  const { error } = await supabase.from("prospect_interactions").update(dbFields).eq("id", interactionId);
  if (error) { toast.error("Failed to update interaction"); return; }
  setData(prev => prev.map(p => ({
    ...p,
    interactions: (p.interactions || []).map(i => i.id === interactionId ? { ...i, ...fields } : i),
  })));
}, [user]);

// removeInteraction
const removeInteraction = useCallback(async (interactionId: string) => {
  if (!user) return;
  const { error } = await supabase.from("prospect_interactions").delete().eq("id", interactionId);
  if (error) { toast.error("Failed to delete interaction"); return; }
  setData(prev => prev.map(p => ({
    ...p,
    interactions: (p.interactions || []).filter(i => i.id !== interactionId),
  })));
}, [user]);
```

**Apply same pattern for notes and tasks.** Notes: `addNote` and `deleteNote` already exist; add `updateNote`. Tasks: create `addTask`, `updateTask`, `removeTask` — none currently exist.

**After adding these functions:** Remove `interactions`, `noteLog`, and `tasks` from the `update()` destructuring (lines 118–197). Any callers currently passing these as fields must be migrated to the dedicated functions.

**Check callers before removing:** Grep for all places in the codebase that call `update(id, { interactions: ...})`, `update(id, { noteLog: ...})`, or `update(id, { tasks: ...})`.

---

### Pattern 3: Soft Delete / Archive (DATA-05 through DATA-08)

**What:** `deleted_at timestamptz` column on prospects. Default queries add `.is("deleted_at", null)`. Archive queries add `.not("deleted_at", "is", null)`. `remove()` becomes a soft delete.

**Schema change (manual — no CLI access):**
```sql
-- Run in Supabase dashboard SQL editor
ALTER TABLE prospects ADD COLUMN deleted_at timestamptz DEFAULT NULL;
```

**RLS critical rule (from PITFALLS.md Pitfall 4):** Do NOT add `deleted_at IS NULL` to RLS UPDATE WITH CHECK. Only add it to SELECT queries in application code. If added to RLS, the UPDATE that sets `deleted_at = now()` will fail because the post-update row no longer satisfies `IS NULL`.

**Query changes in useProspects.ts:**
```typescript
// Default load — add IS NULL filter
let query = supabase
  .from("prospects")
  .select("*")
  .is("deleted_at", null)  // ADD THIS
  .order("created_at", { ascending: false });

// Archive load — IS NOT NULL
let archiveQuery = supabase
  .from("prospects")
  .select("*")
  .not("deleted_at", "is", null)
  .order("deleted_at", { ascending: false });
```

**Updated hook functions:**
```typescript
// remove() becomes soft delete
const remove = useCallback(async (id: string) => {
  if (!user) return;
  const { error } = await supabase
    .from("prospects")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", id);
  if (error) { toast.error("Failed to archive prospect"); return; }
  setData(prev => prev.filter(p => p.id !== id));
}, [user]);

// restore() — update deleted_at to null
const restore = useCallback(async (id: string) => {
  if (!user) return;
  const { error } = await supabase
    .from("prospects")
    .update({ deleted_at: null })
    .eq("id", id);
  if (error) { toast.error("Failed to restore prospect"); return; }
  // Remove from archived list, trigger re-load of main list
}, [user]);

// permanentDelete() — actual row deletion
const permanentDelete = useCallback(async (id: string) => {
  if (!user) return;
  const { error } = await supabase.from("prospects").delete().eq("id", id);
  if (error) { toast.error("Failed to delete prospect"); return; }
  // Remove from archived list
}, [user]);
```

**Archive view state:** Add `showArchived: boolean` state in TerritoryPlanner. When true, load archived prospects into a separate state slice (`archivedData`) and render with muted/strikethrough visual + Restore + Permanently Delete actions per D-09.

**The `ArchivedProspect` interface already exists** in useProspects.ts line 7:
```typescript
export interface ArchivedProspect extends Prospect {
  archivedAt: string;
}
```
Map `deleted_at` to `archivedAt` in `dbToProspect` or a dedicated `dbToArchivedProspect` function.

---

### Pattern 4: SafeHTML Component (SEC-03)

**What:** A React component that sanitizes HTML via DOMPurify before passing to `dangerouslySetInnerHTML`.

**Implementation:**
```tsx
// src/components/SafeHTML.tsx
import DOMPurify from "dompurify";

interface SafeHTMLProps {
  html: string;
  className?: string;
}

export function SafeHTML({ html, className }: SafeHTMLProps) {
  const clean = DOMPurify.sanitize(html, {
    ALLOWED_TAGS: ["p", "br", "strong", "em", "u", "s", "ul", "ol", "li", "a", "h1", "h2", "h3"],
    ALLOWED_ATTR: ["href", "target", "rel"],
  });
  return <div className={className} dangerouslySetInnerHTML={{ __html: clean }} />;
}
```

**Apply at ProspectSheet.tsx line 722:**
```tsx
// Before:
<div className="text-sm text-foreground pr-6 prose prose-sm dark:prose-invert max-w-none [&_p]:my-0.5"
  dangerouslySetInnerHTML={{ __html: note.text }} />

// After:
<SafeHTML html={note.text}
  className="text-sm text-foreground pr-6 prose prose-sm dark:prose-invert max-w-none [&_p]:my-0.5" />
```

**chart.tsx line 70:** The `dangerouslySetInnerHTML` there injects CSS custom property strings built from a static `THEMES` object — not user-generated content, entirely system-controlled. SafeHTML is NOT needed there. CLAUDE.md says do not modify `ui/` components directly.

**ProspectPage.tsx:** No `dangerouslySetInnerHTML` found in ProspectPage.tsx (grep confirmed zero matches). Only ProspectSheet.tsx line 722 is the user-generated HTML concern.

---

### Pattern 5: Meeting Prep Edge Function Wire-Up (SEC-01, SEC-02)

**Critical discovery:** The `meeting-prep` Edge Function at `supabase/functions/meeting-prep/index.ts` is already fully implemented with the exact same logic as ProspectSheet.tsx lines 344-412. It reads `ANTHROPIC_API_KEY` from Supabase secrets (Deno environment), not from the client bundle.

The client code calls `https://api.anthropic.com/v1/messages` directly with `import.meta.env.VITE_ANTHROPIC_API_KEY`. The fix is to replace this fetch call with `supabase.functions.invoke("meeting-prep", { body: { ... } })`.

**Pattern from SignalsSection.tsx (existing usage of functions.invoke):**
```typescript
const { data, error } = await supabase.functions.invoke("some-function", {
  body: { key: "value" },
});
```

**Replacement for ProspectSheet.tsx lines 398-412:**
```typescript
// Replace the direct fetch block:
const { data: result, error } = await supabase.functions.invoke("meeting-prep", {
  body: {
    name: prospect.name,
    website: prospect.website,
    industry: prospect.industry,
    locationCount: prospect.locationCount,
    tier: prospect.tier,
    priority: prospect.priority,
    competitor: prospect.competitor,
    score,
    contacts: prospect.contacts,
    interactions: prospect.interactions,
    tasks: prospect.tasks,
    notes: prospect.noteLog,
  },
});
if (error) throw error;
const text = result?.brief;
if (!text) throw new Error("Empty response from meeting prep");
setMeetingPrepBrief(text);
```

**After verifying the Edge Function is wired and working:**
- Remove `import.meta.env.VITE_ANTHROPIC_API_KEY` reference from ProspectSheet.tsx
- Remove `VITE_ANTHROPIC_API_KEY` from `.env` file (if it exists) and Lovable environment config
- Verify no other files reference `VITE_ANTHROPIC_API_KEY`

---

### Anti-Patterns to Avoid

- **Snapshot rollback with captured closure:** `const snapshot = data; ... setData(snapshot)` — fails under concurrent mutations. Use functional updater instead.
- **delete+reinsert still in bulkMerge:** D-06 requires fixing bulkMerge sub-collection handling — don't leave it partially fixed.
- **RLS WITH CHECK on `deleted_at IS NULL`:** Blocks the soft-delete write. Filter in app queries only.
- **Sanitizing chart.tsx:** It uses `dangerouslySetInnerHTML` for static CSS strings — do not touch `ui/` components.
- **Writing a new meeting-prep Edge Function:** One already exists. Only client wiring is needed.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| HTML sanitization | Custom regex strip | DOMPurify | DOMPurify handles 100s of edge cases: unicode tricks, nested tags, attribute injection; regex sanitizers are regularly bypassed |
| Concurrent mutation rollback | Complex snapshot versioning | Functional `setState` updater | `setData(prev => ...)` captures current state at execution time, not closure capture time |
| Edge Function for Anthropic | New custom proxy | Existing `meeting-prep` function | Already written, deployed, uses server-side key |
| Archive filter | RLS policy on deleted_at | App-level `.is("deleted_at", null)` | RLS WITH CHECK blocks the soft-delete UPDATE itself |

---

## Common Pitfalls

### Pitfall 1: Concurrent Mutation Snapshot Clobber
**What goes wrong:** Two rapid inline edits both capture `data` as a closure variable. Rollback of failure 1 overwrites the success of mutation 2.
**Root cause:** JavaScript closures freeze at call time.
**How to avoid:** Use `setData(prev => prev.map(p => p.id === id ? previousValue : p))` — `prev` is the actual current state at execution time.
**Warning signs:** Rapid double-clicks on an inline edit cause both edits to revert instead of just the failed one.

### Pitfall 2: RLS Blocks Soft-Delete Write
**What goes wrong:** Adding `deleted_at IS NULL` to the Supabase RLS SELECT policy. When `UPDATE SET deleted_at = now()` is called, Supabase re-evaluates the post-update row against the SELECT policy. It now has a non-null `deleted_at`, fails the `IS NULL` check, and returns an RLS violation error.
**Root cause:** Supabase RLS UPDATE performs implicit SELECT on post-update state.
**How to avoid:** Apply `deleted_at IS NULL` only in application queries (`.is("deleted_at", null)`), never in RLS policies.
**Warning signs:** `406` or "new row violates row-level security policy" on the soft-delete call from an authenticated client.

### Pitfall 3: Incomplete Caller Migration After Removing Sub-Collections from update()
**What goes wrong:** `update()` no longer accepts `interactions`, `noteLog`, `tasks`. Callers that still pass these fields will silently succeed (the fields are destructured out and ignored) but data changes are not persisted.
**Root cause:** No TypeScript error appears because `Partial<Prospect>` still allows these fields on the type.
**How to avoid:** After removing the handlers from `update()`, grep all callers for `interactions:`, `noteLog:`, and `tasks:` being passed to `update()`. Migrate each to the new dedicated functions.
**Warning signs:** User adds an interaction, it appears locally, then disappears on reload.

### Pitfall 4: DOMPurify Applied to Wrong Target
**What goes wrong:** Installing DOMPurify and only patching one of multiple `dangerouslySetInnerHTML` usages.
**Root cause:** chart.tsx also has `dangerouslySetInnerHTML` and looks like a target. It is not — it injects static CSS strings from a system-defined `THEMES` object.
**How to avoid:** Only patch ProspectSheet.tsx line 722. Do not modify `src/components/ui/chart.tsx` (CLAUDE.md: do not modify `ui/` components directly).
**Warning signs:** chart component breaks after modifications.

### Pitfall 5: Missing `deleted_at` Filter on bulkRemove / bulkUpdate
**What goes wrong:** `bulkRemove()` does a hard delete. After soft-delete is implemented, `bulkRemove` and any bulk operations should also use soft-delete semantics — or at minimum be audited to confirm they are only used from archive context.
**Root cause:** `bulkRemove` in useProspects.ts line 285 hard-deletes. If bulk operations are accessible from the main list, users can accidentally hard-delete records.
**How to avoid:** Either convert `bulkRemove` to soft-delete as well, or verify it is only exposed from the archive view. Check TerritoryPlanner for how `bulkRemove` is called.

---

## Runtime State Inventory

This phase is not a rename/refactor/migration. No runtime state audit required.

The only "migration" in this phase is the `deleted_at` column addition — a DDL change with no data migration needed (existing rows will have `NULL` by default, which is the correct initial state for "not archived").

---

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Supabase dashboard (browser) | Add `deleted_at` column | Must be assumed available | — | No fallback; document as manual prerequisite |
| Supabase Edge Functions runtime | SEC-01 meeting-prep function | Already deployed (confirmed) | — | — |
| npm (bun) | Install dompurify | Available (Node via Bun) | — | — |
| vitest | Test validation | Available | 3.2.4 | — |

**Manual prerequisite (must be documented in plan):** Planner must include a task to add `deleted_at timestamptz DEFAULT NULL` to the `prospects` table via Supabase dashboard before archive code is deployed.

---

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest 3.2.4 |
| Config file | `vitest.config.ts` (present) |
| Quick run command | `npm test` (runs `vitest run`) |
| Full suite command | `npm test` |
| Environment | jsdom (configured) |
| Setup file | `src/test/setup.ts` (present, has `@testing-library/jest-dom` and `matchMedia` mock) |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| DATA-01 | Error toast shown on failed write, local state reverts | unit (hook) | `npm test -- src/hooks/useProspects.test.ts` | Wave 0 gap |
| DATA-02 | Interaction add/update/delete uses per-row ops | unit (hook) | `npm test -- src/hooks/useProspects.test.ts` | Wave 0 gap |
| DATA-03 | Note add/update/delete uses per-row ops | unit (hook) | `npm test -- src/hooks/useProspects.test.ts` | Wave 0 gap |
| DATA-04 | Task add/update/delete uses per-row ops | unit (hook) | `npm test -- src/hooks/useProspects.test.ts` | Wave 0 gap |
| DATA-05 | Archive removes from main list | unit (hook) | `npm test -- src/hooks/useProspects.test.ts` | Wave 0 gap |
| DATA-06 | Archive view shows archived prospects | smoke (component) | `npm test -- src/components/TerritoryPlanner.test.tsx` | Wave 0 gap |
| DATA-07 | Restore moves prospect back to main list | unit (hook) | `npm test -- src/hooks/useProspects.test.ts` | Wave 0 gap |
| DATA-08 | Permanent delete removes row | unit (hook) | `npm test -- src/hooks/useProspects.test.ts` | Wave 0 gap |
| SEC-01 | AI call uses Edge Function not direct Anthropic URL | unit (component) | `npm test -- src/components/ProspectSheet.test.tsx` | Wave 0 gap |
| SEC-02 | VITE_ANTHROPIC_API_KEY not referenced in bundle | build/grep | `grep -r VITE_ANTHROPIC_API_KEY src/` (returns nothing) | Manual |
| SEC-03 | SafeHTML sanitizes XSS payloads | unit (component) | `npm test -- src/components/SafeHTML.test.tsx` | Wave 0 gap |

### Sampling Rate
- **Per task commit:** `npm test` (full suite is fast — only smoke tests, no integration)
- **Per wave merge:** `npm test`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps

- [ ] `src/hooks/useProspects.test.ts` — covers DATA-01 through DATA-08 hook-level behaviors
- [ ] `src/components/SafeHTML.test.tsx` — covers SEC-03 (DOMPurify integration)
- [ ] `src/components/ProspectSheet.test.tsx` — covers SEC-01 (functions.invoke vs direct fetch)

**Note on test approach:** Supabase client should be mocked via `vi.mock("@/integrations/supabase/client")` returning a chainable mock. Do not test against real Supabase. Assert on behavior (did `setData` get called with the right value after error?), not on Supabase call internals.

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| delete+reinsert sub-collections | Direct per-row CRUD | Contacts already migrated; this phase finishes the job | Eliminates data loss window |
| Direct browser Anthropic call | Supabase Edge Function | Edge Function already exists; wiring is the fix | Removes API key from client bundle |
| `dangerouslySetInnerHTML` raw | DOMPurify-sanitized SafeHTML component | This phase | Closes XSS vulnerability in shared territory notes |
| Optimistic update, no rollback | Snapshot + functional rollback + toast.error | This phase | Makes failures visible instead of silent |
| Hard delete only | Soft delete with archive + restore + permanent delete | This phase | Prevents accidental data loss |

---

## Open Questions

1. **Does `bulkRemove` need to become a soft delete?**
   - What we know: `bulkRemove()` in useProspects.ts line 285 hard-deletes. It is used in TerritoryPlanner for bulk operations.
   - What's unclear: Whether the bulk-delete action in TerritoryPlanner is exposed on the main list or archive list.
   - Recommendation: Planner should check `TerritoryPlanner.tsx` for `bulkRemove` usage. If it appears in the main list context, it should soft-delete. If only in archive context, it stays as hard delete (`permanentDelete`). This is a scope decision the planner can make from the code.

2. **Does `update()` have callers passing `interactions`, `noteLog`, or `tasks`?**
   - What we know: The code currently destructures and handles these in `update()` (lines 153–197).
   - What's unclear: Which components currently pass these fields to `update()`. They must be migrated.
   - Recommendation: Planner should include a grep step to find all callers before removing these code paths from `update()`. Likely candidates: ProspectSheet.tsx interaction logging, note editing.

3. **Are there `.env` files on the deployment path that reference `VITE_ANTHROPIC_API_KEY`?**
   - What we know: ProspectSheet.tsx references `import.meta.env.VITE_ANTHROPIC_API_KEY`. Lovable Cloud is the deploy environment.
   - What's unclear: Whether the key is actually set in Lovable's environment variable config (we can't access the Lovable dashboard).
   - Recommendation: After the client-side reference is removed, document that the human operator should verify and remove the key from Lovable's environment variable settings. This is a manual out-of-band step.

---

## Sources

### Primary (HIGH confidence)
- Direct codebase inspection:
  - `src/hooks/useProspects.ts` — confirmed delete+reinsert pattern (lines 153–197), existing contact CRUD pattern (lines 502–556), archive stubs (lines 487–488)
  - `src/hooks/useOpportunities.ts` — confirmed partial error handling (toast on add failure, no rollback)
  - `src/hooks/useSignals.ts` — confirmed no error handling on `removeSignal`
  - `src/components/ProspectSheet.tsx` — confirmed direct Anthropic call with `VITE_ANTHROPIC_API_KEY` (lines 344–412), `dangerouslySetInnerHTML` on note.text (line 722)
  - `supabase/functions/meeting-prep/index.ts` — confirmed fully functional Edge Function exists
  - `supabase/functions/draft-outreach/index.ts` — confirmed `functions.invoke()` pattern and Deno env key handling
  - `src/components/ui/chart.tsx` line 70 — confirmed static CSS strings, not user content
  - `src/pages/ProspectPage.tsx` — confirmed NO `dangerouslySetInnerHTML` (grep returned zero matches)
  - `vitest.config.ts`, `src/test/setup.ts`, `src/test/example.test.ts` — confirmed test infrastructure exists and works
- `.planning/research/PITFALLS.md` — Pitfalls 1 (concurrent rollback), 2 (delete+reinsert window), 4 (RLS soft delete), 12 (DOMPurify incomplete), 13 (Edge Function cold start)
- `.planning/codebase/CONCERNS.md` — Critical issues: API key exposure, XSS, no error recovery

### Secondary (MEDIUM confidence)
- npm registry: `dompurify` 3.3.3, `@types/dompurify` 3.2.0 (verified via `npm view` command)
- Supabase RLS soft-delete behavior described in PITFALLS.md, sourced from official Supabase troubleshooting guide

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all libraries already installed except dompurify; versions verified via npm registry
- Architecture: HIGH — patterns are direct replications of existing working code in the codebase
- Pitfalls: HIGH — sourced from prior domain research in PITFALLS.md with official source citations
- Validation: HIGH — test infrastructure confirmed present and configured

**Research date:** 2026-03-26
**Valid until:** Stable — this phase touches no fast-moving external APIs. Valid until codebase changes.

# Phase 4: AI Capabilities — Research

**Researched:** 2026-03-30
**Domain:** Post-outreach tracking, batch interaction logging, localStorage state, Supabase CRUD
**Confidence:** HIGH

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- **D-01/D-02/D-03:** Two-step contact picker (accounts → contacts) already exists in `quirky-buck` branch — no redesign needed.
- **D-04:** Prompt-to-clipboard approach kept as-is. No in-app email generation via Anthropic API in this phase.
- **D-05:** When a prompt is generated, save the list of selected contact IDs + prospect IDs as a "pending outreach batch."
- **D-06:** A "Pending Outreach" indicator appears (badge on Draft Emails button or similar) showing the last batch.
- **D-07:** Clicking opens a modal showing the contacts from that batch with checkboxes.
- **D-08:** User checks off who they actually sent to, hits Save.
- **D-09:** On save, each checked contact gets: (a) Email interaction logged with today's date, (b) `last_touched` updated on the prospect, (c) `outreach` auto-bumped "Not Started" → "Actively Prospecting" (only if currently "Not Started").
- **D-10:** Interaction notes auto-generated: "Cold outreach via Draft Emails."
- **D-11:** Add "Mark Contacted" button to the bulk action bar (when prospects are selected).
- **D-12:** Clicking logs Email interactions + bumps stages on all selected prospects (same logic as D-09).
- **D-13:** For ad-hoc use — when user emails someone outside the draft flow.
- **D-14:** The pending outreach / mark-as-contacted screen is a Dialog/modal overlay.
- **D-15:** Territory table stays visible behind the modal for context.

### Claude's Discretion
- Badge placement (on Draft Emails button, in nav, or a notification dot).
- Whether to support multiple pending batches or just the most recent one (start with most recent).
- Exact wording of auto-generated interaction notes.
- Whether "Mark Contacted" bulk action appears in the bulk action bar or as a separate menu item.
- Batch storage: localStorage (simplest) or Supabase (persists across devices).

### Deferred Ideas (OUT OF SCOPE)
- Direct email sending integration (Gmail API, mailto: links).
- Smart contact suggestions (AI-driven staleness/priority ranking).
- Email template library.
- Tracking email opens/replies.
- In-app email generation via Anthropic API.
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| AI-01 | User can click a button in ProspectSheet to generate a draft cold email using prospect context | **NOTE: REQUIREMENTS.md AI-01 through AI-04 describe in-app API-driven email drafting — but CONTEXT.md D-04 explicitly locks this OUT of Phase 4 (prompt-to-clipboard only). Phase 4 scope is the post-outreach tracking workflow, not in-app generation. The planner must note this discrepancy and plan to the CONTEXT.md decisions.** |
| AI-02 | Generated email displays inline in ProspectSheet with copy button | Same discrepancy — deferred per D-04. |
| AI-03 | User can research a prospect (company intel) in ProspectSheet | Deferred per CONTEXT.md. |
| AI-04 | Research results display inline in ProspectSheet | Deferred per CONTEXT.md. |
</phase_requirements>

---

## Summary

Phase 4 as defined in CONTEXT.md is a **post-outreach tracking workflow**, not the AI email generation described in REQUIREMENTS.md AI-01 through AI-04. CONTEXT.md D-04 explicitly locks out in-app email generation. The actual scope is: (1) persist the contact selection from `ContactPickerDialog` as a "pending outreach batch," (2) surface a badge on the Draft Emails button, (3) open a `PendingOutreachDialog` for marking who was actually contacted, and (4) add a "Mark Contacted" bulk action to the main table.

The `quirky-buck` branch contains `ContactPickerDialog.tsx` and `buildContactPrompt.ts` which are the upstream dependencies. These files do NOT yet save a batch to localStorage — that's the primary new work. Everything else (Dialog component, `addInteraction` hook, `bulkUpdate` hook, `STAGES` constants, sonner toasts) already exists on main.

**Primary recommendation:** Merge or cherry-pick `ContactPickerDialog.tsx` and `buildContactPrompt.ts` from `quirky-buck` into main as part of Wave 0 setup, then add batch persistence and the two new UI surfaces (PendingOutreachDialog + bulk Mark Contacted).

---

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| shadcn Dialog | installed | PendingOutreachDialog modal | Already used for all modals in project |
| shadcn Checkbox | installed | Contact row selection in dialog | Used in ContactPickerDialog on quirky-buck |
| shadcn Badge | installed | Pending count indicator on Draft Emails button | Already used in project |
| shadcn ScrollArea | installed | Contact list with variable height | Used elsewhere in ProspectSheet |
| shadcn Separator | installed | Between account groups in dialog | Available, no install needed |
| sonner toast | ^1.7.4 | Success/error feedback | Project standard |
| localStorage | browser native | Persist pending batch across session | Simplest persistence, single-user tool |

### No New Dependencies Required
All components exist. No `npm install` needed.

---

## Architecture Patterns

### Recommended Project Structure — New Files
```
src/
  components/
    ContactPickerDialog.tsx      # FROM quirky-buck (cherry-pick / merge)
    PendingOutreachDialog.tsx    # NEW — mark-as-sent modal
  lib/
    buildContactPrompt.ts        # FROM quirky-buck (cherry-pick / merge)
    pendingBatch.ts              # NEW — localStorage read/write helpers
```

### Pattern 1: Pending Batch — localStorage Shape
**What:** A serializable batch stored under key `tp-pending-outreach`.
**When to use:** Set when user hits "Generate Prompt" in ContactPickerDialog; cleared when user saves PendingOutreachDialog.

```typescript
// src/lib/pendingBatch.ts
const BATCH_KEY = "tp-pending-outreach";

export interface PendingBatchEntry {
  contactId: string;
  contactName: string;
  contactTitle: string;
  prospectId: string;
  prospectName: string;
}

export interface PendingBatch {
  entries: PendingBatchEntry[];
  savedAt: string; // ISO timestamp
}

export function savePendingBatch(batch: PendingBatch): void {
  localStorage.setItem(BATCH_KEY, JSON.stringify(batch));
}

export function loadPendingBatch(): PendingBatch | null {
  const raw = localStorage.getItem(BATCH_KEY);
  if (!raw) return null;
  try { return JSON.parse(raw); } catch { return null; }
}

export function clearPendingBatch(): void {
  localStorage.removeItem(BATCH_KEY);
}
```

### Pattern 2: Mark Contacts as Sent — Interaction Logging
**What:** For each checked contact, log an Email interaction and conditionally bump outreach stage.
**Source:** `src/hooks/useProspects.ts` — `addInteraction` and `update` already handle this.

```typescript
// Called once per checked entry in PendingOutreachDialog "Mark as Sent"
const today = new Date().toISOString().split("T")[0]; // YYYY-MM-DD

await addInteraction(prospectId, {
  type: "Email",
  date: today,
  notes: "Cold outreach via Draft Emails",
});

// Conditional stage bump — only "Not Started" → "Actively Prospecting"
const prospect = data.find(p => p.id === prospectId);
if (prospect?.outreach === "Not Started") {
  await update(prospectId, { outreach: "Actively Prospecting" });
}
// last_touched is auto-updated by the update() hook on any update() call
```

### Pattern 3: Bulk Mark Contacted (Ad-Hoc)
**What:** From selected rows in TerritoryPlanner, mark all selected prospects as contacted.
**Challenge:** The bulk action needs to log one interaction per prospect, but `bulkUpdate` only handles flat fields — it does NOT call `addInteraction`. Need to loop `addInteraction` calls.

```typescript
// In TerritoryPlanner — handleBulkMarkContacted
const today = new Date().toISOString().split("T")[0];
const ids = Array.from(selected);

await Promise.all(ids.map(async (id) => {
  await addInteraction(id, {
    type: "Email",
    date: today,
    notes: "Cold outreach via Draft Emails",
  });
  const p = data.find(x => x.id === id);
  if (p?.outreach === "Not Started") {
    await update(id, { outreach: "Actively Prospecting" });
  }
}));
toast.success(`Logged outreach for ${ids.length} accounts.`);
```

**Note:** `Promise.all` fires all inserts in parallel. With 300 accounts this could generate many concurrent requests — but the bulk action bar is only visible when rows are explicitly selected, so practical batch size is limited. This is acceptable for a single-user personal tool.

### Pattern 4: Badge on Draft Emails Button
**What:** Read localStorage on mount/focus, show Badge count when batch exists.
**Where:** TerritoryPlanner.tsx — the Draft Emails button area.

```typescript
const [pendingBatch, setPendingBatch] = useState<PendingBatch | null>(null);

// On mount, load pending batch
useEffect(() => {
  setPendingBatch(loadPendingBatch());
}, []);

// Re-read when dialog closes (batch may have been saved or cleared)
const handleContactPickerClose = (open: boolean) => {
  setShowContactPicker(open);
  if (!open) setPendingBatch(loadPendingBatch());
};
```

### Anti-Patterns to Avoid
- **Do NOT call `update(id, { interactions: [...] })`** for logging interactions — this triggers full sub-collection replace (deletes all existing interactions). Always use `addInteraction()` instead.
- **Do NOT call `bulkUpdate` for interaction logging** — `bulkUpdate` only handles flat prospect fields.
- **Do NOT block the dialog while saving** — interactions are saved in parallel; show a loading spinner on the button but allow the list to remain visible.
- **Do NOT show per-row toasts** during the batch save loop — one success/error toast at the end (per UI-SPEC).

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Modal overlay | Custom CSS overlay | shadcn Dialog | Radix handles focus trap, keyboard nav, a11y |
| Checkbox state management | Custom checkbox | shadcn Checkbox | Consistent with existing ContactPickerDialog |
| Toast notifications | Custom alert | sonner `toast.success/error` | Already project standard |
| Date formatting for interaction logs | Manual `new Date()` | `new Date().toISOString().split("T")[0]` | Simple string op, no date-fns needed |
| Scroll management in contact list | overflow-y div | shadcn ScrollArea | Consistent scrollbar styling across themes |

---

## Common Pitfalls

### Pitfall 1: Sub-Collection Replace on Interaction Log
**What goes wrong:** Developer passes `interactions: [...]` to `update()`, wiping all previous interactions.
**Why it happens:** `update()` does full replace on sub-collections (documented in CLAUDE.md).
**How to avoid:** Always use `addInteraction(prospectId, interactionObject)` — never pass interactions array to `update()`.
**Warning signs:** Interaction history disappears after mark-as-sent.

### Pitfall 2: last_touched Not Updating
**What goes wrong:** `last_touched` stays stale after marking contacts as sent.
**Why it happens:** `last_touched` auto-updates in the `update()` hook on any `update()` call. If you only call `addInteraction()` without calling `update()`, the date does not change.
**How to avoid:** The conditional stage bump (`update(id, { outreach: "..." })`) will trigger the auto-update. For prospects already "Actively Prospecting" where the bump doesn't fire, you must also call `update(id, {})` or use a no-op field update. Simplest: always call `update(id, { outreach: prospect.outreach })` to guarantee the touch date refreshes.

**Actually correct approach:** Check the `update()` source — it sets `last_touched: new Date().toISOString().split("T")[0]` on every call. So any update call (even `{ outreach: sameValue }`) refreshes it. Always call `update()` alongside `addInteraction()`.

### Pitfall 3: ContactPickerDialog Only on quirky-buck
**What goes wrong:** Plan tasks reference `ContactPickerDialog.tsx` which doesn't exist on `main`.
**Why it happens:** The file was built in the `quirky-buck` branch and never merged.
**How to avoid:** Wave 0 task must cherry-pick or merge these files from `quirky-buck` into main before any other tasks can proceed.
**Files needed from quirky-buck:**
- `src/components/ContactPickerDialog.tsx`
- `src/lib/buildContactPrompt.ts`
- The `showContactPicker` / `ContactPickerDialog` integration in `TerritoryPlanner.tsx`

### Pitfall 4: TerritoryPlanner.tsx Already at ~2000 Lines
**What goes wrong:** Adding more inline logic grows it further, worsening UX-03/UX-04 goals.
**Why it happens:** All bulk action handlers live inline.
**How to avoid:** Extract `handleBulkMarkContacted` as a named function near other bulk handlers, not inline JSX. Keep the component wiring minimal.

### Pitfall 5: Batch Storage Decision — localStorage vs Supabase
**Recommendation:** Use localStorage (`tp-pending-outreach` key — matches existing `VIEWS_KEY = "tp-saved-views"` pattern). Rationale: Single user, personal tool, batch is short-lived (hours), no cross-device use case stated. Supabase adds async complexity for zero gain here.

---

## Code Examples

### Verified: addInteraction signature (from useProspects.ts line 519)
```typescript
const addInteraction = async (
  prospectId: string,
  interaction: Omit<InteractionLog, "id">
) => void
// interaction shape: { type: "Email", date: "YYYY-MM-DD", notes: string }
```

### Verified: STAGES constant (from data/prospects.ts)
```typescript
STAGES = ["Not Started", "Actively Prospecting", "Meeting Booked", "Closed Lost", "Closed Won"]
// Stage bump rule: "Not Started" → "Actively Prospecting" only
```

### Verified: localStorage key pattern (from TerritoryPlanner.tsx)
```typescript
const VIEWS_KEY = "tp-saved-views"; // existing pattern
// New key to add: tp-pending-outreach
```

### Verified: Bulk action bar trigger (TerritoryPlanner.tsx line 1559)
```tsx
{selected.size > 0 && (
  // bulk action bar renders here
  // "Bulk Edit" and "Delete" already present
  // Add "Mark Contacted" after "Bulk Edit", before "Delete"
)}
```

### Verified: Draft Emails button location (quirky-buck, TerritoryPlanner.tsx line 1178-1180)
```tsx
<Button variant="outline" onClick={() => setShowContactPicker(true)} ...>
  <Mail className="w-4 h-4" /> Draft Emails
</Button>
// Badge renders as child of this button when pendingBatch exists
```

---

## Runtime State Inventory

> This phase does not involve rename/refactor/migration. No stored data keys are being renamed.

New localStorage key introduced: `tp-pending-outreach`. No migration needed — it's net-new.

---

## Environment Availability

Step 2.6: SKIPPED — phase is pure client-side code/component work. No external CLIs, services, or runtimes beyond the existing Bun + Vite + Supabase stack.

---

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest ^3.2.4 + @testing-library/react ^16.0.0 |
| Config file | `vitest.config.ts` |
| Quick run command | `bun run vitest run src/components/PendingOutreachDialog.test.tsx` |
| Full suite command | `bun run vitest run` |

### Phase Requirements → Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| AI-01 | (Deferred per CONTEXT.md D-04) | — | — | N/A |
| AI-02 | (Deferred per CONTEXT.md D-04) | — | — | N/A |
| AI-03 | (Deferred per CONTEXT.md D-04) | — | — | N/A |
| AI-04 | (Deferred per CONTEXT.md D-04) | — | — | N/A |
| D-05 | savePendingBatch writes to localStorage | unit | `bun run vitest run src/lib/pendingBatch.test.ts` | ❌ Wave 0 |
| D-06 | Badge renders when batch exists | unit | `bun run vitest run src/components/TerritoryPlanner.test.tsx` | ✅ (existing, extend) |
| D-07/D-08 | PendingOutreachDialog renders contacts with checkboxes | unit | `bun run vitest run src/components/PendingOutreachDialog.test.tsx` | ❌ Wave 0 |
| D-09/D-10 | Mark as Sent calls addInteraction + update per contact | unit | `bun run vitest run src/components/PendingOutreachDialog.test.tsx` | ❌ Wave 0 |
| D-11/D-12 | Mark Contacted bulk action logs interaction + bumps stage | unit | `bun run vitest run src/components/TerritoryPlanner.test.tsx` | ✅ (existing, extend) |

### Sampling Rate
- **Per task commit:** `bun run vitest run src/lib/pendingBatch.test.ts src/components/PendingOutreachDialog.test.tsx`
- **Per wave merge:** `bun run vitest run`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps
- [ ] `src/lib/pendingBatch.test.ts` — covers D-05 (batch save/load/clear)
- [ ] `src/components/PendingOutreachDialog.test.tsx` — covers D-07, D-08, D-09, D-10

*(Existing `src/components/TerritoryPlanner.test.tsx` covers D-06 and D-11/D-12 with new test cases)*

---

## Open Questions

1. **ContactPickerDialog merge strategy**
   - What we know: The file exists on `quirky-buck` and is needed as a dependency.
   - What's unclear: Whether to cherry-pick commits or copy files manually. `quirky-buck` may have other WIP changes that shouldn't come to main.
   - Recommendation: Copy the files manually (not cherry-pick) to avoid bringing in unrelated quirky-buck changes. Files needed: `ContactPickerDialog.tsx`, `buildContactPrompt.ts`, and the TerritoryPlanner integration block.

2. **last_touched refresh for non-bumped prospects**
   - What we know: `update()` auto-sets `last_touched`. Stage bump calls `update()`. For prospects NOT in "Not Started", the bump doesn't fire.
   - What's unclear: Should we still refresh `last_touched` for prospects that were emailed but already "Actively Prospecting"?
   - Recommendation: Yes — always call `update(id, { outreach: prospect.outreach })` alongside `addInteraction()` to guarantee `last_touched` refreshes regardless of stage bump condition.

3. **REQUIREMENTS.md AI-01 through AI-04 mismatch**
   - What we know: REQUIREMENTS.md describes in-app Anthropic API-driven email drafting. CONTEXT.md D-04 locks this out of Phase 4.
   - What's unclear: Are AI-01 through AI-04 deferred to a future phase, or are they being fulfilled differently?
   - Recommendation: Planner should note these as "deferred to v2" in the plan and reference CONTEXT.md D-04 as the authority. Do not attempt to implement in-app API email drafting in this phase.

---

## Sources

### Primary (HIGH confidence)
- `/Users/micahbank/territory-plan-buddy/src/hooks/useProspects.ts` — `addInteraction`, `update`, `bulkUpdate` API verified by direct read
- `/Users/micahbank/territory-plan-buddy/src/components/TerritoryPlanner.tsx` — bulk action bar pattern, localStorage key pattern, Draft Emails button location verified
- `claude/quirky-buck` branch — `ContactPickerDialog.tsx`, `buildContactPrompt.ts` verified by git show
- `/Users/micahbank/territory-plan-buddy/.planning/phases/04-ai-capabilities/04-CONTEXT.md` — locked decisions
- `/Users/micahbank/territory-plan-buddy/.planning/phases/04-ai-capabilities/04-UI-SPEC.md` — approved UI contract
- `/Users/micahbank/territory-plan-buddy/CLAUDE.md` — project conventions and gotchas

### Secondary (MEDIUM confidence)
- shadcn Dialog, Checkbox, Badge, ScrollArea — versions inferred from components.json; all confirmed installed by existing usage in project

---

## Project Constraints (from CLAUDE.md)

The planner MUST verify compliance with these directives:

- Use `bun` as package manager (not npm/yarn)
- All internal imports use `@/` prefix, never relative paths
- New components: named export (not default), PascalCase `.tsx`
- No direct Supabase AI/Anthropic calls from client — route through Edge Functions (SEC-01). **Note: Phase 4 has no new AI calls — prompt-to-clipboard is client-only. This constraint is N/A for this phase.**
- Do NOT modify `src/components/ui/` files
- Do NOT remove custom CSS classes (`glass-card`, `aging-dot`, etc.)
- Do NOT grow `TerritoryPlanner.tsx` — extract to sub-components
- Tailwind utility classes only — avoid arbitrary values
- shadcn/ui for all new UI components — check `components.json` before adding new UI
- Optimistic updates pattern: update local state first, then Supabase sync
- `SCREAMING_SNAKE_CASE` for constants; `camelCase` for functions/variables; `PascalCase` for components/interfaces

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all libraries already installed, verified by direct file inspection
- Architecture: HIGH — hook signatures verified by direct read, quirky-buck code verified by git show
- Pitfalls: HIGH — based on documented CLAUDE.md gotchas and direct code inspection
- Requirements mapping: HIGH — CONTEXT.md decisions are explicit and clear

**Research date:** 2026-03-30
**Valid until:** 2026-04-30 (stable stack, no fast-moving dependencies)

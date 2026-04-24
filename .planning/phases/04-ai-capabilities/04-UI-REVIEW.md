# Phase 4 — UI Review

**Audited:** 2026-04-24
**Baseline:** `04-UI-SPEC.md` (approved design contract)
**Screenshots:** not captured (no dev server detected on ports 3000/5173/8080)

---

## Pillar Scores

| Pillar | Score | Key Finding |
|--------|-------|-------------|
| 1. Copywriting | 3/4 | All spec-mandated strings match; missing error-toast path for Mark-as-Sent failure |
| 2. Visuals | 3/4 | Clear hierarchy, good badge affordance; several non-semantic clickable `<span>`s |
| 3. Color | 4/4 | Zero hardcoded hex/rgb, accent reserved to CTAs, destructive badge matches spec |
| 4. Typography | 3/4 | ContactPickerDialog uses `text-[10px]` and `text-[11px]` arbitrary values outside declared scale |
| 5. Spacing | 4/4 | All spacing on 4px grid; only arbitrary values are viewport constraints (`max-h-[400px]`, `h-[90vh]`) |
| 6. Experience Design | 2/4 | Mark-as-Sent async has no error toast; clickable spans lack keyboard support; empty state good |

**Overall: 19/24**

---

## Top 3 Priority Fixes

1. **Mark-as-Sent failure is silent** — `handleMarkSent` in `TerritoryPlanner.tsx:839` awaits Supabase calls with no try/catch. On failure the dialog's catch (`PendingOutreachDialog.tsx:82`) swallows the error with a comment "Error toast handled by parent" but the parent never toasts. User loses work feedback. **Fix:** wrap `handleMarkSent` body in try/catch and call `toast.error("Failed to log some interactions. Check your connection and try again.")` on throw (spec copy already defined, UI-SPEC.md line 159).

2. **Non-semantic clickable `<span>` elements** — `PendingOutreachDialog.tsx:119-131, 171-183` use `<span onClick>` for "Select All", "Mark all as sent", "Start new draft", "Discard all". No keyboard accessibility, no role, no focus ring. **Fix:** replace with `<button type="button" className="...">` — text classes already match, just swap the tag and add `type="button"` so the dialog form doesn't submit.

3. **Arbitrary typography sizes outside declared scale** — `ContactPickerDialog.tsx:352, 380, 381, 417` use `text-[10px]` and `text-[11px]`. Spec declares only `text-xs` (12px) as smallest size (UI-SPEC.md line 55-58). These values flatten visual hierarchy and make dialogs feel dense. **Fix:** replace with `text-xs` (12px) or raise the metadata to `text-sm` where the information is primary (contact title/email).

---

## Detailed Findings

### Pillar 1: Copywriting (3/4)

**Spec-contract match — all pass:**
- Primary CTA — "Mark as Sent" ✓ (`PendingOutreachDialog.tsx:208`)
- Bulk CTA — "Mark Contacted" ✓ (`TerritoryPlanner.tsx:1732`)
- Secondary link — "Mark all as sent" ✓ (`PendingOutreachDialog.tsx:130`)
- Dialog subtitle — "Review who you sent emails to and confirm." ✓ (`:105`)
- Empty state heading — "No pending outreach" ✓ (`:111`)
- Empty state body — "Generate a prompt to start a batch. Your selected contacts will appear here." ✓ (`:113`)
- Bulk inline confirmation — "Log Email + bump stage for {N} accounts?" ✓ (`TerritoryPlanner.tsx:1736`)
- Loading state — "Saving..." ✓ (`PendingOutreachDialog.tsx:208`)
- Success toast — bulk "Logged outreach for N accounts." ✓ (`TerritoryPlanner.tsx:912`)
- Success toast — Mark-sent "Logged N outreach interaction(s)…" ✓ enriched with pluralization and "still pending" remainder (`:875`)
- Error toast — bulk "Failed to log outreach for some accounts. Reload to verify." ✓ (`:915`)
- Auto-generated notes — enriched per user's Task 3 request: "Cold outreach to {name} ({title}) via Draft Emails" instead of generic "via Draft Emails" (`:848`). This is a deviation from spec ("Cold outreach via Draft Emails") but improves information density — not a regression.

**Gap — missing error copy path:**
- Spec line 159: `"Failed to log some interactions. Check your connection and try again."` — never rendered. `handleMarkSent` has no try/catch. See Top Fix #1.

**Generic-label scan:** Found "Submit" / "Click Here" / "went wrong" — zero hits across phase artifacts.

### Pillar 2: Visuals (3/4)

- **Focal point:** Draft Emails button is clearly primary in header (`outline` variant with primary border, destructive badge; `TerritoryPlanner.tsx:1293-1301`). Badge position top-right with negative margins is textbook affordance.
- **Icon+label pairing:** `<Mail />` paired with "Draft Emails" text, `<Mail />` paired with "Mark Contacted" — no icon-only buttons lacking labels.
- **Dialog hierarchy:** `text-lg font-semibold` title → `text-sm text-muted-foreground` subtitle → `text-xs text-muted-foreground` group labels → `text-sm` contact names → `text-xs text-muted-foreground` titles. Pyramid structure matches spec.
- **Gap:** Four action spans masquerading as buttons (see Fix #2). Visual affordance (underline + hover color) hints at interactivity but tag choice hurts screen-reader and keyboard users. Also `StrengthDot` and `RoleBadge` in ContactPickerDialog lack `aria-label` wrapping (dot-only).
- **Separator usage:** `<Separator />` between account groups (`PendingOutreachDialog.tsx:138`) matches spec's grouped-list requirement.

### Pillar 3: Color (4/4)

- **Hardcoded colors:** zero (`grep "#[0-9a-fA-F]\|rgb(" PendingOutreachDialog.tsx ContactPickerDialog.tsx` → no matches).
- **Accent discipline:** `bg-primary` / `text-primary` / `border-primary` used only on Generate Prompt button, Mark as Sent button (via default variant), Draft Emails border accent, and the success Sparkles icon background (`bg-primary/10`). Matches spec's 10% accent rule.
- **Destructive:** Badge uses `variant="destructive"` per spec (`TerritoryPlanner.tsx:1297, 1367`). "Discard all" link hovers to destructive — appropriate signal.
- **Dark-mode safe:** all tokens resolve via `hsl(var(--token))`; amber/emerald/rose classes in `lastContactedLabel` (`ContactPickerDialog.tsx:24-28`) use Tailwind semantic pairs (`text-emerald-600 dark:text-emerald-400`) — correct.

### Pillar 4: Typography (3/4)

Spec-declared scale: `text-xs` (12) / `text-sm` (14) / `text-base` (16) / `text-lg` (20). Weights: 400 + 600.

- `PendingOutreachDialog.tsx` — fully compliant: only `text-xs`, `text-sm`, `text-base`, `text-lg`; only `font-semibold`, `font-medium` (noted: spec allows 400 + 600; `font-medium` = 500 is used for account group labels — minor deviation, justified for group-label hierarchy).
- `ContactPickerDialog.tsx` — **deviations:**
  - `text-[10px]` at lines 352, 381, 417 — sub-spec size.
  - `text-[11px]` at lines 379, 380 — sub-spec size.
  - These create 5-6 distinct sizes in one dialog vs. spec's 4.
  - Note: ContactPickerDialog was ported from `quirky-buck` in Plan 01 and not rewritten to the Phase 4 spec. Spec explicitly covers Pending Outreach dialog; ContactPicker was inherited.
- Weight distribution: `font-semibold` (correct for titles), `font-medium` (group labels, contact names). No `font-bold` / `font-extrabold`.

### Pillar 5: Spacing (4/4)

- All spacing classes on 4px grid: `p-0`, `p-4`, `px-3`, `px-6`, `py-1`, `py-2`, `py-8`, `pt-1`, `pt-3`, `pt-6`, `pb-0`, `pb-2`, `gap-1`, `gap-1.5`, `gap-2`, `gap-2.5`, `gap-3`, `space-y-1`, `space-y-2`, `space-y-4`, `mb-2`, `mt-0.5`, `ml-auto`, `ml-1`.
- Arbitrary values present but **structurally justified:**
  - `max-h-[400px]` — scroll area constraint (PendingOutreachDialog.tsx:134). Spec explicitly mentions "contact list inside Pending Outreach dialog (variable height list)" — this enables it.
  - `h-[90vh]`, `max-h-[90vh]`, `sm:max-w-[900px]` in ContactPickerDialog — layout constraints, not spacing.
  - `min-w-[20px]` on badge — matches shadcn Badge geometry for single/double digit count.
- `max-w-lg` on PendingOutreachDialog (`:101`) matches spec exactly ("Dialog width: max-w-lg").
- Bulk-bar vertical rhythm uses `h-7` on 7-unit grid — pre-existing, matches spec exception note.

### Pillar 6: Experience Design (2/4)

**Strong coverage:**
- Loading state: `saving` flag shows "Saving..." on Mark-as-Sent button + disables during async (`:207-208`).
- Empty state: full-height, dual-line empty message (`:109-115`).
- Disabled states: Mark as Sent disabled at zero checked or during save or empty batch (`:206`). "Didn't send" disabled identically (`:198`).
- Bulk inline confirmation before destructive-ish bulk logging (`TerritoryPlanner.tsx:1734-1740`). Auto-resets on selection change via useEffect (per SUMMARY).
- Clear-all-on-close for ContactPickerDialog state (`:222-232`).
- Post-copy guidance view — guides user to next step rather than dead-ending on clipboard copy (`:438-462`). Good UX.

**Gaps (scoring driver):**
1. **No error toast on Mark-as-Sent failure** (`handleMarkSent` TerritoryPlanner.tsx:839-876). Top Fix #1. Spec-declared error copy never surfaces. Violates core project value "must never silently lose data / visibly fail."
2. **Clickable spans** (`PendingOutreachDialog.tsx:119-131, 171-183`) — four interactive elements not keyboard accessible. Hitting Tab skips them entirely; screen readers don't announce them as actionable.
3. **Stage bump when not "Not Started"** — `handleMarkSent` calls `update(pid, { outreach: prospect.outreach })` even when stage is already past Not Started (`:861`). This is a no-op write to bump `last_touched` but produces an unnecessary DB round-trip and an audit-log entry. Acceptable but wasteful.
4. **No toast confirmation of stage bumps** — intentional per spec ("Stage bump is silent") ✓, but no visual feedback in the row itself either. If user stays on the same view, they won't see the Not Started → Actively Prospecting transition without a reload. Minor.
5. **Auto-open PendingOutreachDialog after ProspectSheet close** (`:504-515`) uses 200ms setTimeout — feels like a workaround for Dialog teardown order. Works but fragile.

---

## Registry Safety

Registry audit: 0 third-party blocks checked (UI-SPEC lists only shadcn official; `components.json` confirms slate/default preset). No flags. No action required.

---

## Files Audited

- `src/components/ContactPickerDialog.tsx` (467 lines)
- `src/components/PendingOutreachDialog.tsx` (216 lines)
- `src/components/TerritoryPlanner.tsx` (focused on lines 30-35, 490-515, 838-918, 1270-1406, 1690-1745, 2330-2365)
- `src/lib/buildContactPrompt.ts` (197 lines)
- `src/index.css` (token review, lines 1-80)
- `.planning/phases/04-ai-capabilities/04-UI-SPEC.md` (baseline)
- `.planning/phases/04-ai-capabilities/04-CONTEXT.md`, `04-VERIFICATION.md`, `04-01-SUMMARY.md`, `04-02-SUMMARY.md`

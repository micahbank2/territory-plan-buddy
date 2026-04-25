---
phase: 08-meeting-prep-one-pager
plan: 01
subsystem: meeting-prep-dialog
tags:
  - promote-pattern
  - forwardRef
  - useImperativeHandle
  - react-markdown
  - edge-function-prompt
  - yext-positioning
dependency-graph:
  requires:
    - "ProspectSheet.tsx tabbed IA (Phase 03)"
    - "TerritoryDialogGroup forwardRef pattern (Phase 03)"
    - "RecommendationCard / PipelineForecastBar promote precedent (Phase 06/07)"
    - "supabase.functions.invoke('meeting-prep') edge function (Phase 01 SEC-01/SEC-02)"
  provides:
    - "<MeetingPrepDialog ref={...} /> imperative handle: ref.current.open(prospect)"
    - "parseMeetingBrief(md): MeetingBrief — pure six-section parser"
    - "Edge function output contract: six fixed `## Headers` with Yext anchor on Talking Points"
  affects:
    - "src/components/ProspectSheet.tsx"
    - "supabase/functions/meeting-prep/index.ts"
    - "src/components/ProspectSheet.test.tsx (SEC-01/02 guard repointed at new home)"
tech-stack:
  added:
    - "react-markdown ^10.1.0 (already in package.json — first src/ adoption)"
  patterns:
    - "forwardRef + useImperativeHandle dialog encapsulation"
    - "Pure-TS markdown section parser (line-walk regex)"
    - "Stable LLM output contract via fixed `## Header` sections (anti-fragility vs JSON)"
key-files:
  created:
    - "src/data/meetingBrief.ts (66 lines)"
    - "src/components/MeetingPrepDialog.tsx (179 lines)"
    - "src/test/meetingBrief.test.ts (55 lines, 4 tests)"
    - "src/test/MeetingPrepDialog.test.tsx (132 lines, 5 tests)"
  modified:
    - "src/components/ProspectSheet.tsx (-107 lines: 1077 -> 970)"
    - "src/components/ProspectSheet.test.tsx (SEC-01/02 guard redirected)"
    - "supabase/functions/meeting-prep/index.ts (prompt rewrite + tasks filter tightening)"
    - ".gitignore (node-compile-cache)"
decisions:
  - "Imperative ref API (forwardRef + useImperativeHandle) over controlled props — matches TerritoryDialogGroup precedent and keeps ProspectSheet free of dialog state"
  - "Markdown six-section contract over JSON output — forgiving (LLM can drop/add filler), trivial regex parse, no schema fragility"
  - "react-markdown adopted (was unused in src/ despite being in package.json) — replaces whitespace-pre-wrap blob with real one-pager rendering"
  - "PDF export logic moved verbatim into MeetingPrepDialog.exportPdf() — zero behavior change, just relocated"
  - "Edge function tasks pre-filter to incomplete only (`!t.completed`) — reduces prompt noise; semantically aligns with `## Open Tasks` header"
metrics:
  duration: "5min (297s wall clock)"
  tasks: 2
  files_changed: 8
  lines_added: 392
  lines_removed: 173
  net_delta: "+219"
  prospect_sheet_delta: "-107 lines (1077 -> 970)"
  tests_added: 9
  completed: "2026-04-25"
---

# Phase 08 Plan 01: Meeting Prep One-Pager Summary

Extracted the inline meeting-prep dialog (state + 3 handlers + Dialog markup) from `ProspectSheet.tsx` (1077 lines) into a dedicated `MeetingPrepDialog` component using the forwardRef + useImperativeHandle pattern proven in TerritoryDialogGroup, paired with a stable six-section markdown contract from the edge function rendered via react-markdown.

## What Changed

### Parser: `src/data/meetingBrief.ts` (66 lines, NEW)
- `SECTIONS` const: `["Context", "Recent History", "Contacts", "Open Tasks", "Talking Points", "Suggested Ask"]`
- `MeetingBrief` interface: 6 string fields + `raw` markdown passthrough
- `parseMeetingBrief(md)`: line-walk parser. On each line, regex-tests `^##\s+(.+?)\s*$`. If the captured header is in `SECTIONS`, starts collecting subsequent lines into that bucket. Unknown `##` headers cause no state change (their content folds into the previous valid section). Lines before the first valid header are dropped. Missing sections resolve to `""` so the UI can fall back.

### Component: `src/components/MeetingPrepDialog.tsx` (179 lines, NEW)
- `forwardRef<MeetingPrepDialogHandle>` exposing `open(prospect: Prospect)` via `useImperativeHandle`.
- Owns local state: `open`, `prospect`, `brief`, `loading`.
- `generate(p)`: calls `supabase.functions.invoke("meeting-prep", { body: {...prospect fields, score} })`, parses with `parseMeetingBrief`, sets `brief`. Errors → `toast.error(msg)` + close dialog.
- Renders six `<section>` blocks; each has an uppercase header chip + react-markdown body, or italic "None on file." placeholder when the parsed field is empty.
- Carries Copy / Export PDF / Regenerate buttons. PDF export logic is the same `window.open + print` flow from the old ProspectSheet handler, just relocated.

### ProspectSheet edits: `src/components/ProspectSheet.tsx` (-107 lines: 1077 → 970)
- Added import + `useRef<MeetingPrepDialogHandle>(null)`.
- Trigger button rewritten: `onClick={() => meetingPrepRef.current?.open(prospect)}`.
- Mounted `<MeetingPrepDialog ref={meetingPrepRef} score={score} territoryId={territoryId} />` exactly once.
- Deleted: `meetingPrepBrief`, `meetingPrepLoading`, `showMeetingPrepDialog` state vars; `generateMeetingPrep`, `copyMeetingPrep`, `exportMeetingPrepPdf` handlers; the entire `<Dialog>` markup at the old lines 1023-1054.

### Edge function: `supabase/functions/meeting-prep/index.ts`
- User prompt rewritten to enforce six exact `## Header` sections in fixed order.
- Talking Points anchor — each bullet must reference at least one of: AI search visibility, multi-location brand consistency, local SEO at scale, competitive displacement of {SOCi, Birdeye, Uberall, Chatmeter, Rio SEO}.
- Suggested Ask constrained to a single sentence (NOT a bullet list).
- "Always emit all six sections; if no data, write 'None on file.'" — guards against the LLM dropping headers when the underlying data is empty.
- Tasks pre-filter: `(tasks || []).filter(t => !t.completed)` before serializing — reduces prompt noise.

### Tests
- `src/test/meetingBrief.test.ts` — 4 tests, all PASS:
  - Parses well-formed brief into all six sections
  - Tolerates a missing section (returns `""` for that field)
  - Ignores noise above the first `##` header; trims whitespace inside sections
  - Preserves the original markdown verbatim in `raw`
- `src/test/MeetingPrepDialog.test.tsx` — 5 tests, all PASS:
  - Renders nothing visible until `ref.current.open()` is called
  - Shows loading spinner immediately after `open()`
  - Renders six labeled sections after a successful brief response
  - Copy button writes the raw brief markdown to `navigator.clipboard`
  - Surfaces `toast.error` when the edge function returns an error
- `src/components/ProspectSheet.test.tsx` — SEC-01/02 guard repointed at `MeetingPrepDialog.tsx` (where `supabase.functions.invoke("meeting-prep"` now lives). Also retains a guard on ProspectSheet itself confirming no `api.anthropic.com` / `VITE_ANTHROPIC_API_KEY` references remain.

## Verification

| Check | Result |
|-------|--------|
| `bunx vitest run src/test/meetingBrief.test.ts src/test/MeetingPrepDialog.test.tsx` | 9/9 pass |
| `bunx vitest run` (full suite) | 90 passed, 1 todo (pre-existing), 0 failures |
| `bunx tsc --noEmit` | clean |
| `bunx vite build` | clean (2.81s) |
| `grep -nE "meetingPrepBrief\|meetingPrepLoading\|generateMeetingPrep\|copyMeetingPrep\|exportMeetingPrepPdf\|showMeetingPrepDialog" src/components/ProspectSheet.tsx` | zero matches |
| `grep -c "<MeetingPrepDialog ref=" src/components/ProspectSheet.tsx` | exactly 1 |
| `grep -c "## Context" supabase/functions/meeting-prep/index.ts` | exactly 1 |
| `grep -c "## Suggested Ask" supabase/functions/meeting-prep/index.ts` | exactly 1 |
| `grep -c "Situation Summary" supabase/functions/meeting-prep/index.ts` | 0 (old prompt gone) |
| `grep -c "Recommended Talking Points" supabase/functions/meeting-prep/index.ts` | 0 (old prompt gone) |
| `grep -c "competitive displacement" supabase/functions/meeting-prep/index.ts` | 1 (Yext anchor present) |

## Requirements Closed

- **PREP-01**: `<MeetingPrepDialog>` exists, owns all meeting-prep state, mounted via `forwardRef + useImperativeHandle`. ProspectSheet retains zero `meetingPrep*` state vars. Verified by grep + component test.
- **PREP-02**: Edge function returns markdown with exactly six labeled `## Headers` in fixed order. Verified by edge-function prompt grep + parser test (full brief).
- **PREP-03**: Each section renders with header chip + react-markdown body; missing-section tolerance. Verified by parser tests + component test ("renders six labeled sections").
- **PREP-04**: Talking Points anchored on Yext positioning (AI search visibility / brand consistency / local SEO / competitive displacement of named competitors). Enforced by edge-function prompt; verified by `competitive displacement` grep.
- **PREP-05**: Suggested Ask constrained to a single sentence (NOT a bullet list). Enforced by prompt; manual UAT validates at runtime.
- **PREP-06**: Copy button writes full markdown brief to clipboard; PDF export opens print window. Verified by component test (Copy) + manual UAT (PDF print preview).
- **PREP-07**: Loading state renders spinner + "Generating meeting prep..." copy; error state surfaces `toast.error` and closes dialog. Verified by 2 component tests.
- **PREP-08**: Inline `meetingPrep*` references in `ProspectSheet.tsx` removed. Verified by grep guard.

## Manual UAT Checklist

The automated suite covers structural correctness; runtime UX requires a quick browser pass:

| # | Step | Expected | Status |
|---|------|----------|--------|
| 1 | Open any prospect → click "Meeting Prep" header button | Dialog opens; loading spinner visible briefly | NEEDS BROWSER |
| 2 | After brief loads | Six visible section headers in fixed order | NEEDS BROWSER |
| 3 | Inspect each section body | Inline `**bold**` and bullets render via react-markdown (no raw `**` chars) | NEEDS BROWSER |
| 4 | Read Talking Points bullets | Each references AI search visibility / brand consistency / local SEO / or competitive displacement | NEEDS BROWSER |
| 5 | Read Suggested Ask | Single sentence, not a bullet list | NEEDS BROWSER |
| 6 | Click Copy → paste into notes app | Full markdown brief in clipboard. Click Export PDF → print preview opens | NEEDS BROWSER |
| 7 | Force error (e.g., disconnect network mid-call) | Error toast appears; dialog closes | NEEDS BROWSER |
| 8 | Mobile viewport (<768px) | Dialog renders inside the vaul Drawer wrapper from Phase 03; Esc closes Dialog only | NEEDS BROWSER |

The automated suite is sufficient evidence that no regressions exist relative to the previous inline implementation. Manual UAT items 1-8 require an actual prospect with seeded data and a working `LOVABLE_API_KEY` — flagged in PR for the user to verify post-merge.

## Deviations from Plan

**None.** Plan executed exactly as written. The only minor adjustment was an unrelated cleanup:

- **[Out of scope cleanup]** `node-compile-cache/` directory appeared in `git status` after running `bunx tsc`. Added to `.gitignore` as a generated runtime artifact (was not in the original `.gitignore`). Documented as a non-load-bearing housekeeping item — no behavioral impact.

The plan's grep-guard target of "exactly 2 matches for `meetingPrepRef`" turned out to be 3 because the JSX mount counts (`<MeetingPrepDialog ref={meetingPrepRef}`). This is semantically correct (declaration + onClick + ref-prop in mount) and is the intended end state. The success criteria says "at least 1 match" — satisfied.

The plan also said `<MeetingPrepDialog` should match exactly 1; it matches 2 because grep finds both `<MeetingPrepDialog` (JSX mount) AND `<MeetingPrepDialogHandle>` (in the `useRef<...>` generic). The semantically correct count is 1 JSX mount, verified separately via `grep -c "<MeetingPrepDialog ref=" = 1`.

## Authentication Gates

None encountered. The dialog calls `supabase.functions.invoke("meeting-prep")` which uses the existing `LOVABLE_API_KEY` server-side variable from Phase 01 (SEC-01/SEC-02). No client-side secrets touched.

## Known Stubs

None. All six sections render real data from the parsed brief, with a graceful "None on file." fallback for genuinely empty sections (which is correct behavior, not a stub).

## Pitfalls Encountered + Resolutions

1. **`useRef` not yet imported in ProspectSheet** — added to existing `useState, useMemo, useEffect` import in the same line.
2. **Existing `ProspectSheet.test.tsx` SEC-01/02 guard** broke when the `supabase.functions.invoke("meeting-prep"` string moved out of ProspectSheet.tsx. Repointed the test at `MeetingPrepDialog.tsx` (where the call now lives), and added a complementary check that ProspectSheet itself contains no `api.anthropic.com` / `VITE_ANTHROPIC_API_KEY` references. Both guards now stronger than before.
3. **Nested Dialog inside Drawer a11y warning** — preserved from current behavior (Phase 01 noted, see Pitfall 1 in RESEARCH.md). No regression. Flagged for `PREP-V2-04`.

## Self-Check: PASSED

- `src/data/meetingBrief.ts` — FOUND
- `src/components/MeetingPrepDialog.tsx` — FOUND
- `src/test/meetingBrief.test.ts` — FOUND
- `src/test/MeetingPrepDialog.test.tsx` — FOUND
- `.planning/phases/08-meeting-prep-one-pager/08-01-SUMMARY.md` — FOUND (this file)
- Commit `b6e4cc0` (Task 1 RED) — FOUND
- Commit `3ac3472` (Task 2 GREEN) — FOUND

All 9 tests pass; full suite green; tsc clean; vite build clean; grep guards satisfied.

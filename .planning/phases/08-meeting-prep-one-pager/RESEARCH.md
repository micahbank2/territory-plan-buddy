# Phase 08: Meeting Prep One-Pager — Research

**Researched:** 2026-04-25
**Domain:** React component extraction (promote pattern) + LLM prompt structuring
**Confidence:** HIGH

## Summary

Phase 08 mirrors the **Phase 06/07 promote pattern**: hoist inline state + dialog out of `ProspectSheet.tsx` (now 1077 lines) into a dedicated, tested `MeetingPrepDialog.tsx`. The current implementation is a *single freeform-markdown blob* — `whitespace-pre-wrap` rendering of whatever the LLM returns (`ProspectSheet.tsx:1039`), with weak section headers (numbered `1. **Situation Summary**` etc. from `meeting-prep/index.ts:74-79`). The fix has two halves:

1. **Mechanical extraction** (Task 2 GREEN): move state (`:144-146`), generator (`:298-332`), copy (`:334`), PDF export (`:341-369`), trigger (`:510-512`), and dialog markup (`:1023-1054`) into `src/components/MeetingPrepDialog.tsx` using the **forwardRef + useImperativeHandle** pattern already proven in `TerritoryDialogGroup` (Phase 03).
2. **Brief structuring** (same task, smaller commit): tune the edge-function prompt to emit a stable **6-section markdown contract** (Context / Recent History / Contacts / Open Tasks / Talking Points / Suggested Ask) and parse client-side into a typed shape `MeetingBrief`, rendered as an actual one-pager (semantic `<section>` per block, sticky title, scrollable body) instead of raw `<pre>`-style text.

**Primary recommendation:** Imperative ref API (`<MeetingPrepDialog ref={ref} />` + `ref.current.open(prospect)`) — matches existing `TerritoryDialogGroup` pattern, encapsulates loading/brief/open state inside the component, requires zero new state in ProspectSheet. Pair with markdown-section output (Option A) — cheap, no JSON-schema fragility, and `react-markdown` (^10.1.0) is already in `package.json` but unused in `src/` (verified by grep), so adoption is free.

## User Constraints (from phase scope — no CONTEXT.md exists yet)

### Locked Decisions

- **New file:** `src/components/MeetingPrepDialog.tsx` owns its own state (loading, brief, open).
- **Edge function call** continues through `supabase.functions.invoke("meeting-prep")` — minimal changes to function shape; only the prompt + return contract evolve.
- **Brief MUST render as a structured one-pager** with six labeled sections: Context, Recent History, Contacts, Open Tasks, Talking Points, Suggested Ask.
- **Reuse existing copy + PDF export** — carry both with the new component (no behavior loss).
- **Mobile-friendly** inside the bottom Drawer wrapper from Phase 03.
- **Tests required:** trigger render, loading state, sectioned render from fixture, copy button, error state.

### Claude's Discretion

- Component API (controlled vs imperative ref vs render-prop) — recommend imperative ref.
- Output contract (markdown sections vs JSON) — recommend markdown sections.
- Whether to add `react-markdown` rendering or stick with `whitespace-pre-wrap` — recommend `react-markdown`.

### Deferred Ideas (OUT OF SCOPE)

- Streaming responses (current edge function is non-streaming — keep it that way for v1).
- Caching briefs in Supabase (regenerate every click is fine).
- Editing the brief inline before copy/export (read-only display).

## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| **PREP-01** | A `<MeetingPrepDialog>` component exists at `src/components/MeetingPrepDialog.tsx` and owns all meeting-prep state (loading, brief, open) — `ProspectSheet.tsx` retains zero `meetingPrep*` state vars | Inline state at `ProspectSheet.tsx:144-146` moves out; pattern matches `TerritoryDialogGroup` |
| **PREP-02** | Trigger button in ProspectSheet header opens dialog via imperative ref (`meetingPrepRef.current?.open()`) — no shared boolean | `:510-512` button, ref pattern from Phase 03 |
| **PREP-03** | Edge function `meeting-prep` returns six labeled markdown sections in fixed order: `## Context`, `## Recent History`, `## Contacts`, `## Open Tasks`, `## Talking Points`, `## Suggested Ask` — verified by parser unit test | Current prompt at `meeting-prep/index.ts:74-81` uses numbered list with mixed labels; rewrite for stable contract |
| **PREP-04** | Brief renders as an actual one-pager with six visually distinct `<section>` blocks (header + body), each rendered through `react-markdown` for inline `**bold**` / bullet support — no `whitespace-pre-wrap` fallback | `react-markdown` ^10.1.0 already in package.json (verified `grep` returns no current src usage — clean slate) |
| **PREP-05** | Talking Points section ALWAYS contains 3–5 bullets and references at least one of: AI search visibility / multi-location brand consistency / local SEO at scale / competitive displacement of {SOCi,Birdeye,Uberall,Chatmeter,Rio SEO} | CLAUDE.md Yext Context block; tune system prompt to enforce |
| **PREP-06** | Suggested Ask section contains exactly ONE concrete next step in a single sentence (not a bullet list) | New prompt rule + parser asserts single-paragraph content |
| **PREP-07** | Copy button writes the full markdown brief to clipboard; PDF export opens print window with the same content (current behavior preserved) | Existing logic at `:334` and `:341-369` carries over verbatim |
| **PREP-08** | Component test file `src/components/MeetingPrepDialog.test.tsx` covers: (a) renders trigger, (b) shows loading state on open, (c) renders six sections from fixture brief, (d) copy button calls `navigator.clipboard.writeText`, (e) error toast on edge-function failure | Test surface mirrors `RecommendationCard.test.tsx` and `LogActivityWidget.test.tsx` patterns from Phase 06/05 |

## Standard Stack

### Core (already installed — no new deps)

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| react | ^18.3.1 | useImperativeHandle, forwardRef | Same pattern as `TerritoryDialogGroup` |
| @radix-ui/react-dialog | (via shadcn) | Dialog primitive | Already used at `:1023` |
| react-markdown | ^10.1.0 | Render markdown sections inline | **Installed but unused in src/** (grep verified) — free upgrade from `whitespace-pre-wrap` |
| sonner | ^1.7.4 | Error toasts | Project standard |
| lucide-react | ^0.462.0 | FileText, Copy, Loader2 icons | Already imported in ProspectSheet |
| vitest + @testing-library/react | ^3.2.4 / ^16.0.0 | Component tests | Project standard |

### Don't Add

- No `html2pdf` / `jspdf` — current `window.open + print` flow at `:341-369` is fine.
- No `zod` for output validation — markdown header parsing is a 20-line regex; schema overhead unjustified.
- No `react-query` migration here — that's Phase 2 territory.

## Architecture Patterns

### Recommended Structure

```
src/
├── components/
│   ├── MeetingPrepDialog.tsx       # NEW — forwardRef component, imperative open()
│   └── ProspectSheet.tsx            # SHRINKS — drops ~95 lines (state + generator + dialog markup + PDF helper)
├── data/
│   └── meetingBrief.ts              # NEW — parseMeetingBrief(markdown): MeetingBrief
├── test/
│   └── meetingBrief.test.ts         # NEW — parser table tests (well-formed, missing section, extra noise)
└── components/
    └── MeetingPrepDialog.test.tsx   # NEW — component render + interaction tests
supabase/functions/meeting-prep/
└── index.ts                         # PROMPT REWRITE — stable section contract
```

### Pattern 1: Imperative-Ref Dialog (recommended API)

**What:** Parent holds a ref; dialog component encapsulates open/loading/data state.
**When to use:** Dialog is opened from one or two trigger sites and parent doesn't need to react to its state.

```tsx
// MeetingPrepDialog.tsx (sketch)
export interface MeetingPrepDialogHandle {
  open: (prospect: Prospect) => void;
}

export const MeetingPrepDialog = forwardRef<MeetingPrepDialogHandle, {}>((_, ref) => {
  const [open, setOpen] = useState(false);
  const [prospect, setProspect] = useState<Prospect | null>(null);
  const [brief, setBrief] = useState<MeetingBrief | null>(null);
  const [loading, setLoading] = useState(false);

  useImperativeHandle(ref, () => ({
    open: (p) => { setProspect(p); setOpen(true); generate(p); },
  }));
  // ...
});

// ProspectSheet.tsx usage
const meetingPrepRef = useRef<MeetingPrepDialogHandle>(null);
<MeetingPrepDialog ref={meetingPrepRef} />
<button onClick={() => meetingPrepRef.current?.open(prospect)}>Meeting Prep</button>
```

**Justification over controlled API:** ProspectSheet has no need for visibility into dialog state (already a 1077-line file — adding `showMeetingPrepDialog` back as a prop would defeat the extraction). Render-prop is overkill for one trigger site.

### Pattern 2: Markdown Section Contract (recommended output)

**What:** LLM emits stable `## Section Name` headers; client parses into typed shape; render each section as a `<section>` with header chip + `react-markdown` body.

```ts
// data/meetingBrief.ts
export interface MeetingBrief {
  context: string;          // 2-3 sentences
  recentHistory: string;    // bulleted list
  contacts: string;         // bulleted list with roles
  openTasks: string;        // bulleted list (or "None")
  talkingPoints: string;    // 3-5 bullets, Yext-anchored
  suggestedAsk: string;     // single sentence
  raw: string;              // original for copy + PDF
}

const SECTIONS = ["Context", "Recent History", "Contacts", "Open Tasks", "Talking Points", "Suggested Ask"] as const;

export function parseMeetingBrief(markdown: string): MeetingBrief {
  // Split on /^##\s+(Context|Recent History|...)\s*$/m, allocate by header.
  // Missing section → empty string fallback (still renders a section with "Not available").
}
```

### Anti-Patterns to Avoid

- **JSON output from LLM:** brittle (Gemini sometimes wraps in ```json fences, sometimes drops keys). Markdown headers are a forgiving contract.
- **Full controlled component API** (`open`, `onOpenChange`, `prospect` all as props): defeats encapsulation goal — ProspectSheet would gain back the state we're trying to remove.
- **Building a custom markdown renderer:** `react-markdown` is in deps; use it.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Markdown → HTML in dialog body | Manual `**bold**` regex | `react-markdown` | Already in deps, handles bullets/code/links |
| PDF export | `jspdf` / `html2pdf` | Existing `window.open + print()` (`:341-369`) | Works today; rewrite is wasted work |
| Dialog primitives | Manual focus-trap | shadcn `<Dialog>` | Already used; don't change |
| Section parsing | Multi-line state machine | One regex split on `^## ` | 6 known headers; trivial |

## Common Pitfalls

### Pitfall 1: Nested Dialog Inside Drawer (Mobile)

**What goes wrong:** ProspectSheet renders as `vaul Drawer` on mobile (`ProspectSheet.tsx:1059-1066`); a Radix `<Dialog>` inside a Drawer can cause focus-trap collisions and double-Escape behavior.
**Why it happens:** Both libraries try to manage focus on open/close; vaul's drag-handle competes with Dialog's pointer-events guard.
**How to avoid:** Test in mobile viewport (Phase 03 a11y warnings noted nested-dialog issues). If problems surface, render `<MeetingPrepDialog>` as a sibling of the Drawer (portal to body), NOT inside the Drawer's children — Radix `<DialogPortal>` already does this by default. Verify focus returns to the trigger on close.
**Warning signs:** Console warns about aria-hidden on focused elements; Esc doesn't close the dialog (closes Drawer instead).

### Pitfall 2: LLM Drops Sections

**What goes wrong:** Gemini occasionally omits a section if the underlying data is empty (e.g., no contacts → skips `## Contacts`).
**How to avoid:** Parser must tolerate missing sections (return empty string, render "Not available" placeholder). Prompt must explicitly say: "Always emit all six sections, in order. If a section has no relevant data, write 'None on file.'"
**Warning signs:** UI sections render as blank rows.

### Pitfall 3: Talking Points Drift From Yext Positioning

**What goes wrong:** Generic LLM advice ("ask about their goals") instead of Yext-specific differentiation.
**How to avoid:** System prompt MUST anchor on CLAUDE.md positioning: "Each talking point must reference at least one of: AI search visibility, multi-location brand consistency at scale, local SEO automation, or competitive displacement of {SOCi/Birdeye/Uberall/Chatmeter/Rio SEO}."

### Pitfall 4: Copy Button Loses Newlines on Some Browsers

**What goes wrong:** `navigator.clipboard.writeText(brief.raw)` with very long markdown can fail silently on Safari without `await`.
**How to avoid:** Keep `await navigator.clipboard.writeText(...)` and toast on the resolved promise (current code is sync — OK in practice but worth tightening).

### Pitfall 5: PDF Export Pop-up Blocked

**Already handled** at `:344-348` — toast tells user to allow pop-ups. Carry forward.

## Code Examples

### Section Header Parser (verified test cases)

```ts
// data/meetingBrief.ts
const HEADER_RE = /^##\s+(Context|Recent History|Contacts|Open Tasks|Talking Points|Suggested Ask)\s*$/im;

export function parseMeetingBrief(md: string): MeetingBrief {
  const lines = md.split("\n");
  const sections: Record<string, string[]> = {};
  let current = "";
  for (const line of lines) {
    const m = line.match(/^##\s+(.+?)\s*$/);
    if (m && SECTIONS.includes(m[1] as any)) {
      current = m[1];
      sections[current] = [];
    } else if (current) {
      sections[current].push(line);
    }
  }
  const get = (k: string) => (sections[k] ?? []).join("\n").trim();
  return {
    context: get("Context"),
    recentHistory: get("Recent History"),
    contacts: get("Contacts"),
    openTasks: get("Open Tasks"),
    talkingPoints: get("Talking Points"),
    suggestedAsk: get("Suggested Ask"),
    raw: md,
  };
}
```

### New System Prompt (replaces `meeting-prep/index.ts:74-81`)

```
Generate a meeting prep brief. EMIT EXACTLY THESE SIX SECTIONS, IN ORDER, WITH THESE EXACT MARKDOWN HEADERS:

## Context
2–3 sentences: who they are, where the deal stands, why we're meeting.

## Recent History
Bulleted list of the last 3–5 interactions with dates. If none, write "No prior interactions on file."

## Contacts
Bulleted list of key contacts with role and relationship strength. If none, write "No contacts on file — discovery call required."

## Open Tasks
Bulleted list of open tasks with due dates. If none, write "No open tasks."

## Talking Points
3–5 bullets. EACH bullet must reference at least one of: AI search visibility, multi-location brand consistency, local SEO at scale, or competitive displacement of {SOCi, Birdeye, Uberall, Chatmeter, Rio SEO}.

## Suggested Ask
One sentence — a single concrete next step (intro, demo, pilot scope, decision criteria check). NOT a bullet list.
```

## State of the Art

| Old Approach | Current Approach | Impact |
|--------------|------------------|--------|
| Inline dialog + state inside 1077-line ProspectSheet | Extracted forwardRef component (Phase 03/06/07 pattern) | -95 lines from ProspectSheet |
| Numbered freeform sections (`1. **Situation Summary**`) | Stable `## Header` markdown contract | Parseable, testable |
| `whitespace-pre-wrap` raw markdown | `react-markdown` per-section rendering | Real one-pager UI |
| LOVABLE_API_KEY → Gemini 2.5 Flash | Same — no change | (Phase 01 already moved this server-side) |

## Open Questions

1. **Should "Recent History" filter to last 30 days or last N interactions?**
   - What we know: Edge function currently sends `interactions.slice(-10).reverse()` (`meeting-prep/index.ts:31`).
   - Recommendation: Keep last 10 — simpler than time-window filtering and matches existing behavior.

2. **Should "Open Tasks" filter to incomplete only?**
   - What we know: Edge function sends all `tasks` (`:38`); doesn't filter completed.
   - Recommendation: Filter to `tasks.filter(t => !t.completed)` in edge function before serializing — less prompt noise.

3. **Should the dialog mount inside ProspectSheet or one level up in TerritoryDialogGroup?**
   - Recommendation: Inside ProspectSheet for v1. The trigger is in the sheet header; coupling them is fine. Promote to TerritoryDialogGroup only if a second mount site emerges (e.g., row-level "Quick Prep" button).

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest ^3.2.4 + @testing-library/react ^16.0.0 |
| Config file | `vitest.config.ts` |
| Quick run command | `bunx vitest run src/components/MeetingPrepDialog.test.tsx src/test/meetingBrief.test.ts` |
| Full suite command | `bunx vitest run` |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|--------------|
| PREP-01 | Component file exists, no `meetingPrep*` state in ProspectSheet | grep + smoke render | `bunx vitest run src/components/MeetingPrepDialog.test.tsx` | ❌ Wave 0 |
| PREP-02 | Trigger button opens dialog via ref | unit | `bunx vitest run -t "trigger opens"` | ❌ Wave 0 |
| PREP-03 | Edge function emits six labeled sections | parser unit | `bunx vitest run src/test/meetingBrief.test.ts` | ❌ Wave 0 |
| PREP-04 | Six `<section>` blocks rendered from fixture | render | `bunx vitest run -t "renders six sections"` | ❌ Wave 0 |
| PREP-05 | Talking Points anchor on Yext positioning | prompt-string assertion (edge function) | manual review of prompt diff | ❌ |
| PREP-06 | Suggested Ask is single sentence | parser asserts no `\n-` in field | `bunx vitest run -t "ask single sentence"` | ❌ Wave 0 |
| PREP-07 | Copy + PDF preserved | unit + manual | `bunx vitest run -t "copy writes raw markdown"` | ❌ Wave 0 |
| PREP-08 | Component tests cover loading/error/copy | unit | `bunx vitest run src/components/MeetingPrepDialog.test.tsx` | ❌ Wave 0 |

### Sampling Rate

- **Per task commit:** `bunx vitest run src/components/MeetingPrepDialog.test.tsx src/test/meetingBrief.test.ts`
- **Per wave merge:** `bunx vitest run`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps

- [ ] `src/components/MeetingPrepDialog.test.tsx` — covers PREP-01, PREP-02, PREP-04, PREP-07, PREP-08
- [ ] `src/test/meetingBrief.test.ts` — covers PREP-03, PREP-06 (parser table tests)
- [ ] No new framework install needed — Vitest + Testing Library already configured

## Plan Breakdown

**Single plan, two tasks** (matches Phase 06/07 cadence):

- **Task 1 (RED scaffold):** Create `src/components/MeetingPrepDialog.tsx` skeleton (forwardRef + useImperativeHandle), `src/data/meetingBrief.ts` stub (`parseMeetingBrief` returns empty shape), test files with `it.skip` and `it.todo` placeholders, fixture markdown brief in test file. Verify all tests skip cleanly under `bunx vitest run`.
- **Task 2 (GREEN extract + structure):** Implement parser + component body, rewrite edge-function prompt for six-section contract, wire trigger in ProspectSheet via ref, delete inline `meetingPrep*` state + handlers + dialog markup from ProspectSheet, activate skipped tests. Verify ProspectSheet has zero `meetingPrep` references (`grep -n meetingPrep src/components/ProspectSheet.tsx` returns nothing). Edge-function prompt update is a small commit inside this task — minimal `index.ts` diff (replace lines 74-81 + tighten contact/interaction filters at 31/38).

## Sources

### Primary (HIGH confidence)
- `src/components/ProspectSheet.tsx` — meeting-prep state at `:144-146`, generator `:298-332`, copy `:334-339`, PDF export `:341-369`, trigger `:510-512`, dialog markup `:1023-1054`
- `supabase/functions/meeting-prep/index.ts` — current prompt at `:74-81`, output shape `:120` (returns `{ brief: string }`)
- `src/components/RecommendationCard.tsx` — Phase 06 promote pattern reference
- `src/components/PipelineForecastBar.tsx` — Phase 07 promote pattern reference
- `src/components/ProspectSheet.test.tsx` — existing meeting-prep guard test (5 lines, asserts edge-function routing not direct fetch — keep passing)
- `package.json` — `react-markdown` ^10.1.0 already a dep (verified via grep that no `src/` file currently imports it)
- CLAUDE.md "Yext Context" section — talking points anchor (AI search visibility / brand consistency / local SEO / competitive displacement of SOCi/Birdeye/Uberall/Chatmeter/Rio SEO)
- `.planning/STATE.md` — Phase 07 complete (Apr 25); Phase 08 added to roadmap (Apr 25)

### Secondary (MEDIUM confidence)
- forwardRef + useImperativeHandle: React 18 standard pattern; same as `TerritoryDialogGroup` from Phase 03 (verified by Phase 03 STATE.md note: "TerritoryDialogGroup uses forwardRef + useImperativeHandle to expose openX() methods")

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all deps in package.json, no new installs
- Architecture: HIGH — promote pattern already proven in Phases 03/06/07
- Pitfalls: HIGH for nested-dialog (Phase 01 noted), MEDIUM for LLM section drop (mitigation is parser tolerance, not preventable)
- Edge function changes: HIGH — prompt rewrite is contained, `{ brief: string }` shape unchanged

**Research date:** 2026-04-25
**Valid until:** 2026-05-25 (stable React patterns; only risk is edge-function model swap)

---
audit: uat-cross-phase
generated: 2026-04-25
auditor: Claude Code (gsd:audit-uat re-run)
status: current-after-session-2026-04-25
supersedes: 2026-04-24 audit (drift detected, mostly resolved this session)
---

# UAT Audit — Cross-Phase (Updated 2026-04-25)

## TL;DR

The 2026-04-24 audit flagged 4 false-truth drifts in Phase 01 around archive/soft-delete and 2 untested AI flows in Phase 04. This session's work has resolved or reframed most of them.

**Currently outstanding: 16 active human UAT items** across Phases 5, 6, 7, 8, 9 — all from new visual surfaces shipped this session that automated tests structurally cover but cannot exercise visually.

---

## Resolved since 2026-04-24

| Old finding | Resolution | Date |
|-------------|------------|------|
| Phase 01: archive is hard-delete masquerading as soft-delete; `restore`/`permanentDelete` stubs | Quick task `260424-m9y` killed the archive UI; hard-delete now has confirmation gate; CLAUDE.md gotcha #9 updated | 2026-04-24 |
| Phase 01: `deleted_at` column never added | N/A — soft-delete approach abandoned in favor of confirmed hard-delete | 2026-04-24 |
| Phase 04: E2E Draft Emails flow + Mark Contacted persistence pending | Still pending (not resolved). Carry forward as items B6/B7 below. | — |

## Still pending from prior audit (carry-over)

| # | Item | Action |
|---|------|--------|
| 1 | `VITE_ANTHROPIC_API_KEY` removed from Lovable Cloud env vars | **Manual:** open Lovable Cloud Dashboard → Environment Variables → confirm key is absent. Code is clean. |
| 2 | Phase 04 E2E Draft Emails workflow (picker → badge → mark-sent → interaction logged) | Live Supabase session needed. |
| 3 | Phase 04 Bulk Mark Contacted stage bump persists after reload | Live Supabase session needed. |
| 4 | 4 Edge Functions with `verify_jwt = false` (`chat`, `enrich-prospect`, `ai-readiness`, `categorize-signal`) | **Manual:** Supabase Dashboard → Edge Functions → confirm each is intentional or flip to `true`. |

---

## New items from this session (Phases 5-9)

All items below are **active** — code shipped to main as of `c3fc049`. Group by where you go to test.

### Group A — `/today` (Daily Briefing, Phase 9)

- [ ] **A1.** Open `/today` on populated territory → Hero row shows 4 stats; Today's Plan + Overdue + Going Stale + New Pipeline render only when populated; date label correct
- [ ] **A2.** Open `/today` on a fresh territory with zero prospects → "No prospects yet" empty card (NOT inbox-zero)
- [ ] **A3.** Curated populated-but-clear territory → emerald "Inbox zero" celebration card when todayPlan + overdueTasks + goingStale all empty
- [ ] **A4.** `Cmd+P` Print preview on `/today` → sticky header hidden, no buttons, full-width content, white bg, grey card borders
- [ ] **A5.** Hero "Weighted Pipeline" matches headline number on `/opportunities` (cross-page consistency)

### Group B — `/opportunities` (Pipeline Forecast Bar, Phase 7)

- [ ] **B1.** PipelineForecastBar renders between QuotaHeroBoxes and the table; mobile reflow OK
- [ ] **B2.** Hover any colored segment → Tooltip shows stage / count / weighted ACV / weight %; touch-tappable on mobile
- [ ] **B3.** Quota subline reads `$625,000` (correct DEFAULT_QUOTAS sum)

### Group C — ProspectSheet Overview tab (RecommendationCard, Phase 6)

- [ ] **C1.** Hot + Not Started prospect → red/destructive "Hot, not started" chip + "start a first-touch sequence today" action
- [ ] **C2.** <768px → chips wrap (`flex flex-wrap gap-1.5`); suggested action ≤2 lines, no overflow
- [ ] **C3.** Prospect with `competitor="Other: PowerListings"` → "On PowerListings" chip (prefix stripped)
- [ ] **C4.** Header score+label still visible; no amber `whyActParts` paragraph beneath

### Group D — ProspectSheet Activity tab (LogActivityWidget, Phase 5)

- [ ] **D1.** Yellow/red aging dot prospect → log activity → toast "Activity logged"; interaction in timeline; aging dot turns green WITHOUT page reload (LOG-04 — needs live Supabase)
- [ ] **D2.** <768px DevTools → ProspectSheet renders as bottom Drawer; Activity tab → LogActivityWidget visible, scrollable above keyboard, submit reachable
- [ ] **D3.** *Optional:* simulated partial failure (revoke prospect_tasks insert) → "Activity logged, but follow-up task failed" toast; notes cleared; follow-up form retains task text + due date

### Group E — Meeting Prep dialog (Phase 8)

- [ ] **E1.** Open prospect → "Meeting Prep" → dialog opens, six section headers in order (Context / Recent History / Contacts / Open Tasks / Talking Points / Suggested Ask), markdown renders bold + bullets (no raw `**`)
- [ ] **E2.** Talking Points bullets reference Yext positioning (AI search visibility, multi-location brand consistency, local SEO, competitive displacement)
- [ ] **E3.** Suggested Ask is ONE sentence, not a bullet list (LLM constraint adherence)
- [ ] **E4.** Copy → paste into notes; Export PDF → print preview opens with formatted brief
- [ ] **E5.** <768px → Meeting Prep dialog renders cleanly inside vaul Drawer; Esc closes Dialog only (not Drawer); focus returns to trigger

---

## Suggested running order (~20-25 min total)

1. **Manual env audit** (5 min) — Items 1 + 4 (Lovable Cloud env vars + Edge Function verify_jwt) — these are blast-radius critical and don't need the app running
2. **Desktop pass on populated territory** (10 min) — A1, A4, A5, B1, B2, B3, C1, C3, C4, E1, E2, E3, E4 in one continuous browser session
3. **Mobile pass** (5 min) — A1, B1, C2, D2, E5 in DevTools mobile emulation
4. **Empty-territory pass** (3 min) — A2, A3
5. **Live Supabase pass** (5 min) — D1, plus carry-over items 2/3 (Phase 04 E2E flows)
6. **Optional Supabase failure sim** — D3

---

## When you're done

- Items that pass → check the box in this file
- Items that fail → open a GitHub issue with the item ID and what you saw
- Items unchecked after a week → demote to v2 backlog or queue a fix plan via `/gsd:debug` or `/gsd:quick`

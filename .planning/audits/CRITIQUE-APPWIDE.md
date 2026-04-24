# Territory Plan Buddy — App-wide UX Critique

**Date:** 2026-04-24
**Scope:** Full user experience across TerritoryPlanner, ProspectSheet, InsightsPage, OpportunitiesPage, MyNumbersPage, ProspectPage, and supporting dialogs (AddProspectDialog, BulkEditDialog, EnrichmentQueue, AIReadinessCard, SignalsSection). Excludes Phase 04 dialogs (ContactPickerDialog, PendingOutreachDialog — covered separately).

---

## Executive Summary

**Total Score: 10 / 16** — Competent, feature-dense, emotionally inconsistent.

Territory Plan Buddy is an impressively capable personal CRM. For a single-user tool, it has more working features than most Series-A SaaS products: inline editing, kanban + table views, saved views, bulk actions, AI enrichment, AI readiness, signals, stakeholder maps, a quota engine, a kanban for deals, CSV + paste import, share/invite, a working command palette, and meeting-prep generation. The foundations are strong: type + query patterns are consistent, shadcn components are used well, Tailwind classes are disciplined, and the aging-dot / score-badge primitives are genuinely clever. But the experience has gained weight faster than it's gained structure. The prospect detail panel is a 1,141-line vertical waterfall masquerading as a sheet, the main app shell crams 5 competing visual systems (emoji pills, gradient KPI tiles, glass cards, underline tabs, navbar dropdowns) onto one screen, and the emotional tone oscillates between "earnest indie SaaS" (🎉, 💀, 🔥 emoji everywhere) and "Yext executive dashboard" (black wordmark, yext-grid-bg, gradient-text). The tool works. It just doesn't feel designed yet — it feels accreted. A Senior AE will absolutely use this daily, but right now they're compensating for the UI, not being propelled by it.

---

## 1. Visual Hierarchy — Score: 2 / 4

Busy. Competing intensity signals across almost every surface. The eye has 4-6 plausible "first places to look" on the home screen, which means it effectively has none.

### Findings

1. **[CRITICAL] Stat-pill row + Quota strip + Saved Views + Filter bar stack vertically, all screaming for attention**
   `TerritoryPlanner.tsx` lines 1438-1566. Above the prospect table, the user sees: (a) 5 pill buttons with emoji + count, (b) 5 massive gradient KPI tiles with progress bars and 4xl numbers, (c) a row of saved-view chips, (d) the sticky search + 8 multi-select filters, (e) the bulk-action bar when selected. Every row uses a different visual language. A first-time glance can't tell if the stat pills ARE filters (they are) or what the KPI tiles link to (MyNumbers). The quota tiles alone could be an entire dashboard — shoving them above the operational table means the table is visually demoted to "the thing below the executive summary."

2. **[HIGH] ProspectSheet header steals ~20% of vertical real estate on first open**
   `ProspectSheet.tsx` lines 495-574. The sticky header contains: logo, editable name (inline), status pill, tier pill, website link, score number (2xl), score label, "why act" chain, "Open full page" link, "Draft Email" link, "Meeting Prep" link. All at once. The score display competes directly with the name for attention (both are bold + large). The 3 action links below the score are the same visual weight as the website URL — a user skimming doesn't immediately see that Draft Email / Meeting Prep are the marquee AI features.

3. **[HIGH] Home page has no "anchor" moment**
   There is no single element that says "here is what matters today." The old Action Items cards were removed (per the "cardsOpen removed" comment on line 465) and replaced with quota tiles. Quota tiles are great for the owner, but they're retrospective — "closed won this month" doesn't tell the AE which prospect to touch right now. A dedicated Home/Today page exists (`/today` route) but is not the default. The user has to navigate away to find their work.

4. **[MEDIUM] Too many badge/pill shapes competing in the prospect table rows**
   Each table row renders: aging-dot (colored circle), logo, name, ExternalLink icon, contact-coverage Users icon, AIReadinessBadge, SignalIndicator, overdue flag, status pill (lg rounded-lg), competitor pill ("w/ SOCi"), industry pill, outreach pill (rounded-full, different!), score badge with dot+short, tier pill. That's ~10 signals per row. Pills are rounded-lg in some places, rounded-full in others, rounded-md in a third. Scanning a list of 25 prospects becomes a chore of filtering visual noise to find the datapoint you actually want.

5. **[MEDIUM] Score number dominates everywhere it appears**
   Score is shown in table rows, Insights cards, ProspectSheet header (2xl font-black), full-page view, tooltips. It's the single most-rendered element in the app. But per CLAUDE.md, the score currently "doesn't drive actions" — which means the app is screaming the loudest about the thing that matters least for decision-making. The "why act" chain beside the score is smaller and lighter than the score itself — that's inverted priority.

### Recommendations
- Collapse the stat-pill row into the Quota strip as tabs ("Prospects" / "Numbers"). Pick one hero row.
- Make ProspectSheet header a single compact band: logo, name, status chip, score pill, and a single primary CTA ("Log activity" or "Draft email"). Push "Open full page" to a subtle icon.
- Make Today the default authenticated route for Micah. Let the Accounts table live at `/accounts`.
- Pick ONE pill shape (`rounded-md`) and stick with it. Audit all pill rendering in one pass.

---

## 2. Information Architecture — Score: 2 / 4

The app knows it has a structure problem — look at the "Open full page" escape hatch in the sheet header. That button exists because the authors know 1,141 lines of vertical scroll is too much but couldn't bring themselves to reorganize.

### Findings

1. **[CRITICAL] ProspectSheet is a 1,141-line vertical scroll with no tabs, no anchors, no TOC**
   Order in `ProspectSheet.tsx`: Header → Account Details (8-field grid) → Research CTA → Log Activity → Notes → Contacts → Signals → AI Readiness → Activity Timeline → Location Notes. The sheet fires 11 animate-fade-in-up sections with staggered delays (30ms–250ms) — meaning every time you open a prospect, you watch a choreographed waterfall before you can interact. To log a call on a prospect you opened 20 seconds ago, you're still scrolling past Account Details and Research every single time. The AE uses this surface hundreds of times per week.

2. **[HIGH] The sheet and the full page (`/prospect/:id`) exist as parallel universes of the same data**
   `ProspectSheet.tsx` and `ProspectPage.tsx` both render the same prospect with overlapping sections. The sheet links to the page ("Open full page"), which then links back. Maintenance burden aside, it's a decision the user shouldn't have to make: "do I want the shallow version or the deep version?" On a tool where speed wins, one canonical view with smart density is better than two half-views.

3. **[HIGH] "Draft Emails" button has two distinct behaviors hidden behind the same label**
   `TerritoryPlanner.tsx` lines 1284-1301. Clicking "Draft Emails" opens ContactPickerDialog if no batch exists, or PendingOutreachDialog if one does. A red notification Badge tries to disambiguate, but the button label is unchanged. A user who doesn't realize a batch is queued will hit the button expecting the picker and get a different modal — classic disoriented-button syndrome.

4. **[HIGH] Navigation is split across 3 zones and they overlap**
   (a) Top row navbar has Wordmark + territory dropdown + utility icons + Draft Emails + Share + Import/Export dropdown. (b) Bottom row has 5 "tab" links (Accounts, Today, Pipeline, Quota, Enrich). (c) Inside the main content there are 5 more KPI tiles that also link to pages. The user has three ways to get to /my-numbers: tab, KPI tile, command palette. Three affordances for one destination is one too many.

5. **[MEDIUM] Filter → view → action → detail flow is mostly good, but "Has/Missing" is buried**
   The data-quality filter (`Has Contacts`, `No Notes`, etc.) is a genuinely powerful triage tool — it's how you find accounts needing work. It lives in the 8th slot of the filter bar with a generic "Has / Missing" placeholder. Most users will never find it. This is the filter the app should *showcase*.

### Recommendations
- Refactor ProspectSheet into 4 tabs: **Activity** (log + timeline + tasks), **Details** (fields + notes), **People** (contacts + stakeholder map), **Intel** (signals + AI readiness + research). Activity is default. This is the #2 priority build in CLAUDE.md already — just commit to it.
- Delete ProspectPage.tsx. Make the sheet the canonical view; give it a max-width option for "expanded" mode.
- Split Draft Emails into two buttons: "New Batch" (picker) and a separate "Resume Batch (N)" chip that only appears when a batch exists.
- Demote one navigation zone. Pick: navbar tabs OR KPI tile links OR bottom-row tabs. Not all three.
- Promote "Has Contacts / No Contacts / No Notes" etc. to quick-filter chips above the table. These are the real triage moves.

---

## 3. Emotional Resonance — Score: 3 / 4

The highest-scoring dimension, and still has contradictions. There's real personality here — someone clearly loves this tool. But the tone is inconsistent, which reads as "multiple authors" even though it's one person.

### Findings

1. **[HIGH] Emoji density is way too high for a Senior AE tool**
   Every toast has an emoji. Every stat pill. Every priority ("🔥 Hot", "☀️ Warm", "🧊 Cold", "💀 Dead"). Every tier ("⭐ Tier 1", "🥈 Tier 2", "🥉 Tier 3"). Every status. Every stage. Every saved-view load ("📂 Loaded"). Every add ("🎉 Added to your territory!"). The effect: what was meant as personality starts reading as Slack-bot clutter. A seasoned AE presenting this tool to a colleague is going to feel slightly embarrassed by "💀 Churned." Keep the emoji for *moments of delight* (success toasts on big actions), strip them from data labels and table cells.

2. **[MEDIUM] Empty states are mostly phoned in**
   Insights empty: "All prospects have been contacted. 🎉" — cute. Signals empty: "No signals found" + lightning icon + instruction. Opportunities empty: "No opportunities yet. Click Add Deal..." Fine, but missing the one thing that would turn empty-state into onboarding: a suggested next step scoped to the user's context. Micah has 309 seed accounts — *none* of those empty states will ever realistically fire for him. For a personal tool that means empty states are design debt, not UX.

3. **[MEDIUM] Micro-interactions are present but applied unevenly**
   The animate-fade-in-up with staggered delays in ProspectSheet is a nice touch — but it also slows down the 50th time you open a sheet. Toggle-star is snappy (optimistic update, direct DB write). But logging an activity also fires an animation and a toast every single time, even though the user is going to log 20 activities in a row on a heads-down afternoon. Delight should scale with novelty, not repetition.

4. **[LOW] Fit-for-purpose confidence is strong in places, undercut in others**
   Strong: the quota engine in MyNumbersPage is genuinely sophisticated — tier accelerators, YTD accelerators, renewal payout curves, Kong SPIFF. This is a calculator a real AE uses. Strong: the "compare 2-3 prospects" flow is exactly the right size (not overbuilt). Undercut: the "why act" chain in the ProspectSheet header is one of the best ideas in the app, but it's rendered in amber 10px text — smaller than the industry label. The tool has good instincts but keeps whispering them.

5. **[LOW] No personality in the long tail**
   Outside of success toasts, there's no voice. Error messages are generic ("Failed to add contact"). The reset dialog is corporate-polite ("This will permanently erase ALL prospect data"). The app is a Senior AE's *personal* tool — it could afford to be opinionated, even snarky, in ways a shared SaaS couldn't. "You're about to nuke 309 accounts. Type RESET if you actually mean it." would feel better than the current polite warning.

### Recommendations
- Keep emoji in ~5 places: big toasts ("🎉 Added"), priority (since it's a legit shorthand), the empty-state hero, the "congrats" moments. Strip from status pills, tier pills, saved-view toasts, individual field labels.
- Amplify the "why act" chain — make it the primary visual element of the sheet header. That's the value prop.
- Turn off the fade-in-up on ProspectSheet sections after first render per prospect, or kill the staggered delays entirely. They add up.

---

## 4. Overall Design Quality & Workflow Efficiency — Score: 3 / 4

High feature quality, mid workflow quality. The app is fast once you know the shortcuts. But the shortcuts aren't discoverable, and the default flows have avoidable friction.

### Findings

1. **[CRITICAL] Logging an activity still requires navigating to the sheet first**
   The #2 build priority in CLAUDE.md ("Log + Next Step widget") shipped, but it only exists *inside* ProspectSheet. From the main table, to log a call, the user must: click row → sheet opens → scroll or stay at top → click the correct log-activity section → type → submit → close sheet → find next row. A power user wants to log 15 calls from Tuesday afternoon in under 2 minutes. Right now that's ~15 seconds per call. It should be 4. Add a row-level inline "log" button (kbd shortcut L) that opens a micro-popover with type + notes.

2. **[HIGH] No keyboard navigation between rows**
   Cmd+K opens the command palette (good). But arrow keys don't move a selection, `space` doesn't check the checkbox, `j/k` don't scroll rows, and there's no "open next prospect" from inside the sheet. For a tool whose primary loop is "look at account → do thing → next account," this is a real tax.

3. **[HIGH] Decision fatigue in the add-prospect flow**
   AddProspectDialog has two modes (single + batch), four steps (input/enriching/review/basic), duplicate detection, Wikidata + AI enrichment. It's impressive. But for 80% of adds — "I need to add In-N-Out" — the user wants one field, a create button, and nothing else. The dialog should default to "just create it" and hide enrichment behind a "🪄 Research this" toggle.

4. **[MEDIUM] Cold-start UX is fine for Micah (309 seed accounts) but revealing**
   The empty state on `/` is a welcome screen with "Import Seed Data" or "Start Fresh." For a tool deployed only for Micah, this is overbuilt. Meanwhile, the empty state for *no search results* is the reusable "FileSearch icon + clear filters" block — which is actually well-designed, better than most SaaS.

5. **[MEDIUM] Cognitive load in OpportunitiesPage is borderline**
   The page renders: Quota Hero boxes (from MyNumbers context) + Forecast bar + List View section (with its own collapse + bulk actions bar) + Pipeline View section (kanban). That's 4 major visual zones on one page, plus the header. The weighted forecast is a genuinely good addition. But the hero boxes duplicate what's on the TerritoryPlanner home screen. Users see the same numbers everywhere, which dilutes their signal value.

6. **[MEDIUM] MyNumbersPage is excellent but intimidating**
   An 875-line page with inline-editable cells, tab switcher (Incremental / Renewal), collapsible add-ons, settings dialog, and a full commission calculation engine. The calculations are right. The layout is... a spreadsheet. It's fine for a quota-obsessed AE (which Micah is), but a first-time viewer sees a wall of numbers. A small "how to use this" or "what am I looking at" callout on first visit would help.

7. **[LOW] Toast fatigue**
   Count the toasts fired in a 10-minute session: ✅ Updated, 📝 Activity logged, ✅ Task added, ✅ Task completed, 🗑️ Task removed, 📌 Note saved, 👤 Contact added, 🎉 Added, 🖼️ Logo updated, 💾 View saved, 🎯 Moved, 🔄 Data reset, 📂 Loaded. That's ~15 distinct confirmation toasts. The app rewards every action — which means after an hour, toasts stop registering. Reserve toasts for cross-surface actions (import, batch operations, errors). Inline visual feedback (brief cell flash) is enough for a single-field update.

### Recommendations
- Add row-level quick actions (keyboard L = log, N = note, T = task) to the prospect table.
- Add j/k or arrow-key navigation in the table + a "next prospect" arrow in the sheet.
- Collapse AddProspectDialog's default path to one input + one button. Enrichment becomes opt-in.
- Remove duplicate quota displays — keep the hero in one place (MyNumbersPage itself), put a single-line summary on TerritoryPlanner.
- Cut toast noise by 70%. Silent inline-flash for cell edits.

---

## Hot Takes

1. **The app has been optimized for "adding features" instead of "doing the job faster."** Every phase has shipped working new capabilities. Almost none of them have removed old ones. Saved Views, Data Filters, Has/Missing, Comparison view, Archive, Stat Pills, Priority + Tier + Competitor filters — there's a chance half of these are never actually used. A healthy next step is a telemetry pass (if possible), or just a 2-week log of what Micah actually clicks, then delete the bottom 40%.

2. **ProspectSheet is the single most important surface in this app and it's treated like a catch-all drawer.** Everything that didn't fit anywhere else landed there. The "AI Readiness Card," the "Signals Section," the "Stakeholder Map," research results — they all get dropped into the same vertical scroll. If you fix nothing else in the next 30 days, fix this surface. Tab it. Make Activity default. Every other improvement will compound off that.

3. **The emoji + gradient-text + glass-card aesthetic feels like "AI-generated Tailwind dashboard c. 2024."** This isn't a criticism of execution — the CSS is clean and the motion is thoughtful. It's a criticism of signature. Linear has a signature. Notion has a signature. Superhuman has a signature. Territory Plan Buddy has "shadcn + emoji + gradients." For a tool whose user is both the builder and the prospect impresser (Micah occasionally demos this to colleagues, right?), a more restrained, opinionated visual identity would earn respect faster. Black, white, two accent colors, no emoji in data, one typeface. Trust the data to be interesting.

4. **The score display is the biggest gap between effort and outcome in the app.** It's computed everywhere, styled carefully, tooltip'd, color-coded, letter-graded. And it currently drives no recommendation. The effort invested in rendering the score would have been better spent making it actionable (priority #5 in CLAUDE.md) — or just demoting it to a small dot + number and moving on. Right now it's aesthetic rather than functional.

5. **The "Quick Add" dialog takes ~45 seconds to add a single prospect.** Wikidata lookup + AI enrichment + review step = slow. A veteran AE who sees a company name in an email wants to park it in the territory in 3 seconds. The current flow optimizes for data quality over input velocity. For 70% of captures, the user would rather have garbage-in than no capture at all. Separate "quick capture" from "enrich" — you already have EnrichmentQueue for the latter.

---

## What's Strong

- **Aging dots.** One tiny colored circle. Instantly readable. Consistent everywhere. Perfect UI primitive.
- **Command palette.** Works. Has both actions and jumps-to-prospect. Feels native.
- **Inline editing pattern.** Click/double-click → select/input → blur/enter. Clean, predictable, fast.
- **Scoring breakdown tooltip.** When you hover the score, you see a breakdown of what drove it. This is the single best-designed info-reveal in the app — better than most of what Salesforce has.
- **Weighted pipeline forecast on OpportunitiesPage.** Finally: raw pipeline vs. weighted side-by-side. Correct.
- **Quota calculation engine.** The commission math in MyNumbersPage is genuinely professional — tier accelerators, retention curves, Kong SPIFF, multi-year add-ons. This is work that normally requires a spreadsheet consultant.
- **Optimistic star toggle.** Noted in code comment that it deliberately bypasses the heavy `update()` to avoid re-inserting all contacts. That's real engineering discipline for UX.
- **Saved views with active-highlight + click-to-toggle.** Subtle but right — same button re-clicks should turn the view off.
- **The "Fix" buttons on the Data Quality panel** (Insights). "Industry — 72% — [Fix →]" that deep-links into the filtered table. That's the kind of verb-driven UX the rest of the app should aim for.
- **RetroGrid background.** Actually looks good. Holds up on both themes.

---

## Top 10 Prioritized Improvements

| # | Improvement | Dimension | Severity | Effort |
|---|---|---|---|---|
| 1 | Refactor ProspectSheet into tabs (Activity / Details / People / Intel) — Activity default | IA | CRITICAL | L (2-3 days) |
| 2 | Add row-level "Log Activity" inline button + L/N/T keyboard shortcuts | Workflow | CRITICAL | M (1 day) |
| 3 | Simplify AddProspectDialog default flow: one field, one button, enrichment opt-in | Workflow | HIGH | S (4 hrs) |
| 4 | Strip emoji from status/tier/stage/competitor pills & field labels; keep only in success toasts | Emotion | HIGH | S (2 hrs) |
| 5 | Cut toast noise by 70% — silent inline flash for single-field edits | Workflow | MEDIUM | S (3 hrs) |
| 6 | Surface the "why act" chain as the primary element in ProspectSheet header; demote score | Hierarchy | HIGH | S (2 hrs) |
| 7 | Collapse duplicate quota display — remove hero boxes from either OpportunitiesPage or TerritoryPlanner | Hierarchy | MEDIUM | S (2 hrs) |
| 8 | Delete ProspectPage.tsx, add "expanded mode" toggle to ProspectSheet | IA | MEDIUM | M (1 day) |
| 9 | Split Draft Emails button into "New Batch" + conditional "Resume (N)" chip | IA | MEDIUM | S (2 hrs) |
| 10 | Promote Has/Missing filters to quick-filter chips above the table | IA | MEDIUM | S (3 hrs) |

**Effort key:** S = <1 day, M = 1-2 days, L = 2-5 days.

---

## Dimension Scores Summary

| Dimension | Score | Notes |
|---|---|---|
| Visual hierarchy | 2 / 4 | Competing visual systems, no "anchor" moment |
| Information architecture | 2 / 4 | ProspectSheet waterfall is the main drag |
| Emotional resonance | 3 / 4 | Real personality, emoji density over-the-top |
| Overall design quality & workflow efficiency | 3 / 4 | Impressive feature set, friction in default paths |
| **TOTAL** | **10 / 16** | **Competent, feature-dense, emotionally inconsistent** |

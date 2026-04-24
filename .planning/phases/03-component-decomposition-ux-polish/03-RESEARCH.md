# Phase 3: Component Decomposition & UX Polish — Research

**Researched:** 2026-04-24
**Domain:** React component architecture, tab IA, responsive patterns
**Confidence:** HIGH — all findings sourced from direct code inspection of the target files

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| UX-01 | ProspectSheet displays content in tabs: Overview, Activity, Contacts, Tasks | Section map below; Tab IA decision; shadcn Tabs already installed |
| UX-02 | Tab selection persists while sheet is open; resets to Overview on close/reopen | useState at TerritoryPlanner level keyed to sheetProspectId; clear on close |
| UX-03 | TerritoryPlanner.tsx decomposed into FilterBar, ProspectTable, BulkActions, dialog launchers | Bucket map below; 39 useState declarations to distribute |
| UX-04 | TerritoryPlanner.tsx coordinator under 400 lines after decomposition | Current: 2375 lines; achievable with 5 extracted components |
</phase_requirements>

---

## Summary

ProspectSheet.tsx is a 1141-line single-component vertical scroll with 11 staggered `animate-fade-in-up` sections. It renders inside a `Dialog` with `max-w-4xl max-h-[90vh]` — not the `Sheet/Drawer` swap the CLAUDE.md promises. TerritoryPlanner.tsx is 2375 lines with 39 `useState` declarations managing filters, bulk ops, dialog visibility, inline editing, and the sheet itself, all in one function body.

The core work is mechanical: introduce a `<Tabs>` wrapper in ProspectSheet, redistribute ProspectSheet's sections into four tab panels, swap `Dialog` for `useIsMobile() ? Drawer : Sheet`, and extract five named components from TerritoryPlanner's function body. Both tasks are independent of each other and independent of Phase 2 (TanStack Query). Phase 3 does not require Phase 2 to ship.

**Primary recommendation:** Ship Phase 3 before Phase 2. Tabbing and decomposition are pure React restructuring — no data-layer dependency. Phase 4 (AI capabilities, already complete on `main`) mounts into the tabbed ProspectSheet, so Phase 3 unblocks a clean merge.

---

## Standard Stack

### Core (already installed — no new dependencies needed)

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| shadcn/ui `Tabs` | via `src/components/ui/tabs.tsx` | Tab container + panels | Already in components.json, used elsewhere |
| shadcn/ui `Sheet` | via `src/components/ui/sheet.tsx` | Desktop side-panel | OpportunitySheet reference implementation |
| `vaul` Drawer | ^0.9.9 | Mobile right-edge drawer | Already dep; OpportunitySheet uses `direction="right"` |
| `useIsMobile()` | `src/hooks/use-mobile.ts` | Breakpoint detection | Already the project pattern |

No new packages required. All primitives are already installed.

---

## Architecture Patterns

### ProspectSheet Section Inventory (current)

Reading `ProspectSheet.tsx` lines 576–1051, the sections in scroll order are:

| Section | Lines (approx) | Proposed Tab |
|---------|---------------|--------------|
| Sticky header (logo, name, score, actions) | 495–574 | Always visible (outside tabs) |
| Account Details (8-field grid) | 578–661 | Overview |
| Account Research / Research findings | 663–749 | Overview |
| Log Activity widget | 752–802 | Activity |
| Open Tasks list (inline under Log Activity) | 804–836 | Activity |
| Notes (rich text editor + note log) | 822–863 | Activity |
| Contacts (add/edit/list) | 865–998 | Contacts |
| Signals Section | 999–1009 | Overview |
| AI Readiness Card | 1012–1015 | Overview |
| Activity Timeline | 1017–1042 | Activity |
| Location Notes | 1044–1051 | Overview |

### Tab IA Decision

ROADMAP mandates: **Overview, Activity, Contacts, Tasks**

Critique recommends: **Activity, Details, People, Intel**

**Recommendation: Use ROADMAP's four tabs (Overview, Activity, Contacts, Tasks)** with these assignments:

| Tab | Contents |
|-----|----------|
| **Overview** | Account Details fields, Signals, AI Readiness, Location Notes, Research CTA/findings |
| **Activity** | Log Activity widget, Notes, Activity Timeline |
| **Contacts** | Contacts list + add/edit form |
| **Tasks** | Open Tasks list (extracted from under Log Activity) |

This satisfies all four Success Criteria without renaming away from the ROADMAP spec. The critique's "Activity-first" instinct is honored by making Activity the tab users land on if they previously selected it (UX-02 persistence), but Overview is the reset-on-close default (UX-01).

Tasks gets its own tab even though the current widget is small — this is the mount point for future task enhancements and keeps the surface clean.

### Tab State Persistence Pattern

UX-02 says: "tab persists while sheet is open; switching prospects keeps current tab; close/reopen resets to Overview."

**Pattern:** useState at TerritoryPlanner level, not inside ProspectSheet.

```typescript
// In TerritoryPlanner.tsx
const [sheetProspectId, setSheetProspectId] = useState<any>(null);
const [sheetTab, setSheetTab] = useState<string>("overview");

// On close:
const handleSheetClose = () => {
  setSheetProspectId(null);
  setSheetTab("overview"); // reset on close
};

// ProspectSheet receives:
<ProspectSheet
  prospectId={sheetProspectId}
  activeTab={sheetTab}
  onTabChange={setSheetTab}
  onClose={handleSheetClose}
  ...
/>
```

This satisfies SC-3: switching `sheetProspectId` while keeping `sheetTab` means the tab persists across prospect switches. The tab only resets when `handleSheetClose` fires.

### Responsive Fix (ProspectSheet)

**Current (wrong):** `ProspectSheet.tsx` final return block wraps content in `<Dialog>` with `max-w-4xl max-h-[90vh]` on every viewport.

**Reference pattern (`OpportunitySheet.tsx:450-466`):**
```tsx
if (isMobile) {
  return (
    <Drawer direction="right" open={isOpen} onOpenChange={handleOpenChange}>
      <DrawerContent direction="right" className="w-full h-full">
        {sheetContent}
      </DrawerContent>
    </Drawer>
  );
}
return (
  <Sheet open={isOpen} onOpenChange={handleOpenChange}>
    <SheetContent side="right" className="w-full sm:w-[700px] sm:max-w-[50vw] p-0 flex flex-col">
      {sheetContent}
    </SheetContent>
  </Sheet>
);
```

ProspectSheet already defines `sheetContent` and `isOpen`/`handleOpenChange` (lines 489–490, 492). Adding `const isMobile = useIsMobile()` and splitting the return is a <10 line change after tabs are in.

### TerritoryPlanner Decomposition Bucket Map

Current: 2375 lines, 39 useState declarations in the main component function.

**Proposed extracted components and their state ownership:**

| Component | Approximate Lines | State to Own | Remaining in Coordinator |
|-----------|------------------|--------------|--------------------------|
| `ProspectFilterBar` | ~150 | q, fIndustry, fStatus, fCompetitor, fTier, fLocRange, fOutreach, fPriority, fDataFilter, filtersOpen, savedViews, showSaveView, viewName, activeViewId | Receives `onFilterChange` callback |
| `ProspectTable` | ~350 | editingCell, page (or lift to coordinator), viewMode toggle (table only) | Receives `filtered`, `enriched`, `selected`, `onRowClick`, `onSelect`, callbacks for inline edits |
| `BulkActionBar` | ~80 | bulkStage, bulkTier, bulkIndustry, bulkPriority, bulkCompetitor, showBulkEdit, showBulkOutreach, bulkConfirm | Receives `selected`, `onClearSelection`, action callbacks |
| `TerritoryDialogGroup` | ~200 | showAdd, showAddContact, showUpload, showPasteImport, showEnrich, showExport, showShare, showNewTerritory, resetDialogOpen, deleteConfirmId | Receives trigger setters from coordinator |
| `TerritoryNavbar` | ~150 | — (reads from parent) | Receives territory, user, theme, onAction callbacks |

**Coordinator after extraction:** ~400 lines owning sheetProspectId, sheetTab, viewMode, selected, pendingBatch, showPendingOutreach, showBulkDelete, showBulkContactedConfirm, showCompare, dragId, plus the hook calls and memoized derived data.

The coordinator's return block (currently lines 1121–2375, ~1250 lines) composes the five extracted components plus ProspectSheet.

### Animation: Keep or Drop?

The 11 staggered `animate-fade-in-up` delays (30ms–250ms) in ProspectSheet will shift to per-tab content. Recommendation: **keep the animation on tab panel mount** (each tab fades in on first render), but remove the stagger between sections within a tab. This eliminates the "waterfall before you can interact" complaint while preserving the polish feel. The Tailwind keyframe `animate-fade-in-up` is already defined in `src/index.css` — no changes needed.

---

## Phase 2 Dependency Assessment

**ROADMAP says Phase 3 depends on Phase 2.** This is incorrect for the UX-01–04 requirements.

Evidence:
- ProspectSheet tabbing requires zero data-layer changes. It restructures JSX.
- TerritoryPlanner decomposition passes existing hook return values down as props. No hook internals change.
- UX-02 tab persistence is pure UI state (useState).
- The `update()` / `add()` / `remove()` signatures are unchanged by decomposition.

**Recommendation:** Run Phase 3 before Phase 2. The ROADMAP dependency was written as a safety ordering ("finish the messy large components before migrating data layer"). In practice, Phase 3 introduces no mutation patterns that Phase 2 would need to undo. Phase 2 changes hook internals; Phase 3 changes component structure — they are orthogonal.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead |
|---------|-------------|-------------|
| Tab container + panels | Custom div/button tab implementation | shadcn `<Tabs>`, `<TabsList>`, `<TabsTrigger>`, `<TabsContent>` |
| Mobile drawer | Custom slide-in panel | `vaul` Drawer (already installed, used in OpportunitySheet) |
| Responsive breakpoint | `window.innerWidth` check | `useIsMobile()` from `src/hooks/use-mobile.ts` |

---

## Common Pitfalls

### Pitfall 1: Tab state inside ProspectSheet causes reset on prospect switch
**What goes wrong:** `const [activeTab, setActiveTab] = useState("overview")` inside ProspectSheet resets to `"overview"` every time `prospectId` changes (component re-renders with new props but keeps mounted state — unless the component unmounts, which it does if Dialog re-renders).
**How to avoid:** Lift `activeTab` state to TerritoryPlanner as `sheetTab`. Pass down as controlled prop.
**Warning signs:** SC-3 test case — "opening a new prospect from the table does not reset the active tab while sheet stays open."

### Pitfall 2: Dialog vs Sheet — focus trap and scroll lock differences
**What goes wrong:** Current ProspectSheet uses `<Dialog>` which triggers body scroll lock. Sheet/Drawer have different scroll behavior.
**How to avoid:** After swapping to Sheet, test that the inner `overflow-y-auto` div on the content scrolls correctly and body scroll is not locked on desktop.

### Pitfall 3: Extracted components need access to hook results
**What goes wrong:** Moving `ProspectTable` out of TerritoryPlanner means it needs `data`, `update`, `remove`, etc. passed down as props. If too many props, it becomes unwieldy.
**How to avoid:** Pass `enriched: EnrichedProspect[]` (already memoized), selection state, and callbacks. Do not pass raw hook results or re-declare hooks inside child components.

### Pitfall 4: Sub-collection replace on contacts edit in new tab
**What goes wrong:** CLAUDE.md warning: `update(id, { contacts: [...] })` replaces ALL contacts. The contacts tab will need to call `addContact`/`updateContact`/`removeContact` direct methods (already on ProspectSheetProps), not the bulk `update()`.
**How to avoid:** Contacts tab uses `addContactDirect`, `updateContactDirect`, `removeContactDirect` props that already exist on ProspectSheet (lines 38–44 of ProspectSheet.tsx).

---

## Testing Strategy

Existing infrastructure: Vitest ^3.2.4, @testing-library/react ^16, `src/test/setup.ts` (matchMedia mock only), one example test.

### New test coverage needed

| Req | Test | Type | Command |
|-----|------|------|---------|
| UX-01 | ProspectSheet renders Tabs with four triggers | unit | `vitest run src/test/ProspectSheet.tab.test.tsx` |
| UX-02 | Tab state persists when prospectId changes; resets to overview when onClose fires | unit | same file |
| UX-03/04 | TerritoryPlanner coordinator renders <N lines is a code metric, not a runtime test | static | `wc -l` check in plan |

The shadcn `Tabs` component handles keyboard navigation and ARIA roles internally. No custom accessibility tests needed for the tab mechanism itself.

---

## Environment Availability

Step 2.6: SKIPPED — this phase is purely React component restructuring with no external CLI tools, services, or runtimes required beyond Bun + Vite already present.

---

## Sources

### Primary (HIGH confidence)
- Direct inspection: `src/components/ProspectSheet.tsx` (1141 lines) — section map, animation delays, Dialog wrapper
- Direct inspection: `src/components/OpportunitySheet.tsx:450-466` — responsive Sheet/Drawer reference pattern
- Direct inspection: `src/components/TerritoryPlanner.tsx` (2375 lines) — useState inventory, section comments
- Direct inspection: `.planning/audits/AUDIT-APPWIDE.md` — ProspectSheet Dialog finding, OpportunitySheet as reference
- Direct inspection: `.planning/audits/CRITIQUE-APPWIDE.md` — tab IA recommendation (Activity/Details/People/Intel)
- Direct inspection: `.planning/ROADMAP.md` — Success Criteria 1–3, tab names (Overview/Activity/Contacts/Tasks)
- Direct inspection: `.planning/REQUIREMENTS.md` — UX-01–04 definitions

### Secondary
- shadcn/ui Tabs: confirmed present in `src/components/ui/tabs.tsx` (not read in full, but import resolution confirms install)

---

## Metadata

**Confidence breakdown:**
- ProspectSheet section map: HIGH — read directly from source
- Tab IA decision: HIGH — both options documented from primary sources; ROADMAP names win
- Responsive fix: HIGH — exact pattern copied from OpportunitySheet
- TerritoryPlanner bucket map: HIGH — 39 useState declarations enumerated from source
- Phase 2 dependency assessment: HIGH — confirmed by analyzing what each phase actually changes
- Animation recommendation: MEDIUM — judgment call, no user testing data

**Research date:** 2026-04-24
**Valid until:** 2026-05-24 (stable domain, no fast-moving dependencies)

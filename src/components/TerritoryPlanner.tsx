import { useCallback, useEffect, useRef, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useProspects } from "@/hooks/useProspects";
import { useTerritories } from "@/hooks/useTerritories";
import { useOpportunities } from "@/hooks/useOpportunities";
import { useSignals } from "@/hooks/useSignals";
import {
  useFilteredProspects,
  useQuotaSummary,
} from "@/hooks/useTerritoryPlannerSelectors";
import { usePendingOutreach } from "@/hooks/usePendingOutreach";

import { ProspectFilterBar, type FilterState } from "@/components/ProspectFilterBar";
import { BulkActionBar } from "@/components/BulkActionBar";
import { ProspectSheet } from "@/components/ProspectSheet";
import { ContactPickerDialog } from "@/components/ContactPickerDialog";
import { PendingOutreachDialog } from "@/components/PendingOutreachDialog";
import { TerritoryNavbar } from "@/components/TerritoryNavbar";
import { TerritoryStatsHeader } from "@/components/TerritoryStatsHeader";
import { ProspectTableView } from "@/components/ProspectTableView";
import {
  TerritoryDialogGroup,
  type TerritoryDialogGroupHandle,
} from "@/components/TerritoryDialogGroup";
import { CommandPalette } from "@/components/territory/CommandPalette";
import { CompareDialog } from "@/components/territory/CompareDialog";
import {
  PlannerLoadingShell,
  WelcomeScreen,
} from "@/components/territory/EmptyAndLoading";

import { toast } from "sonner";

const OWNER_EMAILS = ["micahbank2@gmail.com", "mbank@yext.com"];

const inputClass =
  "w-full px-3 py-2 text-sm rounded-lg border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/50 placeholder:text-muted-foreground transition-all";
const selectClass =
  "w-full px-3 py-2 text-sm rounded-lg border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/50 appearance-none cursor-pointer transition-all";

const EMPTY_FILTER_STATE: FilterState = {
  q: "",
  fIndustry: [],
  fStatus: [],
  fCompetitor: [],
  fTier: [],
  fLocRange: [0, 0],
  fOutreach: [],
  fPriority: [],
  fDataFilter: [],
};

export default function TerritoryPlanner() {
  const {
    territories, activeTerritory, members, myRole, loading: terrLoading,
    switchTerritory, renameTerritory, inviteMember, removeMember, updateMemberRole, createTerritory,
  } = useTerritories();
  const {
    data, ok, reset, add, update, remove, bulkUpdate, bulkRemove, bulkAdd, bulkMerge,
    seedData, seeding, addNote, deleteNote, addContact, updateContact, removeContact,
    addInteraction, removeInteraction, addTask, removeTask,
  } = useProspects(activeTerritory);
  const { signals, addSignal, removeSignal, getProspectSignalRelevance } = useSignals(activeTerritory);
  const { opportunities } = useOpportunities(activeTerritory);
  const { signOut, user } = useAuth();
  const isOwner = !!user?.email && OWNER_EMAILS.includes(user.email);
  const activeTerrObj = territories.find((t) => t.id === activeTerritory) || null;
  const canManageTerritory = myRole === "owner";

  const [filterState, setFilterState] = useState<FilterState>(EMPTY_FILTER_STATE);
  const setFLocRange = useCallback((val: [number, number]) =>
    setFilterState((s) => ({ ...s, fLocRange: val })), []);

  const [sK, setSK] = useState("ps");
  const [sD, setSD] = useState<"asc" | "desc">("desc");
  const [page, setPage] = useState(1);
  const [viewMode, setViewMode] = useState<"table" | "kanban">("table");
  const [selected, setSelected] = useState<Set<any>>(new Set());
  const [showContactPicker, setShowContactPicker] = useState(false);
  const [showAdd, setShowAdd] = useState(false);
  const [cmdOpen, setCmdOpen] = useState(false);
  const [editingCell, setEditingCell] = useState<{ id: any; field: string } | null>(null);
  const [showCompare, setShowCompare] = useState(false);
  const [sheetProspectId, setSheetProspectId] = useState<any>(null);
  const [sheetTab, setSheetTab] = useState("overview");
  const handleSheetClose = useCallback(() => { setSheetProspectId(null); setSheetTab("overview"); }, []);

  const dialogRef = useRef<TerritoryDialogGroupHandle>(null);

  const { filtered, maxLocs, stats } = useFilteredProspects(data, filterState, sK, sD, setFLocRange);
  const quotaSummary = useQuotaSummary(opportunities);
  const {
    pendingBatch, showPendingOutreach, setShowPendingOutreach,
    handleMarkSent, handleSkipContacts, handleDiscard, refreshFromStorage,
  } = usePendingOutreach({ data, addInteraction, update, sheetProspectId });

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") { e.preventDefault(); setCmdOpen((o) => !o); }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);
  useEffect(() => setPage(1), [filterState]);

  const doSort = (f: string) => sK === f ? setSD((d) => d === "asc" ? "desc" : "asc") : (setSK(f), setSD("desc"));
  const clearAllFilters = useCallback(() => setFilterState({ ...EMPTY_FILTER_STATE, fLocRange: [0, maxLocs] }), [maxLocs]);
  const toggleSelect = (id: any) => setSelected((prev) => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });
  const toggleSelectAll = (pageIds: any[]) => setSelected(selected.size === pageIds.length ? new Set() : new Set(pageIds));
  const selectAllFiltered = () => { setSelected(new Set(filtered.map((p) => p.id))); toast(`Selected all ${filtered.length} filtered prospects`); };
  const handleInlineChange = (id: any, field: string, value: string) => { update(id, { [field]: value }); setEditingCell(null); toast.success("✅ Updated!"); };
  const handleLogoUpload = (id: any, base64: string) => { update(id, { customLogo: base64 }); toast.success("🖼️ Logo updated!"); };
  const handleLogoRemove = (id: any) => { update(id, { customLogo: undefined }); toast("🖼️ Logo removed"); };
  const handleOpenDraftEmails = () => (pendingBatch?.entries.length ? setShowPendingOutreach(true) : setShowContactPicker(true));
  const exportCSV = () => dialogRef.current?.openExport();

  if (!ok || terrLoading) return <PlannerLoadingShell />;

  if (ok && data.length === 0) {
    return (
      <WelcomeScreen
        isOwner={isOwner}
        seeding={seeding}
        onSeed={seedData}
        onSignOut={signOut}
        data={data}
        add={add}
        addNote={addNote}
        inputClass={inputClass}
        selectClass={selectClass}
        showAdd={showAdd}
        setShowAdd={setShowAdd}
      />
    );
  }

  return (
    <div className="bg-background min-h-screen text-foreground yext-grid-bg">
      <CommandPalette
        open={cmdOpen}
        onClose={() => setCmdOpen(false)}
        prospects={data}
        canManageTerritory={canManageTerritory}
        viewMode={viewMode}
        setViewMode={setViewMode}
        onOpenProspect={setSheetProspectId}
        onOpenAdd={() => dialogRef.current?.openAdd()}
        onExportCSV={exportCSV}
        onOpenUpload={() => dialogRef.current?.openUpload()}
        onOpenPasteImport={() => dialogRef.current?.openPasteImport()}
        onOpenEnrich={() => dialogRef.current?.openEnrich()}
      />

      <TerritoryNavbar
        user={user}
        territories={territories}
        activeTerritory={activeTerritory}
        activeTerrObj={activeTerrObj}
        myRole={myRole}
        totalCount={data.length}
        selectedCount={selected.size}
        pendingBatchCount={pendingBatch?.entries.length ?? 0}
        viewMode={viewMode}
        setViewMode={setViewMode}
        onSwitchTerritory={switchTerritory}
        onCompare={() => setShowCompare(true)}
        onSignOut={signOut}
        onOpenAdd={() => dialogRef.current?.openAdd()}
        onOpenAddContact={() => dialogRef.current?.openAddContact()}
        onOpenUpload={() => dialogRef.current?.openUpload()}
        onOpenPasteImport={() => dialogRef.current?.openPasteImport()}
        onOpenExport={exportCSV}
        onOpenShare={() => dialogRef.current?.openShare()}
        onOpenEnrich={() => dialogRef.current?.openEnrich()}
        onOpenNewTerritory={() => dialogRef.current?.openNewTerritory()}
        onOpenReset={() => dialogRef.current?.openReset()}
        onOpenDraftEmails={handleOpenDraftEmails}
      />

      <TerritoryStatsHeader
        stats={stats}
        fLocRange={filterState.fLocRange}
        fStatusList={filterState.fStatus}
        onClearAll={clearAllFilters}
        onToggleLocRange={(val) =>
          setFLocRange(filterState.fLocRange[0] === val ? [0, maxLocs] : [val, maxLocs])
        }
        onToggleStatus={(val) =>
          setFStatusList(
            filterState.fStatus.includes(val)
              ? filterState.fStatus.filter((x) => x !== val)
              : [...filterState.fStatus, val]
          )
        }
        canManageTerritory={canManageTerritory}
        openOpportunitiesCount={
          opportunities.filter((o) => !["Won", "Closed Won", "Closed Lost", "Dead"].includes(o.stage))
            .length
        }
        quotaSummary={quotaSummary}
      />

      <ProspectFilterBar
        value={filterState}
        onChange={setFilterState}
        prospects={data}
        onReset={() => { setSelected(new Set()); setPage(1); }}
        onCommandPaletteOpen={() => setCmdOpen(true)}
      />

      <BulkActionBar
        selected={selected as Set<string>}
        prospects={data}
        filteredCount={filtered.length}
        onClearSelection={() => setSelected(new Set())}
        onSelectAllFiltered={selectAllFiltered}
        bulkUpdate={async (ids, changes) => { await bulkUpdate(ids, changes as any); }}
        bulkRemove={async (ids) => { await bulkRemove(ids); }}
        addInteractionDirect={addInteraction}
        update={async (id, changes) => { await update(id, changes); }}
      />

      <ProspectTableView
        viewMode={viewMode}
        filtered={filtered}
        data={data}
        selected={selected}
        toggleSelect={toggleSelect}
        toggleSelectAll={toggleSelectAll}
        page={page}
        setPage={setPage}
        sK={sK}
        sD={sD}
        doSort={doSort}
        editingCell={editingCell}
        setEditingCell={setEditingCell}
        handleInlineChange={handleInlineChange}
        handleLogoUpload={handleLogoUpload}
        handleLogoRemove={handleLogoRemove}
        setSheetProspectId={setSheetProspectId}
        getProspectSignalRelevance={getProspectSignalRelevance}
        bulkUpdate={async (ids, changes) => { await bulkUpdate(ids, changes as any); }}
        onClearFilters={clearAllFilters}
      />

      <CompareDialog
        open={showCompare}
        onOpenChange={setShowCompare}
        data={data}
        selected={selected}
      />

      <ProspectSheet
        prospectId={sheetProspectId}
        onClose={handleSheetClose}
        data={data}
        update={update}
        remove={(id) => dialogRef.current?.openDeleteConfirm(id)}
        deleteNote={deleteNote}
        addContact={addContact}
        updateContact={updateContact}
        removeContact={removeContact}
        addInteraction={addInteraction}
        removeInteraction={removeInteraction}
        addNote={addNote}
        addTaskDirect={addTask}
        removeTaskDirect={removeTask}
        signals={signals}
        addSignal={addSignal}
        removeSignal={removeSignal}
        territoryId={activeTerritory}
        activeTab={sheetTab}
        onTabChange={setSheetTab}
      />

      <ContactPickerDialog
        open={showContactPicker}
        onOpenChange={(open) => {
          setShowContactPicker(open);
          if (!open) refreshFromStorage();
        }}
        prospects={data}
        signals={signals || []}
        onPromptGenerated={() => {
          refreshFromStorage();
          setTimeout(() => setShowPendingOutreach(true), 150);
        }}
      />

      <PendingOutreachDialog
        open={showPendingOutreach}
        onOpenChange={(open) => {
          setShowPendingOutreach(open);
          if (!open) refreshFromStorage();
        }}
        batch={pendingBatch}
        onMarkSent={handleMarkSent}
        onSkipContacts={handleSkipContacts}
        onStartNewDraft={() => {
          setShowPendingOutreach(false);
          setShowContactPicker(true);
        }}
        onDiscard={handleDiscard}
      />

      <TerritoryDialogGroup
        ref={dialogRef}
        user={user}
        territoryId={activeTerritory}
        myRole={myRole}
        activeTerrObj={activeTerrObj}
        members={members}
        data={data}
        filtered={filtered}
        signals={signals}
        add={add}
        bulkAdd={bulkAdd}
        bulkMerge={bulkMerge}
        update={update}
        remove={remove}
        addNote={addNote}
        addContact={addContact}
        createTerritory={createTerritory}
        renameTerritory={renameTerritory}
        inviteMember={inviteMember}
        removeMember={removeMember}
        updateMemberRole={updateMemberRole}
        reset={reset}
        inputClass={inputClass}
        selectClass={selectClass}
        onProspectDeleted={(id) => {
          if (sheetProspectId === id) setSheetProspectId(null);
        }}
      />
    </div>
  );
}

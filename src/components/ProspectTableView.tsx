import { useState } from "react";
import { useIsMobile } from "@/hooks/use-mobile";
import {
  STAGES,
  INDUSTRIES,
  TIERS,
  type EnrichedProspect,
  type Prospect,
} from "@/data/prospects";
import { Checkbox } from "@/components/ui/checkbox";
import { LogoImg } from "@/components/territory/LogoImg";
import { ScoreBadge } from "@/components/territory/ScoreBadge";
import { AIReadinessBadge } from "@/components/AIReadinessCard";
import { SignalIndicator } from "@/components/SignalsSection";
import {
  getAgingClass,
  getAgingLabel,
  STAGE_COLORS,
} from "@/components/territory/agingHelpers";
import {
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  ChevronLeft,
  ChevronRight,
  ChevronRight as ChevronRightIcon,
  ExternalLink,
  FileSearch,
  GripVertical,
  Users,
} from "lucide-react";
import { cn, normalizeUrl } from "@/lib/utils";

const PAGE_SIZE = 25;

export interface ProspectTableViewProps {
  viewMode: "table" | "kanban";
  filtered: (EnrichedProspect & Record<string, any>)[];
  data: Prospect[];
  selected: Set<any>;
  toggleSelect: (id: any) => void;
  toggleSelectAll: (pageIds: any[]) => void;
  page: number;
  setPage: (n: number | ((prev: number) => number)) => void;
  sK: string;
  sD: "asc" | "desc";
  doSort: (f: string) => void;
  editingCell: { id: any; field: string } | null;
  setEditingCell: (v: { id: any; field: string } | null) => void;
  handleInlineChange: (id: any, field: string, value: string) => void;
  handleLogoUpload: (id: any, base64: string) => void;
  handleLogoRemove: (id: any) => void;
  setSheetProspectId: (id: any) => void;
  getProspectSignalRelevance: (id: string) => any;
  bulkUpdate: (ids: any[], changes: Partial<Prospect>) => Promise<void> | void;
  onClearFilters: () => void;
}

export function ProspectTableView({
  viewMode,
  filtered,
  selected,
  toggleSelect,
  toggleSelectAll,
  page,
  setPage,
  sK,
  sD,
  doSort,
  editingCell,
  setEditingCell,
  handleInlineChange,
  handleLogoUpload,
  handleLogoRemove,
  setSheetProspectId,
  getProspectSignalRelevance,
  bulkUpdate,
  onClearFilters,
}: ProspectTableViewProps) {
  const isMobile = useIsMobile();
  const [dragId, setDragId] = useState<any>(null);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paged = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const SortIcon = ({ f }: { f: string }) =>
    sK !== f ? (
      <ArrowUpDown className="w-3.5 h-3.5 text-muted-foreground/40" />
    ) : sD === "asc" ? (
      <ArrowUp className="w-3.5 h-3.5 text-primary" />
    ) : (
      <ArrowDown className="w-3.5 h-3.5 text-primary" />
    );

  const Pagination = () => (
    <div className="flex items-center justify-between">
      <span className="text-sm text-muted-foreground">
        Showing {Math.min((page - 1) * PAGE_SIZE + 1, filtered.length)}–
        {Math.min(page * PAGE_SIZE, filtered.length)} of {filtered.length} prospects
      </span>
      {totalPages > 1 && (
        <div className="flex items-center gap-2">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
            className="p-1.5 rounded-lg border border-border hover:bg-muted hover:border-primary/30 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <span className="text-sm text-muted-foreground px-2">
            Page {page} of {totalPages}
          </span>
          <button
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
            className="p-1.5 rounded-lg border border-border hover:bg-muted hover:border-primary/30 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      )}
    </div>
  );

  if (viewMode === "kanban") {
    const handleDragStart = (e: React.DragEvent, id: any) => {
      setDragId(id);
      e.dataTransfer.effectAllowed = "move";
    };
    const handleDrop = (e: React.DragEvent, stage: string) => {
      e.preventDefault();
      if (dragId != null) bulkUpdate([dragId], { outreach: stage });
      setDragId(null);
    };
    const handleDragOver = (e: React.DragEvent) => {
      e.preventDefault();
    };

    return (
      <div className="px-4 sm:px-8 pb-8 overflow-x-auto scrollbar-hide">
        <div className="flex gap-4 min-w-max">
          {STAGES.map((stage) => {
            const cards = filtered.filter((p) => p.outreach === stage);
            const stageColor = STAGE_COLORS[stage] || "hsl(225, 15%, 50%)";
            return (
              <div
                key={stage}
                className="w-64 sm:w-72 shrink-0 glass-card rounded-xl p-3"
                style={{ borderTop: `3px solid ${stageColor}` }}
                onDragOver={handleDragOver}
                onDrop={(e) => handleDrop(e, stage)}
              >
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    {stage}
                  </h3>
                  <span className="text-xs font-bold text-primary bg-primary/10 rounded-full px-2 py-0.5">
                    {cards.length}
                  </span>
                </div>
                <div className="space-y-2 min-h-[60px]">
                  {cards.map((p) => (
                    <div
                      key={p.id}
                      draggable
                      onDragStart={(e) => handleDragStart(e, p.id)}
                      onClick={() => setSheetProspectId(p.id)}
                      className={cn(
                        "kanban-card bg-card border border-border rounded-lg p-3 cursor-pointer relative overflow-hidden",
                        dragId === p.id && "dragging"
                      )}
                    >
                      <div
                        className="absolute left-0 top-0 bottom-0 w-1 rounded-l-lg"
                        style={{ backgroundColor: stageColor }}
                      />
                      <div className="flex items-center gap-2 mb-1 ml-2">
                        <GripVertical className="w-3 h-3 text-muted-foreground/40 shrink-0" />
                        <LogoImg website={p.website} size={20} customLogo={p.customLogo} />
                        <span className="text-xs font-semibold text-foreground truncate">{p.name}</span>
                        <span
                          className={cn("aging-dot ml-auto", getAgingClass(p.interactions))}
                          title={getAgingLabel(p.interactions)}
                        />
                      </div>
                      <div className="flex items-center gap-1.5 ml-7">
                        {p.tier && (
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-primary/10 text-primary font-bold">
                            {p.tier}
                          </span>
                        )}
                        <span className="text-[10px] text-muted-foreground">
                          {p.locationCount ? `${p.locationCount} locs` : ""}
                        </span>
                        <span className="ml-auto">
                          <ScoreBadge score={p.ps} prospect={p} compact />
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  return (
    <div className="px-4 sm:px-8 pb-8">
      {isMobile ? (
        <div className="space-y-2">
          {paged.map((p) => (
            <button
              key={p.id}
              onClick={() => setSheetProspectId(p.id)}
              className="w-full flex items-center gap-3 p-3 rounded-xl border border-border bg-card hover:border-primary/30 transition-all text-left"
            >
              <span
                className={cn("aging-dot shrink-0", getAgingClass(p.interactions))}
                title={getAgingLabel(p.interactions)}
              />
              <LogoImg website={p.website} size={28} customLogo={p.customLogo} />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold text-foreground truncate">{p.name}</span>
                </div>
                <div className="flex items-center gap-1.5 mt-1">
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-muted text-muted-foreground">
                    {p.outreach}
                  </span>
                  {p.tier && (
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-primary/10 text-primary font-bold">
                      {p.tier}
                    </span>
                  )}
                </div>
              </div>
              <ScoreBadge score={p.ps} prospect={p} compact />
              <ChevronRightIcon className="w-4 h-4 text-muted-foreground shrink-0" />
            </button>
          ))}
          {paged.length === 0 && (
            <div className="flex flex-col items-center gap-3 text-muted-foreground py-16">
              <FileSearch className="w-12 h-12 opacity-30" />
              <p className="text-sm font-medium">🔍 No prospects match your filters</p>
              <button onClick={onClearFilters} className="text-xs text-primary hover:underline">
                Clear all filters
              </button>
            </div>
          )}
        </div>
      ) : (
        <div className="border border-border rounded-xl overflow-hidden glass-card">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/30">
                <th className="px-3 py-3 w-10">
                  <Checkbox
                    checked={paged.length > 0 && selected.size === paged.length}
                    onCheckedChange={() => toggleSelectAll(paged.map((p) => p.id))}
                  />
                </th>
                {(
                  [
                    ["name", "Company", ""],
                    ["locationCount", "Locations", "w-28"],
                    ["industry", "Industry", "w-28"],
                    ["outreach", "Outreach", "w-32"],
                    ["ps", "Score", "w-28"],
                    ["tier", "Tier", "w-24"],
                    ["lastTouched", "Last Touched", "w-32"],
                  ] as [string, string, string][]
                ).map(([k, l, w]) => (
                  <th
                    key={k}
                    onClick={() => doSort(k)}
                    className={cn(
                      "px-5 py-3 text-left text-xs font-semibold text-muted-foreground cursor-pointer select-none hover:text-foreground transition-colors uppercase tracking-wider",
                      w
                    )}
                  >
                    <div className="flex items-center gap-1.5">
                      {l}
                      <SortIcon f={k} />
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {paged.map((p) => (
                <tr
                  key={p.id}
                  className="border-b border-border last:border-0 hover:bg-primary/[0.03] cursor-pointer transition-all group row-hover-lift"
                >
                  <td className="px-3 py-4" onClick={(e) => e.stopPropagation()}>
                    <Checkbox checked={selected.has(p.id)} onCheckedChange={() => toggleSelect(p.id)} />
                  </td>
                  <td className="px-5 py-4" onClick={() => setSheetProspectId(p.id)}>
                    <div className="flex items-center gap-3 flex-wrap">
                      <span
                        className={cn("aging-dot", getAgingClass(p.interactions))}
                        title={getAgingLabel(p.interactions)}
                      />
                      <LogoImg
                        website={p.website}
                        size={28}
                        customLogo={p.customLogo}
                        onUpload={(b64) => handleLogoUpload(p.id, b64)}
                        onRemove={p.customLogo ? () => handleLogoRemove(p.id) : undefined}
                      />
                      <span className="font-semibold text-foreground group-hover:text-primary transition-colors">
                        {p.name}
                      </span>
                      {p.website && (
                        <a
                          href={normalizeUrl(p.website)}
                          target="_blank"
                          rel="noreferrer"
                          onClick={(e) => e.stopPropagation()}
                          className="text-muted-foreground hover:text-primary transition-colors"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                        </a>
                      )}
                      {(() => {
                        const contacts = (p as any).contacts || [];
                        if (contacts.length === 0) return null;
                        const hasChampion = contacts.some((c: any) => c.role === "Champion");
                        const hasDM = contacts.some((c: any) => c.role === "Decision Maker");
                        const strong = hasChampion && hasDM;
                        return (
                          <span
                            title={
                              strong
                                ? "Champion + Decision Maker identified"
                                : "Contacts exist but missing Champion or Decision Maker"
                            }
                          >
                            <Users
                              className={cn(
                                "w-3.5 h-3.5",
                                strong ? "text-[hsl(var(--success))]" : "text-[hsl(var(--warning))]"
                              )}
                            />
                          </span>
                        );
                      })()}
                      <AIReadinessBadge prospect={p as any} onClick={() => setSheetProspectId(p.id)} />
                      <SignalIndicator
                        relevance={getProspectSignalRelevance(p.id as string)}
                        onClick={() => setSheetProspectId(p.id)}
                      />
                      {p.nextStepDate && new Date(p.nextStepDate) < new Date() && (
                        <span
                          className="text-[10px] px-1.5 py-0.5 rounded bg-destructive/10 text-destructive overdue-flag"
                          title={`Overdue: ${p.nextStep}`}
                        >
                          ⚠ Overdue
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-1.5 mt-1.5">
                      <span
                        className={cn(
                          "inline-flex px-2.5 py-1 text-xs font-bold rounded-lg",
                          p.status === "Churned"
                            ? "bg-destructive/15 text-destructive"
                            : p.status === "Closed Lost Prospect"
                            ? "bg-amber-500/15 text-amber-700 dark:text-amber-400"
                            : p.status === "Customer"
                            ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400"
                            : "bg-[hsl(var(--success))]/15 text-[hsl(var(--success))]"
                        )}
                      >
                        {p.status}
                      </span>
                      {p.competitor && (
                        <span className="inline-flex px-2.5 py-1 text-xs font-bold rounded-lg bg-[hsl(var(--warning))]/15 text-[hsl(var(--warning))]">
                          w/ {p.competitor}
                        </span>
                      )}
                    </div>
                  </td>
                  <td
                    className="px-5 py-4 text-foreground font-medium"
                    onClick={() => setSheetProspectId(p.id)}
                  >
                    {p.locationCount || "—"}
                  </td>
                  <td className="px-5 py-4" onClick={(e) => e.stopPropagation()}>
                    {editingCell?.id === p.id && editingCell?.field === "industry" ? (
                      <select
                        autoFocus
                        value={p.industry}
                        onChange={(e) => handleInlineChange(p.id, "industry", e.target.value)}
                        onBlur={() => setEditingCell(null)}
                        className="px-2 py-1 text-xs rounded-md border border-primary bg-background text-foreground focus:outline-none"
                      >
                        <option value="">None</option>
                        {INDUSTRIES.map((i) => (
                          <option key={i} value={i}>
                            {i}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <span
                        className={cn(
                          "inline-edit-cell px-2.5 py-1 text-xs font-medium rounded-lg cursor-pointer",
                          p.industry
                            ? "text-foreground"
                            : "text-muted-foreground/50 hover:text-muted-foreground"
                        )}
                        onClick={() => setEditingCell({ id: p.id, field: "industry" })}
                        title="Click to edit"
                      >
                        {p.industry || "—"}
                      </span>
                    )}
                  </td>
                  <td className="px-5 py-4" onClick={(e) => e.stopPropagation()}>
                    {editingCell?.id === p.id && editingCell?.field === "outreach" ? (
                      <select
                        autoFocus
                        value={p.outreach}
                        onChange={(e) => handleInlineChange(p.id, "outreach", e.target.value)}
                        onBlur={() => setEditingCell(null)}
                        className="px-2 py-1 text-xs rounded-md border border-primary bg-background text-foreground focus:outline-none"
                      >
                        {STAGES.map((s) => (
                          <option key={s} value={s}>
                            {s}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <span
                        className="px-2.5 py-1 rounded-full text-[11px] font-medium bg-muted text-muted-foreground inline-edit-cell"
                        onDoubleClick={() => setEditingCell({ id: p.id, field: "outreach" })}
                        title="Double-click to edit"
                      >
                        {p.outreach}
                      </span>
                    )}
                  </td>
                  <td className="px-5 py-4" onClick={() => setSheetProspectId(p.id)}>
                    <ScoreBadge score={p.ps} prospect={p} />
                  </td>
                  <td className="px-5 py-4" onClick={(e) => e.stopPropagation()}>
                    {editingCell?.id === p.id && editingCell?.field === "tier" ? (
                      <select
                        autoFocus
                        value={p.tier}
                        onChange={(e) => handleInlineChange(p.id, "tier", e.target.value)}
                        onBlur={() => setEditingCell(null)}
                        className="px-2 py-1 text-xs rounded-md border border-primary bg-background text-foreground focus:outline-none"
                      >
                        {TIERS.map((t) => (
                          <option key={t} value={t}>
                            {t || "None"}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <span
                        className={cn(
                          "inline-edit-cell px-2.5 py-1 text-xs font-bold rounded-lg",
                          p.tier === "Tier 1"
                            ? "bg-primary/10 text-primary"
                            : p.tier === "Tier 2"
                            ? "bg-secondary text-secondary-foreground"
                            : "text-muted-foreground"
                        )}
                        onDoubleClick={() => setEditingCell({ id: p.id, field: "tier" })}
                        title="Double-click to edit"
                      >
                        {p.tier || "—"}
                      </span>
                    )}
                  </td>
                  <td
                    className="px-5 py-4 text-muted-foreground"
                    onClick={() => setSheetProspectId(p.id)}
                  >
                    {p.lastTouched || "—"}
                  </td>
                </tr>
              ))}
              {paged.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-5 py-16 text-center">
                    <div className="flex flex-col items-center gap-3 text-muted-foreground">
                      <FileSearch className="w-12 h-12 opacity-30" />
                      <p className="text-sm font-medium">🔍 No prospects match your filters</p>
                      <button onClick={onClearFilters} className="text-xs text-primary hover:underline">
                        Clear all filters
                      </button>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
      <div className="mt-4">
        <Pagination />
      </div>
    </div>
  );
}

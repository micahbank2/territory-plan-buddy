import { useState, useMemo, useEffect, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import {
  STAGES,
  INDUSTRIES,
  COMPETITORS,
  TIERS,
  scoreProspect,
  getLogoUrl,
  stringSimilarity,
  getScoreLabel,
  type Prospect,
  type EnrichedProspect,
} from "@/data/prospects";
import { useProspects } from "@/hooks/useProspects";
import { MultiSelect } from "@/components/MultiSelect";
import { cn } from "@/lib/utils";
import {
  Search,
  RotateCcw,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  ExternalLink,
  ChevronLeft,
  ChevronRight,
  Building2,
  Plus,
  Download,
  LayoutGrid,
  List,
  Trash2,
  AlertTriangle,
  Save,
  X,
  Command,
  GripVertical,
  FileSearch,
  BarChart3,
  GitCompare,
  Upload,
  Zap,
  ChevronDown,
  ChevronUp as ChevronUpIcon,
} from "lucide-react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
  AlertDialogAction,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Command as CmdK, CommandInput, CommandList, CommandEmpty, CommandGroup, CommandItem } from "@/components/ui/command";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";

// --- Saved Views ---
const VIEWS_KEY = "tp-saved-views";
interface SavedView {
  id: string;
  name: string;
  filters: {
    q: string;
    fIndustry: string[];
    fStatus: string[];
    fCompetitor: string[];
    fTier: string[];
    fMinLocs: string;
    fOutreach: string[];
  };
}
function loadViews(): SavedView[] {
  try {
    const raw = localStorage.getItem(VIEWS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}
function saveViews(views: SavedView[]) {
  localStorage.setItem(VIEWS_KEY, JSON.stringify(views));
}

// --- Aging helper ---
function getAgingClass(interactions: Prospect["interactions"]): string {
  if (!interactions || interactions.length === 0) return "aging-gray";
  const latest = Math.max(...interactions.map((i) => new Date(i.date).getTime()));
  const days = Math.floor((Date.now() - latest) / 86400000);
  if (days < 7) return "aging-green";
  if (days <= 30) return "aging-yellow";
  return "aging-red";
}

function getAgingLabel(interactions: Prospect["interactions"]): string {
  if (!interactions || interactions.length === 0) return "Never contacted";
  const latest = Math.max(...interactions.map((i) => new Date(i.date).getTime()));
  const days = Math.floor((Date.now() - latest) / 86400000);
  if (days === 0) return "Contacted today";
  if (days === 1) return "1 day ago";
  return `${days} days ago`;
}

// --- Pipeline colors ---
const STAGE_COLORS: Record<string, string> = {
  "Not Started": "hsl(220, 14%, 70%)",
  "Researching": "hsl(220, 80%, 50%)",
  "Contacted": "hsl(38, 92%, 50%)",
  "Meeting Set": "hsl(152, 60%, 42%)",
  "Proposal Sent": "hsl(280, 60%, 50%)",
  "Negotiating": "hsl(340, 70%, 50%)",
  "Closed Won": "hsl(152, 60%, 32%)",
  "Closed Lost": "hsl(0, 72%, 51%)",
  "On Hold": "hsl(220, 14%, 50%)",
};

// --- Logo component with upload support ---
function LogoImg({
  website,
  size = 24,
  customLogo,
  onUpload,
  onRemove,
}: {
  website?: string;
  size?: number;
  customLogo?: string;
  onUpload?: (base64: string) => void;
  onRemove?: () => void;
}) {
  const [err, setErr] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const url = getLogoUrl(website, size >= 32 ? 64 : 32);

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !onUpload) return;
    const reader = new FileReader();
    reader.onload = () => onUpload(reader.result as string);
    reader.readAsDataURL(file);
    e.target.value = "";
  };

  // Custom logo takes priority
  if (customLogo) {
    return (
      <div className="relative group shrink-0" style={{ width: size, height: size }}>
        <img src={customLogo} alt="" className="rounded-md bg-muted object-contain w-full h-full" />
        {onRemove && (
          <button
            onClick={(e) => { e.stopPropagation(); onRemove(); }}
            className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-destructive text-destructive-foreground flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
          >
            <X className="w-2.5 h-2.5" />
          </button>
        )}
      </div>
    );
  }

  const showFallback = !website || err || !url;

  if (showFallback) {
    return (
      <div className="relative group shrink-0" style={{ width: size, height: size }}>
        <div className="rounded-md bg-muted flex items-center justify-center w-full h-full">
          <Building2 className="text-muted-foreground" style={{ width: size * 0.5, height: size * 0.5 }} />
        </div>
        {onUpload && (
          <>
            <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleFile} />
            <button
              onClick={(e) => { e.stopPropagation(); fileRef.current?.click(); }}
              className="absolute inset-0 rounded-md bg-primary/20 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
              title="Upload logo"
            >
              <Upload className="w-3 h-3 text-primary" />
            </button>
          </>
        )}
      </div>
    );
  }

  return (
    <div className="relative group shrink-0" style={{ width: size, height: size }}>
      <img
        src={url}
        alt=""
        className="rounded-md bg-muted object-contain w-full h-full"
        onError={() => setErr(true)}
      />
      {onUpload && (
        <>
          <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleFile} />
          <button
            onClick={(e) => { e.stopPropagation(); fileRef.current?.click(); }}
            className="absolute inset-0 rounded-md bg-primary/20 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
            title="Upload custom logo"
          >
            <Upload className="w-3 h-3 text-primary" />
          </button>
        </>
      )}
    </div>
  );
}

// --- Score Badge ---
function ScoreBadge({ score, compact = false }: { score: number; compact?: boolean }) {
  const info = getScoreLabel(score);
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: info.color }} />
            <span className="font-bold text-foreground">{score}</span>
            {!compact && <span className="text-[10px] font-semibold" style={{ color: info.color }}>{info.short}</span>}
          </div>
        </TooltipTrigger>
        <TooltipContent side="top" className="text-xs">
          <p className="font-bold">{info.label} ({score} pts)</p>
          <p className="text-muted-foreground mt-0.5">60+ Excellent · 40-59 Strong · 20-39 Moderate · 1-19 Low · ≤0 Needs Work</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

// --- Skeleton ---
function SkeletonRows({ count = 8 }: { count?: number }) {
  return (
    <>
      {Array.from({ length: count }).map((_, i) => (
        <tr key={i} className="border-b border-border last:border-0">
          {Array.from({ length: 7 }).map((_, j) => (
            <td key={j} className="px-5 py-4">
              <div className="skeleton-shimmer rounded-md h-4 w-full" style={{ maxWidth: j === 0 ? 200 : 80 }} />
            </td>
          ))}
        </tr>
      ))}
    </>
  );
}

// --- Relative time ---
function relativeTime(dateStr: string): string {
  const now = new Date();
  const then = new Date(dateStr);
  const diffMs = now.getTime() - then.getTime();
  const diffDays = Math.floor(diffMs / 86400000);
  if (diffDays === 0) return "today";
  if (diffDays === 1) return "yesterday";
  if (diffDays < 7) return `${diffDays}d ago`;
  if (diffDays < 30) return `${Math.floor(diffDays / 7)}w ago`;
  return `${Math.floor(diffDays / 30)}mo ago`;
}

const PAGE_SIZE = 25;

export default function TerritoryPlanner() {
  const { data, ok, reset, add, update, bulkUpdate, bulkRemove } = useProspects();
  const navigate = useNavigate();
  const searchRef = useRef<HTMLInputElement>(null);
  const [q, setQ] = useState("");
  const [fIndustry, setFIndustry] = useState<string[]>([]);
  const [fStatus, setFStatus] = useState<string[]>([]);
  const [fCompetitor, setFCompetitor] = useState<string[]>([]);
  const [fTier, setFTier] = useState<string[]>([]);
  const [fMinLocs, setFMinLocs] = useState("");
  const [fOutreach, setFOutreach] = useState<string[]>([]);
  const [sK, setSK] = useState<string>("ps");
  const [sD, setSD] = useState<"asc" | "desc">("desc");
  const [page, setPage] = useState(1);
  const [viewMode, setViewMode] = useState<"table" | "kanban">("table");

  // Bulk selection
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [bulkStage, setBulkStage] = useState("");
  const [bulkTier, setBulkTier] = useState("");

  // Quick Add
  const [showAdd, setShowAdd] = useState(false);
  const [newName, setNewName] = useState("");
  const [newWebsite, setNewWebsite] = useState("");
  const [newIndustry, setNewIndustry] = useState("");
  const [newLocs, setNewLocs] = useState("");
  const [newStatus, setNewStatus] = useState("Prospect");
  const [newTier, setNewTier] = useState("");
  const [duplicateWarning, setDuplicateWarning] = useState<string | null>(null);

  // Saved views
  const [savedViews, setSavedViews] = useState<SavedView[]>(loadViews);
  const [showSaveView, setShowSaveView] = useState(false);
  const [viewName, setViewName] = useState("");

  // Bulk delete confirm
  const [showBulkDelete, setShowBulkDelete] = useState(false);

  // Command Palette
  const [cmdOpen, setCmdOpen] = useState(false);

  // Inline editing
  const [editingCell, setEditingCell] = useState<{ id: number; field: string } | null>(null);

  // Comparison view
  const [showCompare, setShowCompare] = useState(false);

  // Home page cards collapsed state
  const [cardsOpen, setCardsOpen] = useState(true);

  // Keyboard shortcut for Cmd+K → command palette
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setCmdOpen((o) => !o);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  // Duplicate detection on new name
  useEffect(() => {
    if (!newName || newName.length < 3) { setDuplicateWarning(null); return; }
    const match = data.find((p) => stringSimilarity(p.name, newName) > 0.6);
    setDuplicateWarning(match ? `Possible duplicate of "${match.name}" (ID: ${match.id})` : null);
  }, [newName, data]);

  const enriched = useMemo<EnrichedProspect[]>(
    () => data.map((p) => ({ ...p, ps: scoreProspect(p) })),
    [data]
  );

  const filtered = useMemo(() => {
    let r = [...enriched] as (EnrichedProspect & Record<string, any>)[];
    if (q) {
      const s = q.toLowerCase();
      r = r.filter(
        (p) =>
          p.name.toLowerCase().includes(s) ||
          (p.industry || "").toLowerCase().includes(s) ||
          (p.notes || "").toLowerCase().includes(s)
      );
    }
    if (fIndustry.length) r = r.filter((p) => fIndustry.includes(p.industry));
    if (fOutreach.length) r = r.filter((p) => fOutreach.includes(p.outreach));
    if (fStatus.length) r = r.filter((p) => fStatus.includes(p.status));
    if (fCompetitor.length) r = r.filter((p) => fCompetitor.includes(p.competitor));
    if (fTier.length) r = r.filter((p) => fTier.includes(p.tier));
    if (fMinLocs) r = r.filter((p) => p.locationCount && p.locationCount >= parseInt(fMinLocs));
    r.sort((a, b) => {
      let av = a[sK], bv = b[sK];
      if (av == null) av = sD === "desc" ? -Infinity : Infinity;
      if (bv == null) bv = sD === "desc" ? -Infinity : Infinity;
      if (typeof av === "string") { av = av.toLowerCase(); bv = (bv || "").toLowerCase(); }
      return sD === "asc" ? (av < bv ? -1 : av > bv ? 1 : 0) : (av > bv ? -1 : av < bv ? 1 : 0);
    });
    return r;
  }, [enriched, q, fIndustry, fOutreach, fStatus, fCompetitor, fTier, fMinLocs, sK, sD]);

  useMemo(() => setPage(1), [q, fIndustry, fOutreach, fStatus, fCompetitor, fTier, fMinLocs]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paged = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  // Pipeline summary
  const pipelineCounts = useMemo(() => {
    return STAGES.map((stage) => ({
      stage,
      count: data.filter((p) => p.outreach === stage).length,
      color: STAGE_COLORS[stage] || "hsl(220, 14%, 70%)",
    })).filter((s) => s.count > 0);
  }, [data]);
  const pipelineTotal = data.length;

  // Stale + top scored for home cards
  const homeCards = useMemo(() => {
    const now = new Date();
    const untouched = data
      .filter((p) => !p.interactions || p.interactions.length === 0)
      .map((p) => ({ ...p, score: scoreProspect(p) }))
      .sort((a, b) => b.score - a.score)
      .slice(0, 5);
    const stale = data
      .filter((p) => {
        if (!p.interactions?.length) return true;
        const latest = Math.max(...p.interactions.map((i) => new Date(i.date).getTime()));
        return now.getTime() - latest > 30 * 86400000;
      })
      .map((p) => ({ ...p, score: scoreProspect(p) }))
      .sort((a, b) => b.score - a.score)
      .slice(0, 5);
    return { untouched, stale };
  }, [data]);

  const stats = useMemo(() => {
    const wl = data.filter((p) => p.locationCount && p.locationCount > 0);
    return {
      t: data.length,
      o50: wl.filter((p) => p.locationCount! >= 50).length,
      o100: wl.filter((p) => p.locationCount! >= 100).length,
      o500: wl.filter((p) => p.locationCount! >= 500).length,
      hot: data.filter((p) => p.priority === "Hot").length,
      warm: data.filter((p) => p.priority === "Warm").length,
      ch: data.filter((p) => p.status === "Churned").length,
      prospects: data.filter((p) => p.status === "Prospect").length,
    };
  }, [data]);

  const doSort = (f: string) => {
    if (sK === f) setSD((d) => (d === "asc" ? "desc" : "asc"));
    else { setSK(f); setSD("desc"); }
  };

  const clr = () => {
    setQ(""); setFIndustry([]); setFOutreach([]); setFStatus([]); setFCompetitor([]); setFTier([]); setFMinLocs("");
  };

  const hasFilters = fIndustry.length || fOutreach.length || fStatus.length || fCompetitor.length || fTier.length || fMinLocs;

  const toggleSelect = (id: number) => {
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selected.size === paged.length) setSelected(new Set());
    else setSelected(new Set(paged.map((p) => p.id)));
  };

  // --- Quick Add ---
  const handleAdd = () => {
    if (!newName.trim()) return;
    add({
      name: newName.trim(),
      website: newWebsite.trim(),
      industry: newIndustry,
      locationCount: newLocs ? parseInt(newLocs) : null,
      status: newStatus,
      tier: newTier,
    });
    toast.success(`"${newName.trim()}" added`);
    setShowAdd(false);
    setNewName(""); setNewWebsite(""); setNewIndustry(""); setNewLocs(""); setNewStatus("Prospect"); setNewTier("");
    setDuplicateWarning(null);
  };

  // --- CSV Export ---
  const exportCSV = () => {
    const headers = ["Name", "Website", "Industry", "Locations", "Status", "Outreach", "Priority", "Tier", "Competitor", "Score", "Last Touched"];
    const rows = filtered.map((p) => [
      p.name, p.website, p.industry, p.locationCount ?? "", p.status, p.outreach, p.priority, p.tier, p.competitor, p.ps, p.lastTouched ?? "",
    ]);
    const csv = [headers.join(","), ...rows.map((r) => r.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(","))].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = "prospects.csv"; a.click();
    URL.revokeObjectURL(url);
    toast.success("CSV exported");
  };

  // --- Save View ---
  const handleSaveView = () => {
    if (!viewName.trim()) return;
    const view: SavedView = {
      id: Date.now().toString(),
      name: viewName.trim(),
      filters: { q, fIndustry, fStatus, fCompetitor, fTier, fMinLocs, fOutreach },
    };
    const updated = [...savedViews, view];
    setSavedViews(updated);
    saveViews(updated);
    setShowSaveView(false);
    setViewName("");
    toast.success(`View "${view.name}" saved`);
  };

  const loadView = (v: SavedView) => {
    setQ(v.filters.q); setFIndustry(v.filters.fIndustry); setFStatus(v.filters.fStatus);
    setFCompetitor(v.filters.fCompetitor); setFTier(v.filters.fTier); setFMinLocs(v.filters.fMinLocs);
    setFOutreach(v.filters.fOutreach);
    toast(`Loaded view "${v.name}"`);
  };

  const deleteView = (id: string) => {
    const updated = savedViews.filter((v) => v.id !== id);
    setSavedViews(updated);
    saveViews(updated);
  };

  // --- Bulk Actions ---
  const handleBulkStage = () => {
    if (!bulkStage || selected.size === 0) return;
    bulkUpdate(Array.from(selected), { outreach: bulkStage });
    toast.success(`Updated ${selected.size} prospects to "${bulkStage}"`);
    setSelected(new Set()); setBulkStage("");
  };

  const handleBulkTier = () => {
    if (!bulkTier || selected.size === 0) return;
    bulkUpdate(Array.from(selected), { tier: bulkTier });
    toast.success(`Updated ${selected.size} prospects to "${bulkTier}"`);
    setSelected(new Set()); setBulkTier("");
  };

  const handleBulkDelete = () => {
    bulkRemove(Array.from(selected));
    toast.success(`Deleted ${selected.size} prospects`);
    setSelected(new Set());
    setShowBulkDelete(false);
  };

  // --- Inline edit ---
  const handleInlineChange = (id: number, field: string, value: string) => {
    update(id, { [field]: value });
    setEditingCell(null);
    toast.success("Updated");
  };

  // --- Logo upload ---
  const handleLogoUpload = (id: number, base64: string) => {
    update(id, { customLogo: base64 });
    toast.success("Logo uploaded");
  };

  const handleLogoRemove = (id: number) => {
    update(id, { customLogo: undefined });
    toast.success("Logo removed");
  };

  // --- Kanban ---
  const [dragId, setDragId] = useState<number | null>(null);
  const kanbanStages = STAGES;

  const handleDragStart = (e: React.DragEvent, id: number) => {
    setDragId(id);
    e.dataTransfer.effectAllowed = "move";
  };

  const handleDrop = (e: React.DragEvent, stage: string) => {
    e.preventDefault();
    if (dragId != null) {
      bulkUpdate([dragId], { outreach: stage });
      toast.success("Stage updated");
    }
    setDragId(null);
  };

  const handleDragOver = (e: React.DragEvent) => { e.preventDefault(); };

  // --- Comparison ---
  const comparisonProspects = useMemo(() => {
    return data.filter((p) => selected.has(p.id)).map((p) => ({ ...p, score: scoreProspect(p) }));
  }, [data, selected]);

  const SortIcon = ({ f }: { f: string }) =>
    sK !== f ? (
      <ArrowUpDown className="w-3.5 h-3.5 text-muted-foreground/40" />
    ) : sD === "asc" ? (
      <ArrowUp className="w-3.5 h-3.5 text-primary" />
    ) : (
      <ArrowDown className="w-3.5 h-3.5 text-primary" />
    );

  const inputClass = "w-full px-3 py-2 text-sm rounded-lg border border-border bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-ring placeholder:text-muted-foreground";
  const selectClass = "w-full px-3 py-2 text-sm rounded-lg border border-border bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-ring appearance-none cursor-pointer";

  // Pagination component to reuse
  const Pagination = () => (
    <div className="flex items-center justify-between">
      <span className="text-sm text-muted-foreground">
        Showing {Math.min((page - 1) * PAGE_SIZE + 1, filtered.length)}–{Math.min(page * PAGE_SIZE, filtered.length)} of {filtered.length} prospects
      </span>
      {totalPages > 1 && (
        <div className="flex items-center gap-2">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
            className="p-1.5 rounded-lg border border-border hover:bg-muted disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <span className="text-sm text-muted-foreground px-2">Page {page} of {totalPages}</span>
          <button
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
            className="p-1.5 rounded-lg border border-border hover:bg-muted disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      )}
    </div>
  );

  if (!ok)
    return (
      <div className="bg-background min-h-screen px-8 pt-8">
        <div className="h-8 w-48 skeleton-shimmer rounded-lg mb-6" />
        <div className="flex gap-2 mb-6">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-10 w-24 skeleton-shimmer rounded-lg" />
          ))}
        </div>
        <div className="border border-border rounded-xl overflow-hidden bg-card">
          <table className="w-full text-sm">
            <tbody><SkeletonRows /></tbody>
          </table>
        </div>
      </div>
    );

  return (
    <div className="bg-background min-h-screen text-foreground">
      {/* Command Palette */}
      {cmdOpen && (
        <div className="fixed inset-0 z-50 cmd-overlay" onClick={() => setCmdOpen(false)}>
          <div className="fixed inset-0 bg-background/80 backdrop-blur-sm" />
          <div className="fixed top-[20%] left-1/2 -translate-x-1/2 w-full max-w-lg z-50 cmd-dialog" onClick={(e) => e.stopPropagation()}>
            <CmdK className="rounded-xl border border-border shadow-2xl bg-popover text-popover-foreground overflow-hidden">
              <CommandInput placeholder="Search prospects, actions..." className="h-12" />
              <CommandList className="max-h-80">
                <CommandEmpty>No results found.</CommandEmpty>
                <CommandGroup heading="Actions">
                  <CommandItem onSelect={() => { setCmdOpen(false); setShowAdd(true); }}>
                    <Plus className="w-4 h-4 mr-2" /> Add Prospect
                  </CommandItem>
                  <CommandItem onSelect={() => { setCmdOpen(false); exportCSV(); }}>
                    <Download className="w-4 h-4 mr-2" /> Export CSV
                  </CommandItem>
                  <CommandItem onSelect={() => { setCmdOpen(false); navigate("/insights"); }}>
                    <BarChart3 className="w-4 h-4 mr-2" /> Open Insights
                  </CommandItem>
                  <CommandItem onSelect={() => { setCmdOpen(false); setViewMode(viewMode === "table" ? "kanban" : "table"); }}>
                    <LayoutGrid className="w-4 h-4 mr-2" /> Toggle {viewMode === "table" ? "Kanban" : "Table"} View
                  </CommandItem>
                </CommandGroup>
                <CommandGroup heading="Prospects">
                  {data.slice(0, 20).map((p) => (
                    <CommandItem key={p.id} onSelect={() => { setCmdOpen(false); navigate(`/prospect/${p.id}`); }}>
                      <LogoImg website={p.website} size={16} customLogo={p.customLogo} />
                      <span className="ml-2">{p.name}</span>
                      {p.industry && <span className="ml-auto text-xs text-muted-foreground">{p.industry}</span>}
                    </CommandItem>
                  ))}
                </CommandGroup>
              </CommandList>
            </CmdK>
          </div>
        </div>
      )}

      {/* Top bar */}
      <div className="px-8 pt-8 pb-2">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold tracking-tight text-foreground">All Prospects</h1>
            <Button size="sm" onClick={() => setShowAdd(true)} className="gap-1.5">
              <Plus className="w-3.5 h-3.5" /> Add Prospect
            </Button>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => navigate("/insights")} className="gap-1.5">
              <BarChart3 className="w-3.5 h-3.5" /> Insights
            </Button>
            <Button variant="outline" size="sm" onClick={exportCSV} className="gap-1.5">
              <Download className="w-3.5 h-3.5" /> CSV
            </Button>
            {selected.size >= 2 && selected.size <= 3 && (
              <Button variant="outline" size="sm" onClick={() => setShowCompare(true)} className="gap-1.5">
                <GitCompare className="w-3.5 h-3.5" /> Compare ({selected.size})
              </Button>
            )}
            <div className="flex items-center border border-border rounded-lg overflow-hidden">
              <button onClick={() => setViewMode("table")} className={cn("p-2 transition-colors", viewMode === "table" ? "bg-primary text-primary-foreground" : "hover:bg-muted text-muted-foreground")}>
                <List className="w-4 h-4" />
              </button>
              <button onClick={() => setViewMode("kanban")} className={cn("p-2 transition-colors", viewMode === "kanban" ? "bg-primary text-primary-foreground" : "hover:bg-muted text-muted-foreground")}>
                <LayoutGrid className="w-4 h-4" />
              </button>
            </div>
            <button
              onClick={() => { if (confirm("Reset ALL data?")) { reset(); toast.success("Data reset"); } }}
              className="p-2 rounded-lg text-muted-foreground hover:bg-muted transition-colors"
              title="Reset data"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Pipeline Summary Bar */}
        {pipelineTotal > 0 && (
          <div className="mb-6 animate-fade-in-up">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Pipeline</span>
            </div>
            <div className="flex h-3 rounded-full overflow-hidden bg-muted border border-border">
              {pipelineCounts.map((s) => (
                <div
                  key={s.stage}
                  className="pipeline-segment"
                  style={{ flex: s.count, backgroundColor: s.color }}
                  title={`${s.stage}: ${s.count}`}
                  onClick={() => { clr(); setFOutreach([s.stage]); }}
                />
              ))}
            </div>
            <div className="flex flex-wrap gap-3 mt-2">
              {pipelineCounts.map((s) => (
                <button
                  key={s.stage}
                  className="flex items-center gap-1.5 text-[10px] text-muted-foreground hover:text-foreground transition-colors"
                  onClick={() => { clr(); setFOutreach([s.stage]); }}
                >
                  <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: s.color }} />
                  {s.stage} ({s.count})
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Stat pills with animation */}
        <div className="flex items-center gap-2 mb-6 flex-wrap">
          {([
            ["Total", stats.t, () => { clr(); }],
            ["50+ Locs", stats.o50, () => { clr(); setFMinLocs("50"); }],
            ["100+ Locs", stats.o100, () => { clr(); setFMinLocs("100"); }],
            ["500+ Locs", stats.o500, () => { clr(); setFMinLocs("500"); }],
            ["Hot", stats.hot, () => { clr(); }],
            ["Warm", stats.warm, () => { clr(); }],
            ["Prospects", stats.prospects, () => { clr(); setFStatus(["Prospect"]); }],
            ["Churned", stats.ch, () => { clr(); setFStatus(["Churned"]); }],
          ] as [string, number, () => void][]).map(([label, value, fn], i) => (
            <button
              key={i}
              onClick={() => fn()}
              className="flex items-center gap-2 px-4 py-2 rounded-lg border border-border hover:border-primary/30 hover:shadow-sm transition-all cursor-pointer bg-card group animate-fade-in-up"
              style={{ animationDelay: `${i * 50}ms` }}
            >
              <span className="text-xs text-muted-foreground group-hover:text-foreground transition-colors">{label}</span>
              <span className="text-sm font-bold text-foreground animate-count-up" style={{ animationDelay: `${i * 50 + 200}ms` }}>{value}</span>
            </button>
          ))}
        </div>

        {/* Stale + Top Scored Home Cards */}
        {(homeCards.untouched.length > 0 || homeCards.stale.length > 0) && (
          <Collapsible open={cardsOpen} onOpenChange={setCardsOpen} className="mb-6">
            <CollapsibleTrigger asChild>
              <button className="flex items-center gap-2 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors mb-3">
                {cardsOpen ? <ChevronUpIcon className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                Action Items
              </button>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 animate-fade-in-up">
                {/* Top Scored Never Contacted */}
                <div className="bg-card rounded-xl border border-border p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <Zap className="w-4 h-4 text-[hsl(var(--warning))]" />
                    <h3 className="text-xs font-semibold text-foreground uppercase tracking-wider">Top Scored — Never Contacted</h3>
                  </div>
                  {homeCards.untouched.length === 0 ? (
                    <p className="text-xs text-muted-foreground">All prospects contacted 🎉</p>
                  ) : (
                    <div className="space-y-1.5">
                      {homeCards.untouched.map((p) => (
                        <button
                          key={p.id}
                          onClick={() => navigate(`/prospect/${p.id}`)}
                          className="w-full flex items-center gap-3 p-2 rounded-lg hover:bg-muted/50 transition-colors text-left"
                        >
                          <LogoImg website={p.website} size={20} customLogo={p.customLogo} />
                          <span className="text-xs font-medium text-foreground truncate flex-1">{p.name}</span>
                          <ScoreBadge score={p.score} compact />
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* Stale Accounts */}
                <div className="bg-card rounded-xl border border-border p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <AlertTriangle className="w-4 h-4 text-destructive" />
                    <h3 className="text-xs font-semibold text-foreground uppercase tracking-wider">Stale Accounts (30+ days)</h3>
                  </div>
                  {homeCards.stale.length === 0 ? (
                    <p className="text-xs text-muted-foreground">No stale accounts 💪</p>
                  ) : (
                    <div className="space-y-1.5">
                      {homeCards.stale.map((p) => (
                        <button
                          key={p.id}
                          onClick={() => navigate(`/prospect/${p.id}`)}
                          className="w-full flex items-center gap-3 p-2 rounded-lg hover:bg-muted/50 transition-colors text-left"
                        >
                          <LogoImg website={p.website} size={20} customLogo={p.customLogo} />
                          <span className="text-xs font-medium text-foreground truncate flex-1">{p.name}</span>
                          <span className="text-[10px] text-muted-foreground">
                            {p.interactions?.length
                              ? relativeTime(p.interactions[p.interactions.length - 1].date)
                              : "Never"}
                          </span>
                          <ScoreBadge score={p.score} compact />
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </CollapsibleContent>
          </Collapsible>
        )}

        {/* Saved Views */}
        {savedViews.length > 0 && (
          <div className="flex items-center gap-2 mb-4 flex-wrap">
            <span className="text-xs text-muted-foreground font-medium">Views:</span>
            {savedViews.map((v) => (
              <div key={v.id} className="flex items-center gap-1 group">
                <button onClick={() => loadView(v)} className="px-3 py-1 text-xs rounded-full bg-primary/10 text-primary hover:bg-primary/20 transition-colors font-medium">
                  {v.name}
                </button>
                <button onClick={() => deleteView(v.id)} className="opacity-0 group-hover:opacity-100 transition-opacity p-0.5 rounded-full hover:bg-destructive/10">
                  <X className="w-3 h-3 text-destructive" />
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Search + Filters */}
        <div className="flex items-center gap-3 flex-wrap">
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              ref={searchRef}
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search companies, industries..."
              className="w-full pl-10 pr-20 py-2.5 text-sm rounded-lg border border-border bg-card text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring/20 focus:border-primary/40 transition-all"
              onFocus={() => {}}
            />
            <button
              onClick={() => setCmdOpen(true)}
              className="absolute right-3 top-1/2 -translate-y-1/2 hidden sm:inline-flex items-center gap-0.5 px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground bg-muted rounded border border-border hover:bg-accent transition-colors cursor-pointer"
            >
              <Command className="w-2.5 h-2.5" />K
            </button>
          </div>

          <MultiSelect options={INDUSTRIES} selected={fIndustry} onChange={setFIndustry} placeholder="Industry" />
          <MultiSelect options={STAGES} selected={fOutreach} onChange={setFOutreach} placeholder="Outreach" />
          <MultiSelect options={["Prospect", "Churned"]} selected={fStatus} onChange={setFStatus} placeholder="Status" />
          <MultiSelect options={COMPETITORS.filter(Boolean)} selected={fCompetitor} onChange={setFCompetitor} placeholder="Competitor" />
          <MultiSelect options={TIERS.filter(Boolean)} selected={fTier} onChange={setFTier} placeholder="Tier" />

          {hasFilters && (
            <>
              <button onClick={clr} className="px-3 py-2 text-xs font-medium rounded-lg border border-destructive/30 text-destructive hover:bg-destructive/5 transition-colors">
                Clear
              </button>
              <button onClick={() => setShowSaveView(true)} className="px-3 py-2 text-xs font-medium rounded-lg border border-primary/30 text-primary hover:bg-primary/5 transition-colors gap-1 inline-flex items-center">
                <Save className="w-3 h-3" /> Save View
              </button>
            </>
          )}
        </div>

        {/* Bulk action bar */}
        {selected.size > 0 && (
          <div className="mt-4 p-3 rounded-xl border border-primary/20 bg-primary/5 flex items-center gap-3 flex-wrap animate-fade-in-up">
            <span className="text-sm font-medium text-primary">{selected.size} selected</span>
            <select value={bulkStage} onChange={(e) => setBulkStage(e.target.value)} className="px-2 py-1 text-xs rounded-md border border-border bg-background text-foreground">
              <option value="">Set stage...</option>
              {STAGES.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
            {bulkStage && <Button size="sm" variant="outline" onClick={handleBulkStage} className="text-xs h-7">Apply</Button>}
            <select value={bulkTier} onChange={(e) => setBulkTier(e.target.value)} className="px-2 py-1 text-xs rounded-md border border-border bg-background text-foreground">
              <option value="">Set tier...</option>
              {TIERS.filter(Boolean).map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
            {bulkTier && <Button size="sm" variant="outline" onClick={handleBulkTier} className="text-xs h-7">Apply</Button>}
            <Button size="sm" variant="destructive" onClick={() => setShowBulkDelete(true)} className="text-xs h-7 gap-1 ml-auto delete-glow">
              <Trash2 className="w-3 h-3" /> Delete
            </Button>
            <button onClick={() => setSelected(new Set())} className="text-xs text-muted-foreground hover:text-foreground transition-colors">Deselect</button>
          </div>
        )}
      </div>

      {/* TABLE VIEW */}
      {viewMode === "table" && (
        <div className="px-8 pb-8">
          <div className="border border-border rounded-xl overflow-hidden bg-card">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="px-3 py-3 w-10">
                    <Checkbox checked={paged.length > 0 && selected.size === paged.length} onCheckedChange={toggleSelectAll} />
                  </th>
                  {([
                    ["name", "Company", ""],
                    ["locationCount", "Locations", "w-28"],
                    ["industry", "Industry", "w-28"],
                    ["outreach", "Outreach", "w-32"],
                    ["ps", "Score", "w-28"],
                    ["tier", "Tier", "w-24"],
                    ["lastTouched", "Last Touched", "w-32"],
                  ] as [string, string, string][]).map(([k, l, w]) => (
                    <th
                      key={k}
                      onClick={() => doSort(k)}
                      className={cn(
                        "px-5 py-3 text-left text-xs font-medium text-muted-foreground cursor-pointer select-none hover:text-foreground transition-colors",
                        w
                      )}
                    >
                      <div className="flex items-center gap-1.5">{l}<SortIcon f={k} /></div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {paged.map((p) => (
                  <tr
                    key={p.id}
                    className="border-b border-border last:border-0 hover:bg-muted/50 cursor-pointer transition-all group row-hover-lift"
                  >
                    <td className="px-3 py-4" onClick={(e) => e.stopPropagation()}>
                      <Checkbox checked={selected.has(p.id)} onCheckedChange={() => toggleSelect(p.id)} />
                    </td>
                    <td className="px-5 py-4" onClick={() => navigate(`/prospect/${p.id}`)}>
                      <div className="flex items-center gap-3 flex-wrap">
                        <span className={cn("aging-dot", getAgingClass(p.interactions))} title={getAgingLabel(p.interactions)} />
                        <LogoImg
                          website={p.website}
                          size={28}
                          customLogo={p.customLogo}
                          onUpload={(b64) => handleLogoUpload(p.id, b64)}
                          onRemove={p.customLogo ? () => handleLogoRemove(p.id) : undefined}
                        />
                        <span className="font-semibold text-foreground group-hover:text-primary transition-colors">{p.name}</span>
                        {p.website && (
                          <a href={`https://${p.website}`} target="_blank" rel="noreferrer" onClick={(e) => e.stopPropagation()} className="text-muted-foreground hover:text-primary transition-colors">
                            <ExternalLink className="w-3.5 h-3.5" />
                          </a>
                        )}
                        {/* Overdue next step flag */}
                        {p.nextStepDate && new Date(p.nextStepDate) < new Date() && (
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-destructive/10 text-destructive overdue-flag" title={`Overdue: ${p.nextStep}`}>
                            ⚠ Overdue
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-1.5 mt-1.5">
                        <span className={cn(
                          "inline-flex px-2.5 py-1 text-xs font-bold rounded-lg",
                          p.status === "Churned" ? "bg-destructive/15 text-destructive" : "bg-[hsl(var(--success))]/15 text-[hsl(var(--success))]"
                        )}>{p.status}</span>
                        {p.competitor && (
                          <span className="inline-flex px-2.5 py-1 text-xs font-bold rounded-lg bg-[hsl(var(--warning))]/15 text-[hsl(var(--warning))]">
                            w/ {p.competitor}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-5 py-4 text-muted-foreground" onClick={() => navigate(`/prospect/${p.id}`)}>{p.locationCount || "—"}</td>
                    <td className="px-5 py-4 text-muted-foreground" onClick={() => navigate(`/prospect/${p.id}`)}>{p.industry || "—"}</td>
                    {/* Inline editable: Outreach */}
                    <td className="px-5 py-4" onClick={(e) => e.stopPropagation()}>
                      {editingCell?.id === p.id && editingCell?.field === "outreach" ? (
                        <select
                          autoFocus
                          value={p.outreach}
                          onChange={(e) => handleInlineChange(p.id, "outreach", e.target.value)}
                          onBlur={() => setEditingCell(null)}
                          className="px-2 py-1 text-xs rounded-md border border-primary bg-background text-foreground focus:outline-none"
                        >
                          {STAGES.map((s) => <option key={s} value={s}>{s}</option>)}
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
                    {/* Score with context */}
                    <td className="px-5 py-4" onClick={() => navigate(`/prospect/${p.id}`)}>
                      <ScoreBadge score={p.ps} />
                    </td>
                    {/* Inline editable: Tier */}
                    <td className="px-5 py-4" onClick={(e) => e.stopPropagation()}>
                      {editingCell?.id === p.id && editingCell?.field === "tier" ? (
                        <select
                          autoFocus
                          value={p.tier}
                          onChange={(e) => handleInlineChange(p.id, "tier", e.target.value)}
                          onBlur={() => setEditingCell(null)}
                          className="px-2 py-1 text-xs rounded-md border border-primary bg-background text-foreground focus:outline-none"
                        >
                          {TIERS.map((t) => <option key={t} value={t}>{t || "None"}</option>)}
                        </select>
                      ) : (
                        <span
                          className={cn(
                            "inline-edit-cell px-2.5 py-1 text-xs font-bold rounded-lg",
                            p.tier === "Tier 1" ? "bg-primary/10 text-primary" : p.tier === "Tier 2" ? "bg-secondary text-secondary-foreground" : "text-muted-foreground"
                          )}
                          onDoubleClick={() => setEditingCell({ id: p.id, field: "tier" })}
                          title="Double-click to edit"
                        >
                          {p.tier || "—"}
                        </span>
                      )}
                    </td>
                    <td className="px-5 py-4 text-muted-foreground" onClick={() => navigate(`/prospect/${p.id}`)}>{p.lastTouched || "—"}</td>
                  </tr>
                ))}
                {paged.length === 0 && (
                  <tr>
                    <td colSpan={8} className="px-5 py-16 text-center">
                      <div className="flex flex-col items-center gap-3 text-muted-foreground">
                        <FileSearch className="w-12 h-12 opacity-30" />
                        <p className="text-sm font-medium">No prospects match your filters</p>
                        <button onClick={clr} className="text-xs text-primary hover:underline">Clear all filters</button>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          {/* Pagination at bottom */}
          <div className="mt-4">
            <Pagination />
          </div>
        </div>
      )}

      {/* KANBAN VIEW */}
      {viewMode === "kanban" && (
        <div className="px-8 pb-8 overflow-x-auto">
          <div className="flex gap-4 min-w-max">
            {kanbanStages.map((stage) => {
              const cards = filtered.filter((p) => p.outreach === stage);
              return (
                <div
                  key={stage}
                  className="w-72 shrink-0 bg-muted/30 rounded-xl border border-border p-3"
                  onDragOver={handleDragOver}
                  onDrop={(e) => handleDrop(e, stage)}
                >
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">{stage}</h3>
                    <span className="text-xs font-bold text-muted-foreground bg-muted rounded-full px-2 py-0.5">{cards.length}</span>
                  </div>
                  <div className="space-y-2 min-h-[60px]">
                    {cards.map((p) => (
                      <div
                        key={p.id}
                        draggable
                        onDragStart={(e) => handleDragStart(e, p.id)}
                        onClick={() => navigate(`/prospect/${p.id}`)}
                        className={cn("kanban-card bg-card border border-border rounded-lg p-3 cursor-pointer", dragId === p.id && "dragging")}
                      >
                        <div className="flex items-center gap-2 mb-1">
                          <GripVertical className="w-3 h-3 text-muted-foreground/40 shrink-0" />
                          <LogoImg website={p.website} size={20} customLogo={p.customLogo} />
                          <span className="text-xs font-semibold text-foreground truncate">{p.name}</span>
                          <span className={cn("aging-dot ml-auto", getAgingClass(p.interactions))} title={getAgingLabel(p.interactions)} />
                        </div>
                        <div className="flex items-center gap-1.5 ml-5">
                          {p.tier && <span className="text-[10px] px-1.5 py-0.5 rounded bg-primary/10 text-primary font-bold">{p.tier}</span>}
                          <span className="text-[10px] text-muted-foreground">{p.locationCount ? `${p.locationCount} locs` : ""}</span>
                          <span className="ml-auto"><ScoreBadge score={p.ps} compact /></span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* --- Quick Add Dialog --- */}
      <Dialog open={showAdd} onOpenChange={setShowAdd}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Prospect</DialogTitle>
            <DialogDescription>Add a new company to your territory.</DialogDescription>
          </DialogHeader>
          {duplicateWarning && (
            <div className="flex items-center gap-2 p-3 rounded-lg bg-[hsl(var(--warning))]/10 border border-[hsl(var(--warning))]/30 text-sm">
              <AlertTriangle className="w-4 h-4 text-[hsl(var(--warning))] shrink-0" />
              <span className="text-[hsl(var(--warning))]">{duplicateWarning}</span>
            </div>
          )}
          <div className="grid gap-3">
            <input value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="Company Name *" className={inputClass} />
            <input value={newWebsite} onChange={(e) => setNewWebsite(e.target.value)} placeholder="Website (e.g. example.com)" className={inputClass} />
            <div className="grid grid-cols-2 gap-3">
              <select value={newIndustry} onChange={(e) => setNewIndustry(e.target.value)} className={selectClass}>
                <option value="">Industry</option>
                {INDUSTRIES.map((i) => <option key={i} value={i}>{i}</option>)}
              </select>
              <input type="number" value={newLocs} onChange={(e) => setNewLocs(e.target.value)} placeholder="Locations" className={inputClass} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <select value={newStatus} onChange={(e) => setNewStatus(e.target.value)} className={selectClass}>
                <option value="Prospect">Prospect</option>
                <option value="Churned">Churned</option>
              </select>
              <select value={newTier} onChange={(e) => setNewTier(e.target.value)} className={selectClass}>
                <option value="">Tier</option>
                {TIERS.filter(Boolean).map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAdd(false)}>Cancel</Button>
            <Button onClick={handleAdd} disabled={!newName.trim()}>Add Prospect</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* --- Save View Dialog --- */}
      <Dialog open={showSaveView} onOpenChange={setShowSaveView}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Save Current View</DialogTitle>
            <DialogDescription>Save your current filters as a named view for quick access.</DialogDescription>
          </DialogHeader>
          <input value={viewName} onChange={(e) => setViewName(e.target.value)} placeholder="View name (e.g. Hot Tier 1)" className={inputClass} onKeyDown={(e) => e.key === "Enter" && handleSaveView()} />
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowSaveView(false)}>Cancel</Button>
            <Button onClick={handleSaveView} disabled={!viewName.trim()}>Save View</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* --- Bulk Delete Confirm --- */}
      <AlertDialog open={showBulkDelete} onOpenChange={setShowBulkDelete}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {selected.size} prospects?</AlertDialogTitle>
            <AlertDialogDescription>This action cannot be undone. These prospects will be permanently removed.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleBulkDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Delete All</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* --- Comparison View --- */}
      <Dialog open={showCompare} onOpenChange={setShowCompare}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Compare Prospects</DialogTitle>
            <DialogDescription>Side-by-side comparison of selected prospects.</DialogDescription>
          </DialogHeader>
          {comparisonProspects.length > 0 && (
            <div className="overflow-x-auto">
              <table className="w-full text-sm border-collapse">
                <thead>
                  <tr className="border-b border-border">
                    <th className="px-4 py-2 text-left text-xs font-medium text-muted-foreground">Metric</th>
                    {comparisonProspects.map((p) => (
                      <th key={p.id} className="px-4 py-2 text-left text-xs font-semibold text-foreground">{p.name}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {([
                    ["Score", (p: any) => p.score],
                    ["Locations", (p: any) => p.locationCount || "—"],
                    ["Industry", (p: any) => p.industry || "—"],
                    ["Tier", (p: any) => p.tier || "—"],
                    ["Outreach", (p: any) => p.outreach],
                    ["Priority", (p: any) => p.priority || "—"],
                    ["Competitor", (p: any) => p.competitor || "—"],
                    ["Status", (p: any) => p.status],
                    ["Est. Revenue", (p: any) => p.estimatedRevenue ? `$${p.estimatedRevenue.toLocaleString()}` : "—"],
                    ["Contacts", (p: any) => (p.contacts || []).length],
                    ["Interactions", (p: any) => (p.interactions || []).length],
                  ] as [string, (p: any) => any][]).map(([label, fn]) => (
                    <tr key={label} className="border-b border-border">
                      <td className="px-4 py-2 text-xs text-muted-foreground font-medium">{label}</td>
                      {comparisonProspects.map((p) => (
                        <td key={p.id} className="px-4 py-2 text-xs text-foreground">{fn(p)}</td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCompare(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

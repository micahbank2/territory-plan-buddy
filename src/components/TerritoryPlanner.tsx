import { useState, useMemo, useEffect, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useIsMobile } from "@/hooks/use-mobile";
import { useTheme } from "next-themes";
import {
  STAGES,
  INDUSTRIES,
  COMPETITORS,
  TIERS,
  scoreProspect,
  scoreBreakdown,
  getLogoUrl,
  stringSimilarity,
  getScoreLabel,
  type Prospect,
  type EnrichedProspect,
} from "@/data/prospects";
import yextLogoBlack from "@/assets/yext-logo-black.jpg";
import yextLogoWhite from "@/assets/yext-logo-white.jpg";
import { useProspects } from "@/hooks/useProspects";
import { MultiSelect } from "@/components/MultiSelect";
import { ProspectSheet } from "@/components/ProspectSheet";
import { CSVUploadDialog } from "@/components/CSVUploadDialog";
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
  Target,
  ChevronDown,
  ChevronUp as ChevronUpIcon,
  SlidersHorizontal,
  Sun,
  Moon,
  Menu,
  ChevronRight as ChevronRightIcon,
} from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Slider } from "@/components/ui/slider";
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
    fLocRange: [number, number];
    fOutreach: string[];
    fPriority: string[];
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

// --- Pipeline colors (updated for Yext palette) ---
const STAGE_COLORS: Record<string, string> = {
  "Not Started": "hsl(225, 15%, 50%)",
  "Actively Prospecting": "hsl(236, 64%, 57%)",
  "Meeting Booked": "hsl(38, 92%, 55%)",
  "Closed Lost": "hsl(0, 65%, 55%)",
  "Closed Won": "hsl(152, 65%, 38%)",
};

const STAGE_EMOJI: Record<string, string> = {
  "Not Started": "⬜", "Actively Prospecting": "🔍", "Meeting Booked": "📅",
  "Closed Lost": "❌", "Closed Won": "🏆",
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
  const [dragging, setDragging] = useState(false);
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

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragging(false);
    if (!onUpload) return;
    const file = e.dataTransfer.files?.[0];
    if (!file || !file.type.startsWith("image/")) return;
    const reader = new FileReader();
    reader.onload = () => onUpload(reader.result as string);
    reader.readAsDataURL(file);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (onUpload) setDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragging(false);
  };

  const dragProps = onUpload ? {
    onDrop: handleDrop,
    onDragOver: handleDragOver,
    onDragLeave: handleDragLeave,
  } : {};

  if (customLogo) {
    return (
      <div className="relative group shrink-0" style={{ width: size, height: size }} {...dragProps}>
        <img src={customLogo} alt="" className={cn("rounded-md bg-muted object-contain w-full h-full", dragging && "ring-2 ring-primary")} />
        {onRemove && (
          <button
            onClick={(e) => { e.stopPropagation(); onRemove(); }}
            className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-destructive text-destructive-foreground flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
          >
            <X className="w-2.5 h-2.5" />
          </button>
        )}
        {dragging && (
          <div className="absolute inset-0 rounded-md bg-primary/30 flex items-center justify-center">
            <Upload className="w-3 h-3 text-primary" />
          </div>
        )}
      </div>
    );
  }

  const showFallback = !website || err || !url;

  if (showFallback) {
    return (
      <div className="relative group shrink-0" style={{ width: size, height: size }} {...dragProps}>
        <div className={cn("rounded-md bg-muted flex items-center justify-center w-full h-full", dragging && "ring-2 ring-primary")}>
          {dragging ? (
            <Upload className="text-primary" style={{ width: size * 0.4, height: size * 0.4 }} />
          ) : (
            <Building2 className="text-muted-foreground" style={{ width: size * 0.5, height: size * 0.5 }} />
          )}
        </div>
        {onUpload && !dragging && (
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
    <div className="relative group shrink-0" style={{ width: size, height: size }} {...dragProps}>
      <img
        src={url}
        alt=""
        className={cn("rounded-md bg-muted object-contain w-full h-full", dragging && "ring-2 ring-primary")}
        onError={() => setErr(true)}
      />
      {onUpload && !dragging && (
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
      {dragging && (
        <div className="absolute inset-0 rounded-md bg-primary/30 flex items-center justify-center">
          <Upload className="w-3 h-3 text-primary" />
        </div>
      )}
    </div>
  );
}
// --- Score Badge ---
function ScoreBadge({ score, prospect, compact = false }: { score: number; prospect?: Prospect; compact?: boolean }) {
  const info = getScoreLabel(score);
  const breakdown = prospect ? scoreBreakdown(prospect) : [];
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className="flex items-center gap-1.5 cursor-help">
            <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: info.color }} />
            <span className="font-bold text-foreground">{score}</span>
            {!compact && <span className="text-[10px] font-semibold" style={{ color: info.color }}>{info.short}</span>}
          </div>
        </TooltipTrigger>
        <TooltipContent side="left" align="center" collisionPadding={16} className="text-xs max-w-[220px] p-3 z-[100]">
          <p className="font-bold mb-1.5" style={{ color: info.color }}>{info.label} — {score} pts</p>
          {breakdown.length > 0 ? (
            <div className="space-y-0.5 border-t border-border pt-1.5 mb-1.5">
              {breakdown.map((b, i) => (
                <div key={i} className="flex justify-between gap-3">
                  <span className="text-muted-foreground">{b.label}</span>
                  <span className={cn("font-bold", b.value >= 0 ? "text-[hsl(var(--success))]" : "text-destructive")}>{b.value > 0 ? "+" : ""}{b.value}</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-muted-foreground mb-1.5">No scoring factors detected.</p>
          )}
          <p className="text-[10px] text-muted-foreground border-t border-border pt-1.5">Higher scores are prioritized in Action Items & Insights.</p>
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
  const { data, ok, reset, add, update, remove, bulkUpdate, bulkRemove, bulkAdd, bulkMerge } = useProspects();
  const navigate = useNavigate();
  const { theme, setTheme } = useTheme();
  const searchRef = useRef<HTMLInputElement>(null);
  const [q, setQ] = useState("");
  const [fIndustry, setFIndustry] = useState<string[]>([]);
  const [fStatus, setFStatus] = useState<string[]>([]);
  const [fCompetitor, setFCompetitor] = useState<string[]>([]);
  const [fTier, setFTier] = useState<string[]>([]);
  const [fLocRange, setFLocRange] = useState<[number, number]>([0, 0]);
  const [fOutreach, setFOutreach] = useState<string[]>([]);
  const [fPriority, setFPriority] = useState<string[]>([]);
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
  const [activeViewId, setActiveViewId] = useState<string | null>(null);

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

  // Mobile filter toggle
  const [filtersOpen, setFiltersOpen] = useState(false);
  const isMobile = useIsMobile();

  // Slide-over panel
  const [sheetProspectId, setSheetProspectId] = useState<number | null>(null);

  // CSV Upload
  const [showUpload, setShowUpload] = useState(false);

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

  const maxLocs = useMemo(() => {
    return Math.max(0, ...data.map((p) => p.locationCount || 0));
  }, [data]);

  // Initialize fLocRange once maxLocs is known
  useEffect(() => {
    if (maxLocs > 0 && fLocRange[0] === 0 && fLocRange[1] === 0) {
      setFLocRange([0, maxLocs]);
    }
  }, [maxLocs]);

  const locFilterActive = fLocRange[0] > 0 || (fLocRange[1] > 0 && fLocRange[1] < maxLocs);

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
    if (fPriority.length) r = r.filter((p) => fPriority.includes(p.priority));
    if (locFilterActive) r = r.filter((p) => {
      const lc = p.locationCount || 0;
      return lc >= fLocRange[0] && lc <= fLocRange[1];
    });
    r.sort((a, b) => {
      let av = a[sK], bv = b[sK];
      if (av == null) av = sD === "desc" ? -Infinity : Infinity;
      if (bv == null) bv = sD === "desc" ? -Infinity : Infinity;
      if (typeof av === "string") { av = av.toLowerCase(); bv = (bv || "").toLowerCase(); }
      return sD === "asc" ? (av < bv ? -1 : av > bv ? 1 : 0) : (av > bv ? -1 : av < bv ? 1 : 0);
    });
    return r;
  }, [enriched, q, fIndustry, fOutreach, fStatus, fCompetitor, fTier, fPriority, fLocRange, locFilterActive, sK, sD]);

  useMemo(() => setPage(1), [q, fIndustry, fOutreach, fStatus, fCompetitor, fTier, fPriority, fLocRange]);

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
    // Group open tasks by prospect
    const prospectTasks = data
      .filter((p) => p.tasks && p.tasks.length > 0)
      .map((p) => ({
        ...p,
        score: scoreProspect(p),
        sortedTasks: [...p.tasks].sort((a, b) => (a.dueDate || "9999").localeCompare(b.dueDate || "9999")),
      }))
      .sort((a, b) => {
        const aEarliest = a.sortedTasks[0]?.dueDate || "9999";
        const bEarliest = b.sortedTasks[0]?.dueDate || "9999";
        return aEarliest.localeCompare(bEarliest);
      })
      .slice(0, 8);
    return { untouched, stale, prospectTasks };
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
      cold: data.filter((p) => p.priority === "Cold").length,
      ch: data.filter((p) => p.status === "Churned").length,
      prospects: data.filter((p) => p.status === "Prospect").length,
    };
  }, [data]);

  const doSort = (f: string) => {
    if (sK === f) setSD((d) => (d === "asc" ? "desc" : "asc"));
    else { setSK(f); setSD("desc"); }
  };

  const clr = () => {
    setQ(""); setFIndustry([]); setFOutreach([]); setFStatus([]); setFCompetitor([]); setFTier([]); setFPriority([]); setFLocRange([0, maxLocs]);
  };

  const hasFilters = fIndustry.length || fOutreach.length || fStatus.length || fCompetitor.length || fTier.length || fPriority.length || locFilterActive;

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
    toast.success("🎉 Added to your territory!", { description: `"${newName.trim()}" is ready to go` });
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
    toast.success("📊 CSV downloaded!", { description: "Your data is ready" });
  };

  // --- Save View ---
  const handleSaveView = () => {
    if (!viewName.trim()) return;
    const view: SavedView = {
      id: Date.now().toString(),
      name: viewName.trim(),
      filters: { q, fIndustry, fStatus, fCompetitor, fTier, fLocRange, fOutreach, fPriority },
    };
    const updated = [...savedViews, view];
    setSavedViews(updated);
    saveViews(updated);
    setShowSaveView(false);
    setViewName("");
    toast.success("💾 View saved!", { description: `"${view.name}" is ready to use` });
  };

  const loadView = (v: SavedView) => {
    setQ(v.filters.q); setFIndustry(v.filters.fIndustry); setFStatus(v.filters.fStatus);
    setFCompetitor(v.filters.fCompetitor); setFTier(v.filters.fTier);
    setFLocRange(v.filters.fLocRange || [0, maxLocs]);
    setFOutreach(v.filters.fOutreach);
    setFPriority(v.filters.fPriority || []);
    setActiveViewId(v.id);
    toast(`📂 Loaded "${v.name}"`);
  };

  const toggleView = (v: SavedView) => {
    if (activeViewId === v.id) {
      clr();
      setActiveViewId(null);
    } else {
      loadView(v);
    }
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
    toast.success("🚀 Stage updated!", { description: `${selected.size} prospects moved to "${bulkStage}"` });
    setSelected(new Set()); setBulkStage("");
  };

  const handleBulkTier = () => {
    if (!bulkTier || selected.size === 0) return;
    bulkUpdate(Array.from(selected), { tier: bulkTier });
    toast.success("🏷️ Tier updated!", { description: `${selected.size} prospects tagged` });
    setSelected(new Set()); setBulkTier("");
  };

  const handleBulkDelete = () => {
    const count = selected.size;
    bulkRemove(Array.from(selected));
    toast("🗑️ Cleaned up!", { description: `${count} prospects removed` });
    setSelected(new Set());
    setShowBulkDelete(false);
  };

  // --- Inline edit ---
  const handleInlineChange = (id: number, field: string, value: string) => {
    update(id, { [field]: value });
    setEditingCell(null);
    toast.success("✅ Updated!");
  };

  // --- Logo upload ---
  const handleLogoUpload = (id: number, base64: string) => {
    update(id, { customLogo: base64 });
    toast.success("🖼️ Logo updated!");
  };

  const handleLogoRemove = (id: number) => {
    update(id, { customLogo: undefined });
    toast("🖼️ Logo removed");
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
      toast.success("🎯 Moved!", { description: `Now in "${stage}"` });
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

  const inputClass = "w-full px-3 py-2 text-sm rounded-lg border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/50 placeholder:text-muted-foreground transition-all";
  const selectClass = "w-full px-3 py-2 text-sm rounded-lg border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/50 appearance-none cursor-pointer transition-all";

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
            className="p-1.5 rounded-lg border border-border hover:bg-muted hover:border-primary/30 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <span className="text-sm text-muted-foreground px-2">Page {page} of {totalPages}</span>
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

  if (!ok)
    return (
      <div className="bg-background min-h-screen px-4 sm:px-8 pt-8 yext-grid-bg">
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
    <div className="bg-background min-h-screen text-foreground yext-grid-bg">
      {/* Command Palette */}
      {cmdOpen && (
        <div className="fixed inset-0 z-50 cmd-overlay" onClick={() => setCmdOpen(false)}>
          <div className="fixed inset-0 bg-background/80 backdrop-blur-sm" />
          <div className="fixed top-[20%] left-1/2 -translate-x-1/2 w-full max-w-lg z-50 cmd-dialog" onClick={(e) => e.stopPropagation()}>
            <CmdK className="rounded-xl border border-primary/20 shadow-2xl bg-popover text-popover-foreground overflow-hidden">
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
                  <CommandItem onSelect={() => { setCmdOpen(false); setShowUpload(true); }}>
                    <Upload className="w-4 h-4 mr-2" /> Upload CSV
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
                    <CommandItem key={p.id} onSelect={() => { setCmdOpen(false); setSheetProspectId(p.id); }}>
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

      {/* ===== YEXT HEADER ===== */}
      <div className="yext-gradient border-b border-primary/10">
        <div className="px-4 sm:px-8 py-4 sm:py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3 sm:gap-4 min-w-0">
              <img src={theme === "dark" ? yextLogoWhite : yextLogoBlack} alt="Yext" className="h-8 sm:h-10 w-auto object-contain shrink-0" />
              <div className="min-w-0">
                <h1 className="text-2xl sm:text-4xl font-black tracking-tight text-foreground truncate">Territory Planner</h1>
                <p className="text-sm text-muted-foreground mt-0.5 hidden sm:block">Manage, prioritize, and close your territory</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {/* Desktop buttons */}
              <div className="hidden md:flex items-center gap-2">
                <Button variant="outline" size="sm" onClick={() => navigate("/insights")} className="gap-1.5 border-primary/20 text-foreground hover:bg-primary/10 bg-transparent">
                  <BarChart3 className="w-3.5 h-3.5" /> Insights
                </Button>
                <Button variant="outline" size="sm" onClick={exportCSV} className="gap-1.5 border-primary/20 text-foreground hover:bg-primary/10 bg-transparent">
                  <Download className="w-3.5 h-3.5" /> CSV
                </Button>
                <Button variant="outline" size="sm" onClick={() => setShowUpload(true)} className="gap-1.5 border-primary/20 text-foreground hover:bg-primary/10 bg-transparent">
                  <Upload className="w-3.5 h-3.5" /> Upload
                </Button>
              </div>
              <Button size="sm" onClick={() => setShowAdd(true)} className="gap-1.5 bg-primary hover:bg-primary/90 glow-blue font-semibold">
                <Plus className="w-3.5 h-3.5" /> <span className="hidden sm:inline">Add Prospect</span><span className="sm:hidden">Add</span>
              </Button>
              {selected.size >= 2 && selected.size <= 3 && (
                <Button variant="outline" size="sm" onClick={() => setShowCompare(true)} className="gap-1.5 border-primary/20 text-foreground hover:bg-primary/10 bg-transparent hidden sm:inline-flex">
                  <GitCompare className="w-3.5 h-3.5" /> Compare ({selected.size})
                </Button>
              )}
              <div className="hidden md:flex items-center border border-primary/20 rounded-lg overflow-hidden ml-1">
                <button onClick={() => setViewMode("table")} className={cn("p-2 transition-all", viewMode === "table" ? "bg-primary text-primary-foreground" : "hover:bg-primary/10 text-foreground/60")}>
                  <List className="w-4 h-4" />
                </button>
                <button onClick={() => setViewMode("kanban")} className={cn("p-2 transition-all", viewMode === "kanban" ? "bg-primary text-primary-foreground" : "hover:bg-primary/10 text-foreground/60")}>
                  <LayoutGrid className="w-4 h-4" />
                </button>
              </div>
              <button
                onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
                className="p-2 rounded-lg text-foreground/60 hover:text-foreground/80 hover:bg-primary/10 transition-all hidden md:block"
                title="Toggle theme"
              >
                {theme === "dark" ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
              </button>
              <button
                onClick={() => { if (confirm("Reset ALL data?")) { reset(); toast("🔄 Data reset to defaults"); } }}
                className="p-2 rounded-lg text-foreground/40 hover:text-foreground/80 hover:bg-primary/10 transition-all hidden md:block"
                title="Reset data"
              >
                <RotateCcw className="w-4 h-4" />
              </button>
              {/* Mobile menu */}
              <div className="md:hidden">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="sm" className="p-2 border-primary/20 bg-transparent">
                      <Menu className="w-4 h-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-48 bg-popover border-border z-50">
                    <DropdownMenuItem onClick={() => navigate("/insights")}>
                      <BarChart3 className="w-4 h-4 mr-2" /> Insights
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={exportCSV}>
                      <Download className="w-4 h-4 mr-2" /> Export CSV
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setShowUpload(true)}>
                      <Upload className="w-4 h-4 mr-2" /> Upload CSV
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={() => setViewMode(viewMode === "table" ? "kanban" : "table")}>
                      {viewMode === "table" ? <LayoutGrid className="w-4 h-4 mr-2" /> : <List className="w-4 h-4 mr-2" />}
                      {viewMode === "table" ? "Kanban View" : "Table View"}
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setTheme(theme === "dark" ? "light" : "dark")}>
                      {theme === "dark" ? <Sun className="w-4 h-4 mr-2" /> : <Moon className="w-4 h-4 mr-2" />}
                      {theme === "dark" ? "Light Mode" : "Dark Mode"}
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={() => { if (confirm("Reset ALL data?")) { reset(); toast("🔄 Data reset to defaults"); } }} className="text-destructive">
                      <RotateCcw className="w-4 h-4 mr-2" /> Reset Data
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="px-4 sm:px-8 pt-6 pb-2">
        {/* Pipeline Summary Bar */}
        {pipelineTotal > 0 && (
          <div className="mb-6 animate-fade-in-up">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Pipeline</span>
            </div>
            <div className="flex h-4 rounded-full overflow-hidden bg-muted/50 border border-border" style={{ boxShadow: '0 0 12px -2px hsl(236 64% 57% / 0.15)' }}>
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

        {/* Stat pills */}
        <div className="flex items-center gap-2.5 mb-6 overflow-x-auto scrollbar-hide flex-nowrap pb-1">
          {([
            ["📊 Total Accounts", stats.t, () => { clr(); }, false],
            ["📍 50+ Locs", stats.o50, () => { setFLocRange((prev) => prev[0] === 50 ? [0, maxLocs] : [50, maxLocs]); }, fLocRange[0] === 50],
            ["📍 100+ Locs", stats.o100, () => { setFLocRange((prev) => prev[0] === 100 ? [0, maxLocs] : [100, maxLocs]); }, fLocRange[0] === 100],
            ["🏢 500+ Locs", stats.o500, () => { setFLocRange((prev) => prev[0] === 500 ? [0, maxLocs] : [500, maxLocs]); }, fLocRange[0] === 500],
            ["🔥 Hot", stats.hot, () => { setFPriority((prev) => prev.includes("Hot") ? prev.filter(x => x !== "Hot") : [...prev, "Hot"]); }, fPriority.includes("Hot")],
            ["☀️ Warm", stats.warm, () => { setFPriority((prev) => prev.includes("Warm") ? prev.filter(x => x !== "Warm") : [...prev, "Warm"]); }, fPriority.includes("Warm")],
            ["🧊 Cold", stats.cold, () => { setFPriority((prev) => prev.includes("Cold") ? prev.filter(x => x !== "Cold") : [...prev, "Cold"]); }, fPriority.includes("Cold")],
            ["🎯 Prospects", stats.prospects, () => { setFStatus((prev) => prev.includes("Prospect") ? prev.filter(x => x !== "Prospect") : [...prev, "Prospect"]); }, fStatus.includes("Prospect")],
            ["💀 Churned", stats.ch, () => { setFStatus((prev) => prev.includes("Churned") ? prev.filter(x => x !== "Churned") : [...prev, "Churned"]); }, fStatus.includes("Churned")],
          ] as [string, number, () => void, boolean][]).map(([label, value, fn, active], i) => (
            <button
              key={i}
              onClick={() => fn()}
              className={cn(
                "flex items-center gap-2 sm:gap-3 px-3 sm:px-5 py-2.5 sm:py-3.5 rounded-xl glass-card cursor-pointer group animate-fade-in-up shrink-0",
                active ? "ring-2 ring-primary/50 glow-blue" : "glow-blue"
              )}
              style={{ animationDelay: `${i * 50}ms` }}
            >
              <span className="text-xs sm:text-sm text-muted-foreground group-hover:text-foreground transition-colors font-medium whitespace-nowrap">{label}</span>
              <span className="text-lg sm:text-xl font-black text-foreground animate-count-up" style={{ animationDelay: `${i * 50 + 200}ms` }}>{value}</span>
            </button>
          ))}
        </div>

        {/* Action Items */}
        {(homeCards.untouched.length > 0 || homeCards.stale.length > 0 || homeCards.prospectTasks.length > 0) && (
          <Collapsible open={cardsOpen} onOpenChange={setCardsOpen} className="mb-6">
            <CollapsibleTrigger asChild>
              <button className="flex items-center gap-2 text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors mb-3 uppercase tracking-wider">
                {cardsOpen ? <ChevronUpIcon className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                Action Items
              </button>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 animate-fade-in-up">
                {/* Top Scored Never Contacted */}
                <div className="glass-card rounded-xl p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <div className="p-1.5 rounded-lg bg-primary/10">
                      <Zap className="w-4 h-4 text-primary" />
                    </div>
                    <h3 className="text-xs font-semibold text-foreground uppercase tracking-wider">Top Scored — Never Contacted</h3>
                  </div>
                  <p className="text-[10px] text-muted-foreground mb-2">Highest-potential accounts you haven't reached out to yet.</p>
                  {homeCards.untouched.length === 0 ? (
                    <p className="text-xs text-muted-foreground">🎉 All prospects contacted!</p>
                  ) : (
                    <div className="space-y-1.5">
                      {homeCards.untouched.map((p) => (
                        <button
                          key={p.id}
                          onClick={() => setSheetProspectId(p.id)}
                          className="w-full flex items-center gap-3 p-2 rounded-lg hover:bg-primary/5 transition-colors text-left"
                        >
                          <LogoImg website={p.website} size={20} customLogo={p.customLogo} />
                          <span className="text-xs font-medium text-foreground truncate flex-1">{p.name}</span>
                          <ScoreBadge score={p.score} prospect={p} compact />
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* Stale Accounts */}
                <div className="glass-card rounded-xl p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <div className="p-1.5 rounded-lg bg-destructive/10">
                      <AlertTriangle className="w-4 h-4 text-destructive" />
                    </div>
                    <h3 className="text-xs font-semibold text-foreground uppercase tracking-wider">Stale Accounts (30+ days)</h3>
                  </div>
                  <p className="text-[10px] text-muted-foreground mb-2">Accounts with no logged activity in the last 30 days.</p>
                  {homeCards.stale.length === 0 ? (
                    <p className="text-xs text-muted-foreground">💪 No stale accounts!</p>
                  ) : (
                    <div className="space-y-1.5">
                      {homeCards.stale.map((p) => (
                        <button
                          key={p.id}
                          onClick={() => setSheetProspectId(p.id)}
                          className="w-full flex items-center gap-3 p-2 rounded-lg hover:bg-primary/5 transition-colors text-left"
                        >
                          <LogoImg website={p.website} size={20} customLogo={p.customLogo} />
                          <span className="text-xs font-medium text-foreground truncate flex-1">{p.name}</span>
                          <span className="text-[10px] text-muted-foreground">
                            {p.interactions?.length
                              ? relativeTime(p.interactions[p.interactions.length - 1].date)
                              : "No activity yet"}
                          </span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* Upcoming Tasks */}
                <div className="glass-card rounded-xl p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <div className="p-1.5 rounded-lg bg-[hsl(var(--warning))]/10">
                      <Target className="w-4 h-4 text-[hsl(var(--warning))]" />
                    </div>
                    <h3 className="text-xs font-semibold text-foreground uppercase tracking-wider">Upcoming Tasks</h3>
                  </div>
                  <p className="text-[10px] text-muted-foreground mb-2">Open tasks grouped by account, sorted by due date.</p>
                  {homeCards.prospectTasks.length === 0 ? (
                    <p className="text-xs text-muted-foreground">📋 No open tasks</p>
                  ) : (
                    <div className="space-y-3">
                      {homeCards.prospectTasks.map((p) => (
                        <div key={p.id}>
                          <button
                            onClick={() => setSheetProspectId(p.id)}
                            className="w-full flex items-center gap-2 p-1.5 rounded-lg hover:bg-primary/5 transition-colors text-left"
                          >
                            <LogoImg website={p.website} size={16} customLogo={p.customLogo} />
                            <span className="text-xs font-semibold text-foreground truncate">{p.name}</span>
                          </button>
                          <div className="ml-6 space-y-0.5">
                            {p.sortedTasks.map((task) => {
                              const isOverdue = task.dueDate && new Date(task.dueDate) < new Date();
                              const isToday = task.dueDate === new Date().toISOString().split("T")[0];
                              return (
                                <div key={task.id} className="flex items-center gap-2 py-0.5">
                                  <span className="text-[10px] text-muted-foreground truncate flex-1">{task.text}</span>
                                  {task.dueDate && (
                                    <span className={cn("text-[10px] font-semibold shrink-0",
                                      isOverdue ? "text-destructive" : isToday ? "text-[hsl(var(--warning))]" : "text-muted-foreground"
                                    )}>
                                      {isOverdue ? "⚠️ " : isToday ? "📅 " : ""}{task.dueDate}
                                    </span>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        </div>
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
            <span className="text-xs text-muted-foreground font-semibold uppercase tracking-wider">Views:</span>
            {savedViews.map((v) => (
              <div key={v.id} className="flex items-center gap-1 group">
                <button onClick={() => toggleView(v)} className={cn("px-3 py-1 text-xs rounded-full border transition-all font-medium",
                  activeViewId === v.id
                    ? "border-primary bg-primary text-primary-foreground shadow-sm"
                    : "border-primary/30 bg-primary/5 text-primary hover:bg-primary/15 glow-blue"
                )}>
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
        <div className="space-y-3">
          <div className="flex items-center gap-3">
            <div className="relative flex-1">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <input
                ref={searchRef}
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Search companies, industries..."
                className="w-full pl-10 pr-20 py-2.5 text-sm rounded-xl border border-border bg-card/50 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/40 transition-all backdrop-blur-sm"
                onFocus={() => {}}
              />
              {q && (
                <button
                  onClick={() => setQ("")}
                  className="absolute right-14 top-1/2 -translate-y-1/2 p-0.5 rounded-md hover:bg-muted transition-colors"
                >
                  <X className="w-3.5 h-3.5 text-muted-foreground" />
                </button>
              )}
              <button
                onClick={() => setCmdOpen(true)}
                className="absolute right-3 top-1/2 -translate-y-1/2 hidden sm:inline-flex items-center gap-0.5 px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground bg-muted rounded border border-border hover:bg-accent hover:border-primary/30 transition-all cursor-pointer"
              >
                <Command className="w-2.5 h-2.5" />K
              </button>
            </div>
            {/* Mobile filter toggle */}
            <button
              onClick={() => setFiltersOpen(!filtersOpen)}
              className={cn(
                "md:hidden inline-flex items-center gap-1.5 px-3 py-2.5 text-sm font-medium rounded-xl border transition-all shrink-0",
                filtersOpen || hasFilters
                  ? "border-primary/40 bg-primary/10 text-primary"
                  : "border-border text-muted-foreground hover:text-foreground"
              )}
            >
              <SlidersHorizontal className="w-4 h-4" />
              Filters
              {hasFilters && <span className="w-2 h-2 rounded-full bg-primary" />}
            </button>
          </div>

          {/* Filter dropdowns - always visible on desktop, toggleable on mobile */}
          <div className={cn(
            "items-center gap-3 flex-wrap",
            isMobile ? (filtersOpen ? "grid grid-cols-2 gap-3" : "hidden") : "flex"
          )}>
            <MultiSelect options={INDUSTRIES} selected={fIndustry} onChange={setFIndustry} placeholder="Industry" />
            <MultiSelect options={STAGES} selected={fOutreach} onChange={setFOutreach} placeholder="Outreach" />
            <MultiSelect options={["Prospect", "Churned"]} selected={fStatus} onChange={setFStatus} placeholder="Status" />
            <MultiSelect options={COMPETITORS.filter(Boolean)} selected={fCompetitor} onChange={setFCompetitor} placeholder="Competitor" />
            <MultiSelect options={TIERS.filter(Boolean)} selected={fTier} onChange={setFTier} placeholder="Tier" />
            <MultiSelect options={["Hot", "Warm", "Cold", "Dead"]} selected={fPriority} onChange={setFPriority} placeholder="Priority" />

            {/* Location Range Slider */}
            <Popover>
              <PopoverTrigger asChild>
                <button className={cn(
                  "inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium rounded-lg border transition-all",
                  locFilterActive
                    ? "border-primary/40 bg-primary/10 text-primary glow-blue"
                    : "border-border text-muted-foreground hover:text-foreground hover:border-primary/30"
                )}>
                  <SlidersHorizontal className="w-3.5 h-3.5" />
                  {locFilterActive
                    ? `${fLocRange[0].toLocaleString()}–${fLocRange[1].toLocaleString()} locs`
                    : "Locations"}
                </button>
              </PopoverTrigger>
              <PopoverContent className="w-72 p-4" align="start">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-foreground">Location Count</span>
                    {locFilterActive && (
                      <button
                        onClick={() => setFLocRange([0, maxLocs])}
                        className="text-[10px] text-primary hover:underline"
                      >
                        Reset
                      </button>
                    )}
                  </div>
                  <Slider
                    value={fLocRange}
                    onValueChange={(val) => setFLocRange(val as [number, number])}
                    min={0}
                    max={maxLocs}
                    step={10}
                    minStepsBetweenThumbs={1}
                    className="w-full"
                  />
                  <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                    <span>{fLocRange[0].toLocaleString()}</span>
                    <span>{fLocRange[1].toLocaleString()}</span>
                  </div>
                </div>
              </PopoverContent>
            </Popover>

            {hasFilters && (
              <>
                <button onClick={clr} className="px-3 py-2 text-xs font-medium rounded-lg border border-destructive/30 text-destructive hover:bg-destructive/5 transition-all">
                  Clear
                </button>
                <button onClick={() => setShowSaveView(true)} className="px-3 py-2 text-xs font-medium rounded-lg border border-primary/30 text-primary hover:bg-primary/5 transition-all gap-1 inline-flex items-center glow-blue">
                  <Save className="w-3 h-3" /> Save View
                </button>
              </>
            )}
          </div>
        </div>

        {/* Bulk action bar */}
        {selected.size > 0 && (
          <div className="mt-4 p-3 rounded-xl border border-primary/20 bg-primary/5 flex items-center gap-3 flex-wrap animate-fade-in-up backdrop-blur-sm">
            <span className="text-sm font-semibold text-primary">{selected.size} selected</span>
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
        <div className="px-4 sm:px-8 pb-8">
          {/* Mobile card list */}
          {isMobile ? (
            <div className="space-y-2">
              {paged.map((p) => (
                <button
                  key={p.id}
                  onClick={() => setSheetProspectId(p.id)}
                  className="w-full flex items-center gap-3 p-3 rounded-xl border border-border bg-card hover:border-primary/30 transition-all text-left"
                >
                  <span className={cn("aging-dot shrink-0", getAgingClass(p.interactions))} title={getAgingLabel(p.interactions)} />
                  <LogoImg website={p.website} size={28} customLogo={p.customLogo} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold text-foreground truncate">{p.name}</span>
                    </div>
                    <div className="flex items-center gap-1.5 mt-1">
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-muted text-muted-foreground">{p.outreach}</span>
                      {p.tier && <span className="text-[10px] px-1.5 py-0.5 rounded bg-primary/10 text-primary font-bold">{p.tier}</span>}
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
                  <button onClick={clr} className="text-xs text-primary hover:underline">Clear all filters</button>
                </div>
              )}
            </div>
          ) : (
            /* Desktop table */
            <div className="border border-border rounded-xl overflow-hidden glass-card">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/30">
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
                          "px-5 py-3 text-left text-xs font-semibold text-muted-foreground cursor-pointer select-none hover:text-foreground transition-colors uppercase tracking-wider",
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
                      className="border-b border-border last:border-0 hover:bg-primary/[0.03] cursor-pointer transition-all group row-hover-lift"
                    >
                      <td className="px-3 py-4" onClick={(e) => e.stopPropagation()}>
                        <Checkbox checked={selected.has(p.id)} onCheckedChange={() => toggleSelect(p.id)} />
                      </td>
                      <td className="px-5 py-4" onClick={() => setSheetProspectId(p.id)}>
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
                      <td className="px-5 py-4 text-foreground font-medium" onClick={() => setSheetProspectId(p.id)}>{p.locationCount || "—"}</td>
                      <td className="px-5 py-4 text-foreground font-medium" onClick={() => setSheetProspectId(p.id)}>{p.industry || "—"}</td>
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
                      <td className="px-5 py-4 text-muted-foreground" onClick={() => setSheetProspectId(p.id)}>{p.lastTouched || "—"}</td>
                    </tr>
                  ))}
                  {paged.length === 0 && (
                    <tr>
                      <td colSpan={8} className="px-5 py-16 text-center">
                        <div className="flex flex-col items-center gap-3 text-muted-foreground">
                          <FileSearch className="w-12 h-12 opacity-30" />
                          <p className="text-sm font-medium">🔍 No prospects match your filters</p>
                          <button onClick={clr} className="text-xs text-primary hover:underline">Clear all filters</button>
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
      )}

      {/* KANBAN VIEW */}
      {viewMode === "kanban" && (
        <div className="px-4 sm:px-8 pb-8 overflow-x-auto scrollbar-hide">
          <div className="flex gap-4 min-w-max">
            {kanbanStages.map((stage) => {
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
                    <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">{stage}</h3>
                    <span className="text-xs font-bold text-primary bg-primary/10 rounded-full px-2 py-0.5">{cards.length}</span>
                  </div>
                  <div className="space-y-2 min-h-[60px]">
                    {cards.map((p) => (
                      <div
                        key={p.id}
                        draggable
                        onDragStart={(e) => handleDragStart(e, p.id)}
                        onClick={() => setSheetProspectId(p.id)}
                        className={cn("kanban-card bg-card border border-border rounded-lg p-3 cursor-pointer relative overflow-hidden", dragId === p.id && "dragging")}
                      >
                        {/* Left accent strip */}
                        <div className="absolute left-0 top-0 bottom-0 w-1 rounded-l-lg" style={{ backgroundColor: stageColor }} />
                        <div className="flex items-center gap-2 mb-1 ml-2">
                          <GripVertical className="w-3 h-3 text-muted-foreground/40 shrink-0" />
                          <LogoImg website={p.website} size={20} customLogo={p.customLogo} />
                          <span className="text-xs font-semibold text-foreground truncate">{p.name}</span>
                          <span className={cn("aging-dot ml-auto", getAgingClass(p.interactions))} title={getAgingLabel(p.interactions)} />
                        </div>
                        <div className="flex items-center gap-1.5 ml-7">
                          {p.tier && <span className="text-[10px] px-1.5 py-0.5 rounded bg-primary/10 text-primary font-bold">{p.tier}</span>}
                          <span className="text-[10px] text-muted-foreground">{p.locationCount ? `${p.locationCount} locs` : ""}</span>
                          <span className="ml-auto"><ScoreBadge score={p.ps} prospect={p} compact /></span>
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
            <Button onClick={handleAdd} disabled={!newName.trim()} className="glow-blue">Add Prospect</Button>
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

      {/* Prospect Slide-Over Sheet */}
      <ProspectSheet
        prospectId={sheetProspectId}
        onClose={() => setSheetProspectId(null)}
        data={data}
        update={update}
        remove={(id) => { remove(id); setSheetProspectId(null); toast("🗑️ Prospect removed"); }}
      />

      {/* CSV Upload Dialog */}
      <CSVUploadDialog
        open={showUpload}
        onOpenChange={setShowUpload}
        existingData={data}
        onImport={(newRows, updates) => {
          if (newRows.length > 0) bulkAdd(newRows);
          if (updates.length > 0) bulkMerge(updates);
        }}
      />
    </div>
  );
}

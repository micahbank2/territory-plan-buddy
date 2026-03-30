import { useState, useMemo, useEffect, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useIsMobile } from "@/hooks/use-mobile";
import { useTheme } from "next-themes";
import { useAuth } from "@/hooks/useAuth";
import {
  STAGES,
  STATUSES,
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
import { useTerritories } from "@/hooks/useTerritories";
import { useOpportunities } from "@/hooks/useOpportunities";
import { MultiSelect } from "@/components/MultiSelect";
import { ProspectSheet } from "@/components/ProspectSheet";
import { CSVUploadDialog } from "@/components/CSVUploadDialog";
import { ShareTerritoryDialog } from "@/components/ShareTerritoryDialog";
import { BulkEditDialog } from "@/components/BulkEditDialog";
import { BulkOutreachQueue } from "@/components/BulkOutreachQueue";
import { ContactPickerDialog } from "@/components/ContactPickerDialog";
import { PasteImportDialog } from "@/components/PasteImportDialog";
import { ExportDialog } from "@/components/ExportDialog";
import { ContactPickerDialog } from "@/components/ContactPickerDialog";
import { PendingOutreachDialog } from "@/components/PendingOutreachDialog";
import { loadPendingBatch, clearPendingBatch } from "@/lib/pendingBatch";
import type { PendingBatch, PendingBatchEntry } from "@/lib/pendingBatch";
import { EnrichmentQueue } from "@/components/EnrichmentQueue";
import { AIReadinessBadge } from "@/components/AIReadinessCard";
import { Badge } from "@/components/ui/badge";
import { SignalIndicator } from "@/components/SignalsSection";
import { AddProspectDialog } from "@/components/AddProspectDialog";
import { RetroGrid } from "@/components/ui/retro-grid";
import { useSignals } from "@/hooks/useSignals";

import { cn, normalizeUrl } from "@/lib/utils";
import {
  Search,
  RotateCcw,
  LogOut,
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
  Archive,
  Save,
  X,
  Command,
  GripVertical,
  FileSearch,
  BarChart3,
  GitCompare,
   Upload,
   ClipboardPaste,
  Zap,
  Sparkles,
  Target,
  ChevronDown,
  ChevronUp as ChevronUpIcon,
  SlidersHorizontal,
  Mail,
  Sun,
  Moon,
  Menu,
  ChevronRight as ChevronRightIcon,
  Users,
  Share2,
  DollarSign,
  CalendarDays,
  TrendingUp,
  ShieldCheck,
  Mail,
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
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Command as CmdK, CommandInput, CommandList, CommandEmpty, CommandGroup, CommandItem } from "@/components/ui/command";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
// Collapsible removed — Action Items replaced by Quota strip

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
    fDataFilter?: string[];
  };
}

const DATA_FILTER_OPTIONS = [
  "Has Contacts", "No Contacts",
  "Has Notes", "No Notes",
  "Has Interactions", "No Interactions",
  "Has Tasks", "No Tasks",
  "Has AI Readiness", "No AI Readiness",
  "Has Website", "No Website",
];
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

const OWNER_EMAILS = ["micahbank2@gmail.com", "mbank@yext.com"];

export default function TerritoryPlanner() {
  const {
    territories, activeTerritory, members, myRole, loading: terrLoading,
    switchTerritory, renameTerritory, inviteMember, removeMember, updateMemberRole, createTerritory,
  } = useTerritories();
  const { data, ok, reset, add, update, remove, bulkUpdate, bulkRemove, bulkAdd, bulkMerge, archivedData, loadArchivedData, restore, permanentDelete, seedData, seeding, deleteNote, addNote, addContact, updateContact, removeContact, addInteraction, removeInteraction, addTask, removeTask } = useProspects(activeTerritory);
  const { signals, addSignal, removeSignal, getProspectSignalRelevance } = useSignals(activeTerritory);
  const { opportunities } = useOpportunities(activeTerritory);
  const { signOut, user } = useAuth();
  const isOwner = user?.email && OWNER_EMAILS.includes(user.email);
  const activeTerrObj = territories.find((t) => t.id === activeTerritory) || null;
  const isReadOnly = myRole === "viewer";
  const canManageTerritory = myRole === "owner";
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
  const [fDataFilter, setFDataFilter] = useState<string[]>([]);
  const [sK, setSK] = useState<string>("ps");
  const [sD, setSD] = useState<"asc" | "desc">("desc");
  const [page, setPage] = useState(1);
  const [viewMode, setViewMode] = useState<"table" | "kanban">("table");

  // Bulk selection
  const [selected, setSelected] = useState<Set<any>>(new Set());
  const [bulkStage, setBulkStage] = useState("");
  const [bulkTier, setBulkTier] = useState("");
  const [bulkIndustry, setBulkIndustry] = useState("");
  const [bulkPriority, setBulkPriority] = useState("");
  const [bulkCompetitor, setBulkCompetitor] = useState("");
  const [showBulkEdit, setShowBulkEdit] = useState(false);
  const [showBulkOutreach, setShowBulkOutreach] = useState(false);
  const [showContactPicker, setShowContactPicker] = useState(false);
  const [bulkConfirm, setBulkConfirm] = useState<{ label: string; action: () => void } | null>(null);

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
  const [editingCell, setEditingCell] = useState<{ id: any; field: string } | null>(null);

  // Comparison view
  const [showCompare, setShowCompare] = useState(false);

  // Home page cards collapsed state
  // cardsOpen removed — Action Items replaced by Quota strip

  // Mobile filter toggle
  const [filtersOpen, setFiltersOpen] = useState(false);
  const isMobile = useIsMobile();

  // Slide-over panel
  const [sheetProspectId, setSheetProspectId] = useState<any>(null);

  // CSV Upload
  const [showUpload, setShowUpload] = useState(false);
  const [showPasteImport, setShowPasteImport] = useState(false);
  const [showEnrich, setShowEnrich] = useState(false);
  const [showExport, setShowExport] = useState(false);

  // Reset confirmation
  const [resetDialogOpen, setResetDialogOpen] = useState(false);
  const [resetInput, setResetInput] = useState("");

  // Archive viewer
  const [showArchive, setShowArchive] = useState(false);
  useEffect(() => {
    if (showArchive) loadArchivedData();
  }, [showArchive, loadArchivedData]);
  // Share territory dialog
  const [showShare, setShowShare] = useState(false);
  // Pending outreach dialog
  const [pendingBatch, setPendingBatch] = useState<PendingBatch | null>(null);
  const [showPendingOutreach, setShowPendingOutreach] = useState(false);
  // Bulk mark contacted confirmation
  const [showBulkContactedConfirm, setShowBulkContactedConfirm] = useState(false);
  // New territory dialog
  const [showNewTerritory, setShowNewTerritory] = useState(false);
  const [newTerritoryName, setNewTerritoryName] = useState("");

  // Load pending outreach batch from localStorage on mount
  useEffect(() => {
    setPendingBatch(loadPendingBatch());
  }, []);

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

  // Reset bulk contacted confirmation when selection changes
  useEffect(() => {
    setShowBulkContactedConfirm(false);
  }, [selected.size]);

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
          (p.notes || "").toLowerCase().includes(s) ||
          (p.contacts || []).some((c: any) => (c.name || "").toLowerCase().includes(s))
      );
    }
    if (fIndustry.length) r = r.filter((p) => fIndustry.includes(p.industry));
    if (fOutreach.length) r = r.filter((p) => fOutreach.includes(p.outreach));
    if (fStatus.length) r = r.filter((p) => fStatus.includes(p.status));
    if (fCompetitor.length) r = r.filter((p) => fCompetitor.includes(p.competitor));
    if (fTier.length) r = r.filter((p) => fTier.includes(p.tier));
    if (fPriority.length) r = r.filter((p) => fPriority.includes(p.priority));
    if (fDataFilter.length) {
      r = r.filter((p) => {
        return fDataFilter.every((f) => {
          switch (f) {
            case "Has Contacts": return (p.contacts?.length || 0) > 0;
            case "No Contacts": return !p.contacts?.length;
            case "Has Notes": return (p.noteLog?.length || 0) > 0 || !!p.notes;
            case "No Notes": return (!p.noteLog?.length) && !p.notes;
            case "Has Interactions": return (p.interactions?.length || 0) > 0;
            case "No Interactions": return !p.interactions?.length;
            case "Has Tasks": return (p.tasks?.length || 0) > 0;
            case "No Tasks": return !p.tasks?.length;
            case "Has AI Readiness": return p.aiReadinessScore != null;
            case "No AI Readiness": return p.aiReadinessScore == null;
            case "Has Website": return !!p.website;
            case "No Website": return !p.website;
            default: return true;
          }
        });
      });
    }
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
  }, [enriched, q, fIndustry, fOutreach, fStatus, fCompetitor, fTier, fPriority, fDataFilter, fLocRange, locFilterActive, sK, sD]);

  useMemo(() => setPage(1), [q, fIndustry, fOutreach, fStatus, fCompetitor, fTier, fPriority, fDataFilter, fLocRange]);

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
    // Accounts with contacts but missing key roles (Champion or Decision Maker)
    const missingCoverage = data
      .filter((p) => {
        const roles = (p.contacts || []).map((c) => c.role);
        const hasChampion = roles.includes("Champion");
        const hasDM = roles.includes("Decision Maker");
        return (p.contacts?.length || 0) > 0 && (!hasChampion || !hasDM);
      })
      .map((p) => {
        const roles = (p.contacts || []).map((c) => c.role);
        const missing: string[] = [];
        if (!roles.includes("Champion")) missing.push("Champion");
        if (!roles.includes("Decision Maker")) missing.push("Decision Maker");
        return { ...p, score: scoreProspect(p), missingRoles: missing };
      })
      .sort((a, b) => b.score - a.score)
      .slice(0, 5);
    return { untouched, stale, prospectTasks, missingCoverage };
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

  // ─── Quota Summary (reads from localStorage, same keys as MyNumbersPage) ───
  const quotaSummary = useMemo(() => {
    const FY27_MONTHS = [
      "2026-02","2026-03","2026-04","2026-05","2026-06","2026-07",
      "2026-08","2026-09","2026-10","2026-11","2026-12","2027-01",
    ];
    const DEFAULT_QUOTAS: Record<string, number> = {
      "2026-02":30000,"2026-03":30000,"2026-04":60000,"2026-05":38000,
      "2026-06":38000,"2026-07":77000,"2026-08":40000,"2026-09":40000,
      "2026-10":80000,"2026-11":48000,"2026-12":48000,"2027-01":96000,
    };
    const DEFAULT_SETTINGS = { annualIncrementalQuota: 615000, u4r: 2924263, retentionTarget: 0.86, annualTI: 95000, incrementalSplit: 0.65, renewalSplit: 0.35 };

    let entries: any[];
    try {
      const stored = localStorage.getItem("my_numbers_v2");
      entries = stored ? JSON.parse(stored) : FY27_MONTHS.map(m => ({ month: m, incrementalQuota: DEFAULT_QUOTAS[m] ?? 0, incrementalBookings: 0, renewedAcv: 0 }));
    } catch { entries = FY27_MONTHS.map(m => ({ month: m, incrementalQuota: DEFAULT_QUOTAS[m] ?? 0, incrementalBookings: 0, renewedAcv: 0 })); }

    let settings: any;
    try {
      const stored = localStorage.getItem("my_numbers_settings");
      settings = stored ? { ...DEFAULT_SETTINGS, ...JSON.parse(stored) } : DEFAULT_SETTINGS;
    } catch { settings = DEFAULT_SETTINGS; }

    const now = new Date();
    const curMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
    // FY27 quarter boundaries: Q1=Feb-Apr, Q2=May-Jul, Q3=Aug-Oct, Q4=Nov-Jan
    const qStarts = ["2026-02", "2026-05", "2026-08", "2026-11"];
    const curQIdx = qStarts.findLastIndex(q => curMonth >= q);
    const qStart = qStarts[Math.max(0, curQIdx)];
    const qEnd = qStarts[curQIdx + 1] || "2027-02";

    const monthEntry = entries.find((e: any) => e.month === curMonth);
    const monthBooked = monthEntry?.incrementalBookings ?? 0;
    const monthQuota = monthEntry?.incrementalQuota ?? 0;

    const qEntries = entries.filter((e: any) => e.month >= qStart && e.month < qEnd);
    const qBooked = qEntries.reduce((s: number, e: any) => s + (e.incrementalBookings ?? 0), 0);
    const qQuota = qEntries.reduce((s: number, e: any) => s + (e.incrementalQuota ?? 0), 0);

    const ytdBooked = entries.reduce((s: number, e: any) => s + (e.incrementalBookings ?? 0), 0);
    const ytdQuota = entries.reduce((s: number, e: any) => s + (e.incrementalQuota ?? 0), 0);
    const ytdRenewed = entries.reduce((s: number, e: any) => s + (e.renewedAcv ?? 0), 0);

    // Pipeline from deals
    const CLOSED_STAGES = new Set(["Won", "Closed Won", "Closed Lost", "Dead"]);
    const totalPipeline = opportunities
      .filter(o => !CLOSED_STAGES.has(o.stage) && o.close_date)
      .reduce((s, o) => s + (o.type === "Renewal" ? (o.potential_value || 0) : (o.incremental_acv ?? o.potential_value ?? 0)), 0);

    const fmtK = (n: number) => "$" + Math.round(n).toLocaleString();

    return { monthBooked, monthQuota, qBooked, qQuota, ytdBooked, ytdQuota, ytdRenewed, totalPipeline, fmtK, settings };
  }, [opportunities]);

  const doSort = (f: string) => {
    if (sK === f) setSD((d) => (d === "asc" ? "desc" : "asc"));
    else { setSK(f); setSD("desc"); }
  };

  const clr = () => {
    setQ(""); setFIndustry([]); setFOutreach([]); setFStatus([]); setFCompetitor([]); setFTier([]); setFPriority([]); setFDataFilter([]); setFLocRange([0, maxLocs]);
  };

  const hasFilters = fIndustry.length || fOutreach.length || fStatus.length || fCompetitor.length || fTier.length || fPriority.length || fDataFilter.length || locFilterActive;

  const toggleSelect = (id: any) => {
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
  const handleAdd = async () => {
    if (!newName.trim()) return;
    await add({
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
  const exportCSV = () => setShowExport(true);

  // --- Save View ---
  const handleSaveView = () => {
    if (!viewName.trim()) return;
    const view: SavedView = {
      id: Date.now().toString(),
      name: viewName.trim(),
      filters: { q, fIndustry, fStatus, fCompetitor, fTier, fLocRange, fOutreach, fPriority, fDataFilter },
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
    setFDataFilter(v.filters.fDataFilter || []);
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

  // --- Mark Sent handler (PendingOutreachDialog) ---
  const handleMarkSent = async (entries: PendingBatchEntry[]) => {
    const today = new Date().toISOString().split("T")[0];
    const prospectIds = new Set(entries.map((e) => e.prospectId));

    await Promise.all(
      entries.map(async (entry) => {
        await addInteraction(entry.prospectId, {
          type: "Email",
          date: today,
          notes: `Cold outreach to ${entry.contactName}${entry.contactTitle ? ` (${entry.contactTitle})` : ""} via Draft Emails`,
        });
      })
    );

    // Bump outreach stage and refresh last_touched for each unique prospect
    await Promise.all(
      Array.from(prospectIds).map(async (pid) => {
        const prospect = data.find((p) => p.id === pid);
        if (!prospect) return;
        if (prospect.outreach === "Not Started") {
          await update(pid, { outreach: "Actively Prospecting" });
        } else {
          await update(pid, { outreach: prospect.outreach });
        }
      })
    );

    clearPendingBatch();
    setPendingBatch(null);
    toast.success(`Logged ${entries.length} outreach interactions.`);
  };

  // --- Bulk Mark Contacted handler ---
  const handleBulkMarkContacted = async () => {
    const today = new Date().toISOString().split("T")[0];
    const ids = Array.from(selected);

    try {
      await Promise.all(
        ids.map(async (id) => {
          const p = data.find((x) => x.id === id);
          await addInteraction(id, {
            type: "Email",
            date: today,
            notes: `Bulk outreach to ${p?.name || "account"} via Mark Contacted`,
          });
          if (p?.outreach === "Not Started") {
            await update(id, { outreach: "Actively Prospecting" });
          } else if (p) {
            await update(id, { outreach: p.outreach });
          }
        })
      );
      toast.success(`Logged outreach for ${ids.length} accounts.`);
      setSelected(new Set());
    } catch {
      toast.error("Failed to log outreach for some accounts. Reload to verify.");
    }
    setShowBulkContactedConfirm(false);
  };

  // --- Bulk Actions ---
  const confirmAndApplyBulk = (label: string, action: () => void) => {
    setBulkConfirm({ label: `Apply [${label}] to ${selected.size} selected prospects?`, action });
  };

  const handleBulkStage = () => {
    if (!bulkStage || selected.size === 0) return;
    confirmAndApplyBulk(`Outreach: ${bulkStage}`, () => {
      bulkUpdate(Array.from(selected), { outreach: bulkStage });
      toast.success(`Updated ${selected.size} prospects`, { description: `Outreach → ${bulkStage}` });
      setSelected(new Set()); setBulkStage("");
    });
  };

  const handleBulkTier = () => {
    if (!bulkTier || selected.size === 0) return;
    confirmAndApplyBulk(`Tier: ${bulkTier}`, () => {
      bulkUpdate(Array.from(selected), { tier: bulkTier });
      toast.success(`Updated ${selected.size} prospects`, { description: `Tier → ${bulkTier}` });
      setSelected(new Set()); setBulkTier("");
    });
  };

  const handleBulkIndustry = () => {
    if (!bulkIndustry || selected.size === 0) return;
    confirmAndApplyBulk(`Industry: ${bulkIndustry}`, () => {
      bulkUpdate(Array.from(selected), { industry: bulkIndustry } as any);
      toast.success(`Updated ${selected.size} prospects`, { description: `Industry → ${bulkIndustry}` });
      setSelected(new Set()); setBulkIndustry("");
    });
  };

  const handleBulkPriority = () => {
    if (!bulkPriority || selected.size === 0) return;
    const val = bulkPriority === "__none__" ? "" : bulkPriority;
    confirmAndApplyBulk(`Priority: ${val || "None"}`, () => {
      bulkUpdate(Array.from(selected), { priority: val });
      toast.success(`Updated ${selected.size} prospects`, { description: `Priority → ${val || "None"}` });
      setSelected(new Set()); setBulkPriority("");
    });
  };

  const handleBulkCompetitor = () => {
    if (!bulkCompetitor || selected.size === 0) return;
    const val = bulkCompetitor === "__none__" ? "" : bulkCompetitor;
    confirmAndApplyBulk(`Competitor: ${val || "None"}`, () => {
      bulkUpdate(Array.from(selected), { competitor: val } as any);
      toast.success(`Updated ${selected.size} prospects`, { description: `Competitor → ${val || "None"}` });
      setSelected(new Set()); setBulkCompetitor("");
    });
  };

  const handleBulkEditApply = (changes: Record<string, string | number | null>) => {
    const labels = Object.entries(changes).map(([k, v]) => `${k}: ${v}`).join(", ");
    confirmAndApplyBulk(labels, () => {
      bulkUpdate(Array.from(selected), changes as any);
      toast.success(`Updated ${selected.size} prospects`);
      setSelected(new Set());
      setShowBulkEdit(false);
    });
  };

  const handleBulkDelete = () => {
    const count = selected.size;
    bulkRemove(Array.from(selected));
    toast("🗑️ Cleaned up!", { description: `${count} prospects removed` });
    setSelected(new Set());
    setShowBulkDelete(false);
  };

  const selectAllFiltered = () => {
    setSelected(new Set(filtered.map((p) => p.id)));
    toast(`Selected all ${filtered.length} filtered prospects`);
  };

  // --- Inline edit ---
  const handleInlineChange = (id: any, field: string, value: string) => {
    update(id, { [field]: value });
    setEditingCell(null);
    toast.success("✅ Updated!");
  };

  // --- Logo upload ---
  const handleLogoUpload = (id: any, base64: string) => {
    update(id, { customLogo: base64 });
    toast.success("🖼️ Logo updated!");
  };

  const handleLogoRemove = (id: any) => {
    update(id, { customLogo: undefined });
    toast("🖼️ Logo removed");
  };

  // --- Kanban ---
  const [dragId, setDragId] = useState<any>(null);
  const kanbanStages = STAGES;

  const handleDragStart = (e: React.DragEvent, id: any) => {
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

  if (!ok || terrLoading)
    return (
      <div className="bg-background min-h-screen px-4 sm:px-8 pt-8 yext-grid-bg">
        <div className="h-8 w-48 skeleton-shimmer rounded-lg mb-6" />
        <div className="flex gap-2 mb-6">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-10 w-24 skeleton-shimmer rounded-lg" />
          ))}
        </div>
        <div className="border border-border rounded-xl overflow-hidden bg-card/80 backdrop-blur-sm">
          <table className="w-full text-sm">
            <tbody><SkeletonRows /></tbody>
          </table>
        </div>
      </div>
    );

  if (ok && data.length === 0) {
    return (
      <div className="bg-background min-h-screen flex items-center justify-center yext-grid-bg">
        <div className="text-center space-y-6 max-w-md px-4">
          <img src={theme === "dark" ? yextLogoWhite : yextLogoBlack} alt="Yext" className="h-10 mx-auto" />
          <h1 className="text-3xl font-black text-foreground">Welcome to Territory Planner</h1>
          <p className="text-muted-foreground">{isOwner ? "You don't have any prospects yet. Would you like to start with the FY27 seed data (309 accounts)?" : "You don't have any prospects yet. Add your first prospect to get started!"}</p>
          <div className="flex gap-3 justify-center">
            {isOwner && (
              <Button onClick={seedData} disabled={seeding} className="gap-2">
                <Zap className="w-4 h-4" /> {seeding ? "Importing..." : "Import Seed Data"}
              </Button>
            )}
            <Button variant="outline" onClick={() => setShowAdd(true)} className="gap-2">
              <Plus className="w-4 h-4" /> Start Fresh
            </Button>
            <Button variant="ghost" onClick={signOut} className="gap-2">
              <LogOut className="w-4 h-4" /> Sign Out
            </Button>
          </div>
          {/* Quick Add Dialog for empty state */}
          <AddProspectDialog
            open={showAdd}
            onOpenChange={setShowAdd}
            onAdd={add}
            onAddNote={addNote}
            existingNames={data.map((p) => p.name)}
            inputClass={inputClass}
            selectClass={selectClass}
          />
        </div>
      </div>
    );
  }

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
                  <CommandItem onSelect={() => { setCmdOpen(false); setShowPasteImport(true); }}>
                    <ClipboardPaste className="w-4 h-4 mr-2" /> Paste Import
                  </CommandItem>
                  <CommandItem onSelect={() => { setCmdOpen(false); setShowEnrich(true); }}>
                    <Sparkles className="w-4 h-4 mr-2" /> Enrich Prospects
                  </CommandItem>
                  <CommandItem onSelect={() => { setCmdOpen(false); navigate("/today"); }}>
                    <CalendarDays className="w-4 h-4 mr-2" /> Open Today
                  </CommandItem>
                  <CommandItem onSelect={() => { setCmdOpen(false); navigate("/opportunities"); }}>
                    <DollarSign className="w-4 h-4 mr-2" /> Open Pipeline
                  </CommandItem>
                  {canManageTerritory && <CommandItem onSelect={() => { setCmdOpen(false); navigate("/my-numbers"); }}>
                    <Target className="w-4 h-4 mr-2" /> Open Quota & Attainment
                  </CommandItem>}
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

      {/* ===== NAVBAR ===== */}
      <nav className="bg-background border-b border-border">
        {/* Top bar: Logo, territory, utilities, actions */}
        <div className="h-14 px-4 sm:px-8 flex items-center gap-4">
          {/* Left: Logo + territory */}
          <div className="flex items-center gap-3 min-w-0 shrink-0">
            <img src={theme === "dark" ? yextLogoWhite : yextLogoBlack} alt="Yext" className="h-7 w-auto object-contain shrink-0" />
            <div className="hidden sm:flex items-center gap-2 text-muted-foreground">
              <span className="text-border">/</span>
              {territories.length > 1 ? (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button className="flex items-center gap-1.5 hover:text-foreground transition-colors text-base font-semibold">
                      <span className="truncate max-w-[180px]">{activeTerrObj?.name || "My Territory"}</span>
                      <ChevronDown className="w-3.5 h-3.5 opacity-60" />
                      {isReadOnly && <span className="text-[9px] bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-400 rounded px-1.5 py-0.5 font-semibold uppercase">View Only</span>}
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="start" className="w-56 bg-popover border-border z-50">
                    {territories.map((t) => (
                      <DropdownMenuItem
                        key={t.id}
                        onClick={() => switchTerritory(t.id)}
                        className={t.id === activeTerritory ? "bg-primary/10" : ""}
                      >
                        <Users className="w-3.5 h-3.5 mr-2" />
                        <span className="truncate">{t.name}</span>
                        {t.owner_id === user?.id && <span className="ml-auto text-[9px] text-muted-foreground">owner</span>}
                      </DropdownMenuItem>
                    ))}
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={() => setShowNewTerritory(true)}>
                      <Plus className="w-3.5 h-3.5 mr-2" /> New Territory
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              ) : (
                <span className="text-base font-semibold text-foreground">{activeTerrObj?.name || "My Territory"}</span>
              )}
              <span className="inline-flex items-center rounded-full bg-muted px-2 py-0.5 text-[10px] font-semibold text-muted-foreground tabular-nums">{data.length}</span>
            </div>
          </div>

          {/* Right: Utilities + action buttons */}
          <div className="flex items-center gap-2 ml-auto shrink-0">
            {selected.size >= 2 && selected.size <= 3 && (
              <Button variant="outline" size="sm" onClick={() => setShowCompare(true)} className="gap-1.5 hidden sm:inline-flex">
                <GitCompare className="w-3.5 h-3.5" /> Compare ({selected.size})
              </Button>
            )}

            {/* Compact utility icons (desktop) */}
            <div className="hidden md:flex items-center gap-0.5">
              <div className="inline-flex items-center rounded-md border border-border overflow-hidden mr-1">
                <Tooltip delayDuration={150}>
                  <TooltipTrigger asChild>
                    <button onClick={() => setViewMode("table")} className={cn("h-7 w-7 flex items-center justify-center transition-colors", viewMode === "table" ? "bg-foreground text-background" : "bg-background hover:bg-muted text-muted-foreground")}>
                      <List className="h-3.5 w-3.5" />
                    </button>
                  </TooltipTrigger>
                  <TooltipContent side="bottom" sideOffset={8}><p>Table view</p></TooltipContent>
                </Tooltip>
                <Tooltip delayDuration={150}>
                  <TooltipTrigger asChild>
                    <button onClick={() => setViewMode("kanban")} className={cn("h-7 w-7 flex items-center justify-center transition-colors", viewMode === "kanban" ? "bg-foreground text-background" : "bg-background hover:bg-muted text-muted-foreground")}>
                      <LayoutGrid className="h-3.5 w-3.5" />
                    </button>
                  </TooltipTrigger>
                  <TooltipContent side="bottom" sideOffset={8}><p>Kanban view</p></TooltipContent>
                </Tooltip>
              </div>
              <Tooltip delayDuration={150}>
                <TooltipTrigger asChild>
                  <button onClick={() => setTheme(theme === "dark" ? "light" : "dark")} className="h-7 w-7 rounded-md flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-colors">
                    {theme === "dark" ? <Sun className="h-3.5 w-3.5" /> : <Moon className="h-3.5 w-3.5" />}
                  </button>
                </TooltipTrigger>
                <TooltipContent side="bottom" sideOffset={8}><p>{theme === "dark" ? "Light mode" : "Dark mode"}</p></TooltipContent>
              </Tooltip>
              <Tooltip delayDuration={150}>
                <TooltipTrigger asChild>
                  <button onClick={() => setShowArchive(true)} className="h-7 w-7 rounded-md flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-colors relative">
                    <Archive className="h-3.5 w-3.5" />
                    {archivedData.length > 0 && (
                      <span className="absolute -top-0.5 -right-0.5 w-3.5 h-3.5 bg-destructive text-destructive-foreground text-[8px] font-bold rounded-full flex items-center justify-center">{archivedData.length}</span>
                    )}
                  </button>
                </TooltipTrigger>
                <TooltipContent side="bottom" sideOffset={8}><p>Archive</p></TooltipContent>
              </Tooltip>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className="h-7 w-7 rounded-md flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-colors">
                    <SlidersHorizontal className="h-3.5 w-3.5" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48 z-50">
                  <DropdownMenuItem onClick={() => { setResetInput(""); setResetDialogOpen(true); }} className="gap-2 text-sm">
                    <RotateCcw className="w-3.5 h-3.5" /> Reset Data
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={signOut} className="gap-2 text-sm text-destructive">
                    <LogOut className="w-3.5 h-3.5" /> Sign Out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>

            <div className="hidden md:block w-px h-6 bg-border mx-1" />

            {/* Draft Emails — routes to PendingOutreachDialog when batch exists */}
            <Button
              variant="outline"
              onClick={() => {
                if (pendingBatch && pendingBatch.entries.length > 0) {
                  setShowPendingOutreach(true);
                } else {
                  setShowContactPicker(true);
                }
              }}
              className="gap-2 hidden sm:inline-flex h-9 px-4 text-sm font-semibold border-primary/30 hover:bg-primary/5 hover:border-primary/50 relative"
            >
              <Mail className="w-4 h-4" /> Draft Emails
              {pendingBatch && pendingBatch.entries.length > 0 && (
                <Badge variant="destructive" className="absolute -top-2 -right-2 h-5 min-w-[20px] px-1 text-[10px]">
                  {pendingBatch.entries.length}
                </Badge>
              )}
            </Button>

            {/* Share */}
            <Button variant="outline" onClick={() => setShowShare(true)} className="gap-2 hidden md:inline-flex h-9 px-4 text-sm font-semibold">
              <Share2 className="w-4 h-4" /> Share
            </Button>

            {/* + Add Data dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button className="gap-2 bg-primary hover:bg-primary/90 font-bold h-9 px-5 text-sm shadow-sm">
                  <Plus className="w-4 h-4" /> <span className="hidden sm:inline">Import / Export</span><span className="sm:hidden">Data</span>
                  <ChevronDown className="w-3.5 h-3.5 ml-0.5 opacity-70" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-[200px] z-50 p-1">
                <DropdownMenuItem onClick={() => setShowAdd(true)} className="gap-3 px-4 py-2.5 rounded-md text-sm cursor-pointer font-medium">
                  <Building2 className="w-4 h-4 text-muted-foreground shrink-0" /> Add Account
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => {/* TODO: add single contact flow */}} className="gap-3 px-4 py-2.5 rounded-md text-sm cursor-pointer font-medium">
                  <Users className="w-4 h-4 text-muted-foreground shrink-0" /> Add Contact
                </DropdownMenuItem>
                <DropdownMenuSeparator className="my-1" />
                <DropdownMenuItem onClick={() => setShowUpload(true)} className="gap-3 px-4 py-2.5 rounded-md text-sm cursor-pointer font-medium">
                  <Upload className="w-4 h-4 text-muted-foreground shrink-0" /> Upload CSV
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setShowPasteImport(true)} className="gap-3 px-4 py-2.5 rounded-md text-sm cursor-pointer font-medium">
                  <ClipboardPaste className="w-4 h-4 text-muted-foreground shrink-0" /> Paste Import
                </DropdownMenuItem>
                <DropdownMenuSeparator className="my-1" />
                <DropdownMenuItem onClick={exportCSV} className="gap-3 px-4 py-2.5 rounded-md text-sm cursor-pointer font-medium">
                  <Download className="w-4 h-4 text-muted-foreground shrink-0" /> Export CSV
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Mobile menu */}
            <div className="md:hidden">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className="h-8 w-8 flex items-center justify-center rounded-md border border-border bg-background hover:bg-muted transition-colors">
                    <Menu className="w-4 h-4" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-[220px] z-50 p-1">
                  <DropdownMenuItem onClick={() => navigate("/today")} className="gap-3 px-4 py-2 rounded-md text-sm">
                    <CalendarDays className="w-4 h-4 text-muted-foreground" /> Today
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => navigate("/opportunities")} className="gap-3 px-4 py-2 rounded-md text-sm">
                    <DollarSign className="w-4 h-4 text-muted-foreground" /> Pipeline
                  </DropdownMenuItem>
                  {canManageTerritory && <DropdownMenuItem onClick={() => navigate("/my-numbers")} className="gap-3 px-4 py-2 rounded-md text-sm">
                    <Target className="w-4 h-4 text-muted-foreground" /> Quota
                  </DropdownMenuItem>}
                  <DropdownMenuItem onClick={() => setShowEnrich(true)} className="gap-3 px-4 py-2 rounded-md text-sm">
                    <Sparkles className="w-4 h-4 text-muted-foreground" /> Enrich
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => {
                    if (pendingBatch && pendingBatch.entries.length > 0) {
                      setShowPendingOutreach(true);
                    } else {
                      setShowContactPicker(true);
                    }
                  }} className="gap-3 px-4 py-2 rounded-md text-sm">
                    <Mail className="w-4 h-4 text-muted-foreground" /> Draft Emails
                    {pendingBatch && pendingBatch.entries.length > 0 && (
                      <Badge variant="destructive" className="ml-auto h-5 min-w-[20px] px-1 text-[10px]">
                        {pendingBatch.entries.length}
                      </Badge>
                    )}
                  </DropdownMenuItem>
                  <DropdownMenuSeparator className="my-1" />
                  <DropdownMenuItem onClick={() => setShowAdd(true)} className="gap-3 px-4 py-2 rounded-md text-sm">
                    <Building2 className="w-4 h-4 text-muted-foreground" /> Add Account
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setShowUpload(true)} className="gap-3 px-4 py-2 rounded-md text-sm">
                    <Upload className="w-4 h-4 text-muted-foreground" /> Upload CSV
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setShowPasteImport(true)} className="gap-3 px-4 py-2 rounded-md text-sm">
                    <ClipboardPaste className="w-4 h-4 text-muted-foreground" /> Paste Import
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={exportCSV} className="gap-3 px-4 py-2 rounded-md text-sm">
                    <Download className="w-4 h-4 text-muted-foreground" /> Export CSV
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setShowShare(true)} className="gap-3 px-4 py-2 rounded-md text-sm">
                    <Share2 className="w-4 h-4 text-muted-foreground" /> Share Territory
                  </DropdownMenuItem>
                  <DropdownMenuSeparator className="my-1" />
                  <DropdownMenuItem onClick={() => setViewMode(viewMode === "table" ? "kanban" : "table")} className="gap-3 px-4 py-2 rounded-md text-sm">
                    {viewMode === "table" ? <LayoutGrid className="w-4 h-4 text-muted-foreground" /> : <List className="w-4 h-4 text-muted-foreground" />}
                    {viewMode === "table" ? "Kanban View" : "Table View"}
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setTheme(theme === "dark" ? "light" : "dark")} className="gap-3 px-4 py-2 rounded-md text-sm">
                    {theme === "dark" ? <Sun className="w-4 h-4 text-muted-foreground" /> : <Moon className="w-4 h-4 text-muted-foreground" />}
                    {theme === "dark" ? "Light Mode" : "Dark Mode"}
                  </DropdownMenuItem>
                  <DropdownMenuSeparator className="my-1" />
                  <DropdownMenuItem onClick={() => setShowArchive(true)} className="gap-3 px-4 py-2 rounded-md text-sm">
                    <Archive className="w-4 h-4 text-muted-foreground" /> Archive {archivedData.length > 0 && `(${archivedData.length})`}
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => { setResetInput(""); setResetDialogOpen(true); }} className="text-destructive gap-3 px-4 py-2 rounded-md text-sm">
                    <RotateCcw className="w-4 h-4" /> Reset Data
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={signOut} className="text-destructive gap-3 px-4 py-2 rounded-md text-sm">
                    <LogOut className="w-4 h-4" /> Sign Out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </div>

        {/* Bottom row: Navigation tabs — clean underline style like Linear/Notion */}
        <div className="hidden md:flex items-center px-4 sm:px-8 -mb-px">
          {[
            { label: "Accounts", icon: Building2, onClick: () => {}, active: true },
            { label: "Today", icon: CalendarDays, onClick: () => navigate("/today"), active: false },
            { label: "Pipeline", icon: DollarSign, onClick: () => navigate("/opportunities"), active: false },
            ...(canManageTerritory ? [{ label: "Quota", icon: Target, onClick: () => navigate("/my-numbers"), active: false }] : []),
            { label: "Enrich", icon: Sparkles, onClick: () => setShowEnrich(true), active: false },
          ].map((tab) => (
            <button
              key={tab.label}
              onClick={tab.onClick}
              className={cn(
                "inline-flex items-center gap-2 px-4 py-2.5 text-sm font-medium transition-colors border-b-2 -mb-px",
                tab.active
                  ? "border-primary text-foreground"
                  : "border-transparent text-muted-foreground hover:text-foreground hover:border-border"
              )}
            >
              <tab.icon className="w-4 h-4" />
              {tab.label}
            </button>
          ))}
        </div>
      </nav>

      <div className="px-4 sm:px-8 pt-6 pb-2">
        {/* Stat pills */}
        <div className="flex items-center gap-2.5 mb-6 overflow-x-auto scrollbar-hide flex-nowrap pb-1">
          {([
            ["📊 Total Accounts", stats.t, () => { clr(); }, false],
            ["📍 100+ Locs", stats.o100, () => { setFLocRange((prev) => prev[0] === 100 ? [0, maxLocs] : [100, maxLocs]); }, fLocRange[0] === 100],
            ["🏢 500+ Locs", stats.o500, () => { setFLocRange((prev) => prev[0] === 500 ? [0, maxLocs] : [500, maxLocs]); }, fLocRange[0] === 500],
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

        {/* Quota & Pipeline Strip — owner only */}
        {canManageTerritory && <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
          {(() => {
            const { monthBooked, monthQuota, qBooked, qQuota, ytdBooked, ytdQuota, ytdRenewed, totalPipeline, fmtK, settings } = quotaSummary;
            const monthPct = monthQuota > 0 ? monthBooked / monthQuota : 0;
            const qPct = qQuota > 0 ? qBooked / qQuota : 0;
            const ytdPct = ytdQuota > 0 ? ytdBooked / ytdQuota : 0;
            const pctColor = (p: number) => p >= 1 ? "text-emerald-500" : p >= 0.5 ? "text-amber-500" : "text-muted-foreground";
            const barColor = (p: number) => p >= 1 ? "bg-emerald-500" : p >= 0.5 ? "bg-amber-500" : "bg-red-400";
            return (
              <>
                <button onClick={() => navigate("/my-numbers")} className="rounded-xl border-2 border-blue-500/20 p-5 bg-gradient-to-br from-blue-500/15 to-blue-500/5 hover:border-blue-500/40 hover:shadow-lg hover:shadow-blue-500/10 transition-all text-left group">
                  <div className="flex items-center gap-2 text-sm font-black text-blue-600 dark:text-blue-400 uppercase tracking-widest mb-2">
                    <Target className="w-5 h-5" /> CLOSED WON THIS MONTH
                  </div>
                  <p className="text-3xl sm:text-4xl font-black font-mono text-foreground tracking-tight">{fmtK(monthBooked)}</p>
                  <p className="text-sm text-muted-foreground mt-1 font-medium">of {fmtK(monthQuota)} quota</p>
                  <div className="flex items-center gap-2 mt-3">
                    <div className="flex-1 h-2.5 rounded-full bg-muted overflow-hidden">
                      <div className={cn("h-full rounded-full transition-all", barColor(monthPct))} style={{ width: `${Math.min(monthPct * 100, 100)}%` }} />
                    </div>
                    <span className={cn("text-sm font-black font-mono", pctColor(monthPct))}>{Math.round(monthPct * 100)}%</span>
                  </div>
                </button>
                <button onClick={() => navigate("/my-numbers")} className="rounded-xl border-2 border-violet-500/20 p-5 bg-gradient-to-br from-violet-500/15 to-violet-500/5 hover:border-violet-500/40 hover:shadow-lg hover:shadow-violet-500/10 transition-all text-left group">
                  <div className="flex items-center gap-2 text-sm font-black text-violet-600 dark:text-violet-400 uppercase tracking-widest mb-2">
                    <TrendingUp className="w-5 h-5" /> CLOSED WON THIS QUARTER
                  </div>
                  <p className="text-3xl sm:text-4xl font-black font-mono text-foreground tracking-tight">{fmtK(qBooked)}</p>
                  <p className="text-sm text-muted-foreground mt-1 font-medium">of {fmtK(qQuota)} quota</p>
                  <div className="flex items-center gap-2 mt-3">
                    <div className="flex-1 h-2.5 rounded-full bg-muted overflow-hidden">
                      <div className={cn("h-full rounded-full transition-all", barColor(qPct))} style={{ width: `${Math.min(qPct * 100, 100)}%` }} />
                    </div>
                    <span className={cn("text-sm font-black font-mono", pctColor(qPct))}>{Math.round(qPct * 100)}%</span>
                  </div>
                </button>
                <button onClick={() => navigate("/my-numbers")} className="rounded-xl border-2 border-emerald-500/20 p-5 bg-gradient-to-br from-emerald-500/15 to-emerald-500/5 hover:border-emerald-500/40 hover:shadow-lg hover:shadow-emerald-500/10 transition-all text-left group">
                  <div className="flex items-center gap-2 text-sm font-black text-emerald-600 dark:text-emerald-400 uppercase tracking-widest mb-2">
                    <DollarSign className="w-5 h-5" /> CLOSED WON YTD
                  </div>
                  <p className="text-3xl sm:text-4xl font-black font-mono text-foreground tracking-tight">{fmtK(ytdBooked)}</p>
                  <p className="text-sm text-muted-foreground mt-1 font-medium">of {fmtK(ytdQuota)} annual quota</p>
                  <div className="flex items-center gap-2 mt-3">
                    <div className="flex-1 h-2.5 rounded-full bg-muted overflow-hidden">
                      <div className={cn("h-full rounded-full transition-all", barColor(ytdPct))} style={{ width: `${Math.min(ytdPct * 100, 100)}%` }} />
                    </div>
                    <span className={cn("text-sm font-black font-mono", pctColor(ytdPct))}>{Math.round(ytdPct * 100)}%</span>
                  </div>
                </button>
                <button onClick={() => navigate("/opportunities")} className="rounded-xl border-2 border-amber-500/20 p-5 bg-gradient-to-br from-amber-500/15 to-amber-500/5 hover:border-amber-500/40 hover:shadow-lg hover:shadow-amber-500/10 transition-all text-left group">
                  <div className="flex items-center gap-2 text-sm font-black text-amber-600 dark:text-amber-400 uppercase tracking-widest mb-2">
                    <BarChart3 className="w-5 h-5" /> ACTIVE PIPELINE
                  </div>
                  <p className="text-3xl sm:text-4xl font-black font-mono text-foreground tracking-tight">{fmtK(totalPipeline)}</p>
                  <p className="text-sm text-muted-foreground mt-1 font-medium">{opportunities.filter(o => !["Won","Closed Won","Closed Lost","Dead"].includes(o.stage)).length} open deals</p>
                  <div className="mt-3 h-2.5" />
                </button>
                {(() => {
                  const u4r = settings?.u4r ?? 0;
                  const renewPct = u4r > 0 ? ytdRenewed / u4r : 0;
                  const renewBarColor = renewPct >= 0.86 ? "bg-emerald-500" : renewPct >= 0.6 ? "bg-amber-500" : "bg-red-400";
                  const renewPctColor = renewPct >= 0.86 ? "text-emerald-500" : renewPct >= 0.6 ? "text-amber-500" : "text-muted-foreground";
                  return (
                    <button onClick={() => navigate("/my-numbers")} className="rounded-xl border-2 border-teal-500/20 p-5 bg-gradient-to-br from-teal-500/15 to-teal-500/5 hover:border-teal-500/40 hover:shadow-lg hover:shadow-teal-500/10 transition-all text-left group">
                      <div className="flex items-center gap-2 text-sm font-black text-teal-600 dark:text-teal-400 uppercase tracking-widest mb-2">
                        <ShieldCheck className="w-5 h-5" /> ACV RENEWED
                      </div>
                      <p className="text-3xl sm:text-4xl font-black font-mono text-foreground tracking-tight">{fmtK(ytdRenewed)}</p>
                      <p className="text-sm text-muted-foreground mt-1 font-medium">of {fmtK(u4r)} U4R</p>
                      <div className="flex items-center gap-2 mt-3">
                        <div className="flex-1 h-2.5 rounded-full bg-muted overflow-hidden">
                          <div className={cn("h-full rounded-full transition-all", renewBarColor)} style={{ width: `${Math.min(renewPct * 100, 100)}%` }} />
                        </div>
                        <span className={cn("text-sm font-black font-mono", renewPctColor)}>{Math.round(renewPct * 100)}%</span>
                      </div>
                    </button>
                  );
                })()}
              </>
            );
          })()}
        </div>}

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

      </div>

      {/* Search + Filters - Sticky */}
      <div className="sticky top-0 z-20 bg-background/95 backdrop-blur-sm pb-3 space-y-3 px-4 sm:px-8 pt-3 border-b border-border/30 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="relative flex-1">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <input
                ref={searchRef}
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Search accounts, contacts, industries..."
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
            <MultiSelect options={[...STATUSES]} selected={fStatus} onChange={setFStatus} placeholder="Status" />
            <MultiSelect options={COMPETITORS.filter(Boolean)} selected={fCompetitor} onChange={setFCompetitor} placeholder="Competitor" />
            <MultiSelect options={TIERS.filter(Boolean)} selected={fTier} onChange={setFTier} placeholder="Tier" />
            <MultiSelect options={["Hot", "Warm", "Cold", "Dead"]} selected={fPriority} onChange={setFPriority} placeholder="Priority" />
            <MultiSelect options={DATA_FILTER_OPTIONS} selected={fDataFilter} onChange={setFDataFilter} placeholder="Has / Missing" />

            {/* Location Range Slider */}
            <Popover>
              <PopoverTrigger asChild>
                <button className={cn(
                  "inline-flex items-center gap-2 px-4 py-2 text-xs font-bold uppercase tracking-wider rounded-full transition-all",
                  locFilterActive
                    ? "bg-primary text-primary-foreground shadow-md shadow-primary/25 hover:shadow-lg hover:shadow-primary/40 hover:bg-primary/90 hover:scale-105"
                    : "bg-muted/80 text-muted-foreground border border-border hover:bg-primary/10 hover:text-primary hover:border-primary/40 hover:shadow-md hover:shadow-primary/10 hover:scale-105"
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
                    step={maxLocs > 500 ? 10 : maxLocs > 100 ? 5 : 1}
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
          <div className="mx-4 sm:mx-8 mt-4 p-3 rounded-xl border border-primary/20 bg-primary/5 flex items-center gap-3 flex-wrap animate-fade-in-up backdrop-blur-sm">
            <span className="text-sm font-semibold text-primary">{selected.size} selected</span>
            {hasFilters && selected.size < filtered.length && (
              <button onClick={selectAllFiltered} className="text-xs text-primary hover:underline font-medium">
                Select all {filtered.length} filtered
              </button>
            )}
            <div className="w-px h-6 bg-border" />
            <select value={bulkStage} onChange={(e) => { setBulkStage(e.target.value); }} className="px-2 py-1 text-xs rounded-md border border-border bg-background text-foreground">
              <option value="">Stage...</option>
              {STAGES.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
            {bulkStage && <Button size="sm" variant="outline" onClick={handleBulkStage} className="text-xs h-7">Apply</Button>}
            <select value={bulkTier} onChange={(e) => setBulkTier(e.target.value)} className="px-2 py-1 text-xs rounded-md border border-border bg-background text-foreground">
              <option value="">Tier...</option>
              {TIERS.filter(Boolean).map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
            {bulkTier && <Button size="sm" variant="outline" onClick={handleBulkTier} className="text-xs h-7">Apply</Button>}
            <select value={bulkIndustry} onChange={(e) => setBulkIndustry(e.target.value)} className="px-2 py-1 text-xs rounded-md border border-border bg-background text-foreground">
              <option value="">Industry...</option>
              {INDUSTRIES.map((i) => <option key={i} value={i}>{i}</option>)}
            </select>
            {bulkIndustry && <Button size="sm" variant="outline" onClick={handleBulkIndustry} className="text-xs h-7">Apply</Button>}
            <select value={bulkPriority} onChange={(e) => setBulkPriority(e.target.value)} className="px-2 py-1 text-xs rounded-md border border-border bg-background text-foreground">
              <option value="">Priority...</option>
              <option value="__none__">None</option>
              <option value="Hot">Hot</option>
              <option value="Warm">Warm</option>
              <option value="Cold">Cold</option>
              <option value="Dead">Dead</option>
            </select>
            {bulkPriority && <Button size="sm" variant="outline" onClick={handleBulkPriority} className="text-xs h-7">Apply</Button>}
            <select value={bulkCompetitor} onChange={(e) => setBulkCompetitor(e.target.value)} className="px-2 py-1 text-xs rounded-md border border-border bg-background text-foreground">
              <option value="">Competitor...</option>
              <option value="__none__">None</option>
              {COMPETITORS.filter(Boolean).map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
            {bulkCompetitor && <Button size="sm" variant="outline" onClick={handleBulkCompetitor} className="text-xs h-7">Apply</Button>}
            <div className="w-px h-6 bg-border" />
            <Button size="sm" variant="outline" onClick={() => setShowBulkEdit(true)} className="text-xs h-7 gap-1">
              <SlidersHorizontal className="w-3 h-3" /> Bulk Edit
            </Button>
            <Button size="sm" variant="outline" onClick={() => setShowBulkOutreach(true)} className="text-xs h-7 gap-1">
              <Sparkles className="w-3 h-3" /> Generate Outreach ({selected.size})
            </Button>
            {!showBulkContactedConfirm ? (
              <Button size="sm" variant="outline" onClick={() => setShowBulkContactedConfirm(true)} className="text-xs h-7 gap-1">
                <Mail className="w-3 h-3" /> Mark Contacted
              </Button>
            ) : (
              <span className="flex items-center gap-2 text-xs">
                <span className="text-muted-foreground">Log Email + bump stage for {selected.size} accounts?</span>
                <Button size="sm" variant="default" onClick={handleBulkMarkContacted} className="text-xs h-7">Confirm</Button>
                <Button size="sm" variant="ghost" onClick={() => setShowBulkContactedConfirm(false)} className="text-xs h-7">Cancel</Button>
              </span>
            )}
            <Button size="sm" variant="destructive" onClick={() => setShowBulkDelete(true)} className="text-xs h-7 gap-1 ml-auto delete-glow">
              <Trash2 className="w-3 h-3" /> Delete
            </Button>
            <button onClick={() => setSelected(new Set())} className="text-xs text-muted-foreground hover:text-foreground transition-colors">Deselect</button>
          </div>
        )}

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
                            <a href={normalizeUrl(p.website)} target="_blank" rel="noreferrer" onClick={(e) => e.stopPropagation()} className="text-muted-foreground hover:text-primary transition-colors">
                              <ExternalLink className="w-3.5 h-3.5" />
                            </a>
                          )}
                          {/* Contact coverage indicator */}
                          {(() => {
                            const contacts = (p as any).contacts || [];
                            if (contacts.length === 0) return null;
                            const hasChampion = contacts.some((c: any) => c.role === "Champion");
                            const hasDM = contacts.some((c: any) => c.role === "Decision Maker");
                            const strong = hasChampion && hasDM;
                            return (
                              <span title={strong ? "Champion + Decision Maker identified" : "Contacts exist but missing Champion or Decision Maker"}>
                                <Users className={cn("w-3.5 h-3.5", strong ? "text-[hsl(var(--success))]" : "text-[hsl(var(--warning))]")} />
                              </span>
                            );
                          })()}
                          <AIReadinessBadge prospect={p as any} onClick={() => setSheetProspectId(p.id)} />
                          <SignalIndicator relevance={getProspectSignalRelevance(p.id as string)} onClick={() => setSheetProspectId(p.id)} />
                          {p.nextStepDate && new Date(p.nextStepDate) < new Date() && (
                            <span className="text-[10px] px-1.5 py-0.5 rounded bg-destructive/10 text-destructive overdue-flag" title={`Overdue: ${p.nextStep}`}>
                              ⚠ Overdue
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-1.5 mt-1.5">
                          <span className={cn(
                            "inline-flex px-2.5 py-1 text-xs font-bold rounded-lg",
                            p.status === "Churned" ? "bg-destructive/15 text-destructive" :
                            p.status === "Closed Lost Prospect" ? "bg-amber-500/15 text-amber-700 dark:text-amber-400" :
                            p.status === "Customer" ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400" :
                            "bg-[hsl(var(--success))]/15 text-[hsl(var(--success))]"
                          )}>{p.status}</span>
                          {p.competitor && (
                            <span className="inline-flex px-2.5 py-1 text-xs font-bold rounded-lg bg-[hsl(var(--warning))]/15 text-[hsl(var(--warning))]">
                              w/ {p.competitor}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-5 py-4 text-foreground font-medium" onClick={() => setSheetProspectId(p.id)}>{p.locationCount || "—"}</td>
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
                            {INDUSTRIES.map((i) => <option key={i} value={i}>{i}</option>)}
                          </select>
                        ) : (
                          <span
                            className={cn(
                              "inline-edit-cell px-2.5 py-1 text-xs font-medium rounded-lg cursor-pointer",
                              p.industry ? "text-foreground" : "text-muted-foreground/50 hover:text-muted-foreground"
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
      <AddProspectDialog
        open={showAdd}
        onOpenChange={setShowAdd}
        onAdd={add}
        onAddNote={addNote}
        existingNames={data.map((p) => p.name)}
        inputClass={inputClass}
        selectClass={selectClass}
      />

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

      {/* --- Bulk Edit Dialog --- */}
      <BulkEditDialog
        open={showBulkEdit}
        onOpenChange={setShowBulkEdit}
        selectedCount={selected.size}
        onApply={handleBulkEditApply}
      />

      {/* --- Bulk Outreach Queue --- */}
      <BulkOutreachQueue
        open={showBulkOutreach}
        onOpenChange={setShowBulkOutreach}
        prospects={data.filter(p => selected.has(p.id))}
      />

      {/* --- Contact Picker for Email Drafting --- */}
      <ContactPickerDialog
        open={showContactPicker}
        onOpenChange={setShowContactPicker}
        prospects={data}
        signals={signals}
      />

      {/* --- Bulk Confirm --- */}
      <AlertDialog open={!!bulkConfirm} onOpenChange={(v) => { if (!v) setBulkConfirm(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm Bulk Update</AlertDialogTitle>
            <AlertDialogDescription>{bulkConfirm?.label}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setBulkConfirm(null)}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => { bulkConfirm?.action(); setBulkConfirm(null); }}>Confirm</AlertDialogAction>
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
        remove={(id) => { remove(id); setSheetProspectId(null); toast("📦 Prospect archived"); }}
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

      {/* Paste Import Dialog */}
      <PasteImportDialog
        open={showPasteImport}
        onOpenChange={setShowPasteImport}
        existingData={data}
        onImport={(newRows, updates) => {
          if (newRows.length > 0) bulkAdd(newRows);
          if (updates.length > 0) bulkMerge(updates);
        }}
      />

      <AlertDialog open={resetDialogOpen} onOpenChange={setResetDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="w-5 h-5" /> Warning
            </AlertDialogTitle>
            <AlertDialogDescription className="text-sm">
              This will <span className="font-bold text-foreground">permanently erase ALL</span> prospect data and reset to demo defaults. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="space-y-2">
            <label className="text-xs font-medium text-muted-foreground">
              Type <span className="font-mono font-bold text-foreground">RESET</span> to confirm:
            </label>
            <input
              value={resetInput}
              onChange={(e) => setResetInput(e.target.value)}
              placeholder="Type RESET"
              className="w-full px-3 py-2 text-sm rounded-md border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-destructive/30 placeholder:text-muted-foreground"
              autoFocus
            />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setResetInput("")}>Cancel</AlertDialogCancel>
            <Button
              variant="destructive"
              disabled={resetInput !== "RESET"}
              onClick={() => {
                reset();
                setResetDialogOpen(false);
                setResetInput("");
                toast("🔄 Data reset to defaults");
              }}
            >
              Reset All Data
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Archive Dialog */}
      <Dialog open={showArchive} onOpenChange={setShowArchive}>
        <DialogContent className="max-w-lg max-h-[80vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Archive className="w-4 h-4" /> Archive
              {archivedData.length > 0 && <span className="text-xs text-muted-foreground font-normal">({archivedData.length} items)</span>}
            </DialogTitle>
            <DialogDescription>Deleted prospects are stored here. Restore or permanently remove them.</DialogDescription>
          </DialogHeader>
          <div className="flex-1 overflow-y-auto space-y-1 min-h-0">
            {archivedData.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground text-sm">
                <Archive className="w-8 h-8 mx-auto mb-2 opacity-40" />
                No archived prospects
              </div>
            ) : (
              archivedData.map((p) => (
                <div key={p.id + "-" + p.archivedAt} className="flex items-center justify-between gap-3 px-3 py-2.5 rounded-lg border border-border hover:bg-accent/50 transition-colors">
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-medium text-foreground truncate">{p.name}</div>
                    <div className="text-[10px] text-muted-foreground">
                      Archived {relativeTime(p.archivedAt)}
                    </div>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => { restore(p.id); toast.success(`✅ "${p.name}" restored`); }}>
                      Restore
                    </Button>
                    <Button size="sm" variant="ghost" className="h-7 text-xs text-destructive hover:text-destructive hover:bg-destructive/10" onClick={() => { permanentDelete(p.id); toast(`🗑️ "${p.name}" permanently deleted`); }}>
                      <Trash2 className="w-3 h-3" />
                    </Button>
                  </div>
                </div>
              ))
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowArchive(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Share Territory Dialog */}
      <ShareTerritoryDialog
        open={showShare}
        onOpenChange={setShowShare}
        territory={activeTerrObj}
        members={members}
        myRole={myRole}
        currentUserId={user?.id || ""}
        onInvite={inviteMember}
        onRemove={removeMember}
        onUpdateRole={updateMemberRole}
        onRename={renameTerritory}
      />

      {/* New Territory Dialog */}
      <Dialog open={showNewTerritory} onOpenChange={setShowNewTerritory}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Create Territory</DialogTitle>
            <DialogDescription>Create a new territory to organize a different set of accounts.</DialogDescription>
          </DialogHeader>
          <input
            value={newTerritoryName}
            onChange={(e) => setNewTerritoryName(e.target.value)}
            placeholder="Territory name"
            className={inputClass}
            onKeyDown={(e) => {
              if (e.key === "Enter" && newTerritoryName.trim()) {
                createTerritory(newTerritoryName.trim());
                setNewTerritoryName("");
                setShowNewTerritory(false);
              }
            }}
            autoFocus
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowNewTerritory(false)}>Cancel</Button>
            <Button
              onClick={() => {
                if (newTerritoryName.trim()) {
                  createTerritory(newTerritoryName.trim());
                  setNewTerritoryName("");
                  setShowNewTerritory(false);
                }
              }}
              disabled={!newTerritoryName.trim()}
            >
              Create
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {showEnrich && (
        <EnrichmentQueue
          prospects={data}
          onUpdate={async (id, changes) => { await update(id, changes); }}
          onClose={() => setShowEnrich(false)}
        />
      )}

      <ExportDialog open={showExport} onOpenChange={setShowExport} prospects={filtered} />

      <ContactPickerDialog
        open={showContactPicker}
        onOpenChange={(open) => {
          setShowContactPicker(open);
          if (!open) setPendingBatch(loadPendingBatch());
        }}
        prospects={data}
        signals={signals || []}
      />

      <PendingOutreachDialog
        open={showPendingOutreach}
        onOpenChange={(open) => {
          setShowPendingOutreach(open);
          if (!open) setPendingBatch(loadPendingBatch());
        }}
        batch={pendingBatch}
        onMarkSent={handleMarkSent}
        onStartNewDraft={() => {
          setShowPendingOutreach(false);
          setShowContactPicker(true);
        }}
        onDiscard={() => {
          clearPendingBatch();
          setPendingBatch(null);
          setShowPendingOutreach(false);
          toast.success("Batch cleared — no outreach logged.");
        }}
      />

    </div>
  );
}

import { useEffect, useMemo, useRef, useState } from "react";
import { useIsMobile } from "@/hooks/use-mobile";
import {
  STAGES,
  STATUSES,
  INDUSTRIES,
  COMPETITORS,
  TIERS,
  type Prospect,
} from "@/data/prospects";
import { MultiSelect } from "@/components/MultiSelect";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Slider } from "@/components/ui/slider";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Search, SlidersHorizontal, Save, X, Command } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

// --- FilterState contract ---
export interface FilterState {
  q: string;
  fIndustry: string[];
  fStatus: string[];
  fCompetitor: string[];
  fTier: string[];
  fLocRange: [number, number];
  fOutreach: string[];
  fPriority: string[];
  fDataFilter: string[];
}

export interface ProspectFilterBarProps {
  value: FilterState;
  onChange: (next: FilterState) => void;
  prospects: Prospect[];
  onReset: () => void;
  onCommandPaletteOpen?: () => void;
}

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

const EMPTY_STATE: FilterState = {
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

export function ProspectFilterBar({
  value,
  onChange,
  prospects,
  onReset,
  onCommandPaletteOpen,
}: ProspectFilterBarProps) {
  const searchRef = useRef<HTMLInputElement>(null);
  const isMobile = useIsMobile();

  const [filtersOpen, setFiltersOpen] = useState(false);
  const [savedViews, setSavedViews] = useState<SavedView[]>(loadViews);
  const [showSaveView, setShowSaveView] = useState(false);
  const [viewName, setViewName] = useState("");
  const [activeViewId, setActiveViewId] = useState<string | null>(null);

  const maxLocs = useMemo(() => {
    return Math.max(0, ...prospects.map((p) => p.locationCount || 0));
  }, [prospects]);

  // Initialize fLocRange once maxLocs known
  useEffect(() => {
    if (maxLocs > 0 && value.fLocRange[0] === 0 && value.fLocRange[1] === 0) {
      onChange({ ...value, fLocRange: [0, maxLocs] });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [maxLocs]);

  const locFilterActive =
    value.fLocRange[0] > 0 || (value.fLocRange[1] > 0 && value.fLocRange[1] < maxLocs);

  const hasFilters =
    value.fIndustry.length ||
    value.fOutreach.length ||
    value.fStatus.length ||
    value.fCompetitor.length ||
    value.fTier.length ||
    value.fPriority.length ||
    value.fDataFilter.length ||
    locFilterActive;

  const updateField = <K extends keyof FilterState>(key: K, val: FilterState[K]) => {
    onChange({ ...value, [key]: val });
  };

  const clearAll = () => {
    onChange({ ...EMPTY_STATE, fLocRange: [0, maxLocs] });
    onReset();
    setActiveViewId(null);
  };

  const handleSaveView = () => {
    if (!viewName.trim()) return;
    const view: SavedView = {
      id: Date.now().toString(),
      name: viewName.trim(),
      filters: {
        q: value.q,
        fIndustry: value.fIndustry,
        fStatus: value.fStatus,
        fCompetitor: value.fCompetitor,
        fTier: value.fTier,
        fLocRange: value.fLocRange,
        fOutreach: value.fOutreach,
        fPriority: value.fPriority,
        fDataFilter: value.fDataFilter,
      },
    };
    const updated = [...savedViews, view];
    setSavedViews(updated);
    saveViews(updated);
    setShowSaveView(false);
    setViewName("");
    toast.success("💾 View saved!", { description: `"${view.name}" is ready to use` });
  };

  const loadView = (v: SavedView) => {
    onChange({
      q: v.filters.q,
      fIndustry: v.filters.fIndustry,
      fStatus: v.filters.fStatus,
      fCompetitor: v.filters.fCompetitor,
      fTier: v.filters.fTier,
      fLocRange: v.filters.fLocRange || [0, maxLocs],
      fOutreach: v.filters.fOutreach,
      fPriority: v.filters.fPriority || [],
      fDataFilter: v.filters.fDataFilter || [],
    });
    setActiveViewId(v.id);
    toast(`📂 Loaded "${v.name}"`);
  };

  const toggleView = (v: SavedView) => {
    if (activeViewId === v.id) {
      clearAll();
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

  return (
    <>
      {/* Saved Views chips */}
      {savedViews.length > 0 && (
        <div className="flex items-center gap-2 mb-4 flex-wrap px-4 sm:px-8">
          <span className="text-xs text-muted-foreground font-semibold uppercase tracking-wider">Views:</span>
          {savedViews.map((v) => (
            <div key={v.id} className="flex items-center gap-1 group">
              <button
                onClick={() => toggleView(v)}
                className={cn(
                  "px-3 py-1 text-xs rounded-full border transition-all font-medium",
                  activeViewId === v.id
                    ? "border-primary bg-primary text-primary-foreground shadow-sm"
                    : "border-primary/30 bg-primary/5 text-primary hover:bg-primary/15 glow-blue"
                )}
              >
                {v.name}
              </button>
              <button
                onClick={() => deleteView(v.id)}
                className="opacity-0 group-hover:opacity-100 transition-opacity p-0.5 rounded-full hover:bg-destructive/10"
              >
                <X className="w-3 h-3 text-destructive" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Search + Filters - Sticky */}
      <div className="sticky top-0 z-20 bg-background/95 backdrop-blur-sm pb-3 space-y-3 px-4 sm:px-8 pt-3 border-b border-border/30 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              ref={searchRef}
              value={value.q}
              onChange={(e) => updateField("q", e.target.value)}
              placeholder="Search accounts, contacts, industries..."
              className="w-full pl-10 pr-20 py-2.5 text-sm rounded-xl border border-border bg-card/50 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/40 transition-all backdrop-blur-sm"
            />
            {value.q && (
              <button
                onClick={() => updateField("q", "")}
                className="absolute right-14 top-1/2 -translate-y-1/2 p-0.5 rounded-md hover:bg-muted transition-colors"
              >
                <X className="w-3.5 h-3.5 text-muted-foreground" />
              </button>
            )}
            {onCommandPaletteOpen && (
              <button
                onClick={onCommandPaletteOpen}
                className="absolute right-3 top-1/2 -translate-y-1/2 hidden sm:inline-flex items-center gap-0.5 px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground bg-muted rounded border border-border hover:bg-accent hover:border-primary/30 transition-all cursor-pointer"
              >
                <Command className="w-2.5 h-2.5" />K
              </button>
            )}
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

        {/* Filter dropdowns */}
        <div
          className={cn(
            "items-center gap-3 flex-wrap",
            isMobile ? (filtersOpen ? "grid grid-cols-2 gap-3" : "hidden") : "flex"
          )}
        >
          <MultiSelect options={INDUSTRIES} selected={value.fIndustry} onChange={(v) => updateField("fIndustry", v)} placeholder="Industry" />
          <MultiSelect options={STAGES} selected={value.fOutreach} onChange={(v) => updateField("fOutreach", v)} placeholder="Outreach" />
          <MultiSelect options={[...STATUSES]} selected={value.fStatus} onChange={(v) => updateField("fStatus", v)} placeholder="Status" />
          <MultiSelect options={COMPETITORS.filter(Boolean)} selected={value.fCompetitor} onChange={(v) => updateField("fCompetitor", v)} placeholder="Competitor" />
          <MultiSelect options={TIERS.filter(Boolean)} selected={value.fTier} onChange={(v) => updateField("fTier", v)} placeholder="Tier" />
          <MultiSelect options={["Hot", "Warm", "Cold", "Dead"]} selected={value.fPriority} onChange={(v) => updateField("fPriority", v)} placeholder="Priority" />
          <MultiSelect options={DATA_FILTER_OPTIONS} selected={value.fDataFilter} onChange={(v) => updateField("fDataFilter", v)} placeholder="Has / Missing" />

          {/* Location Range Slider */}
          <Popover>
            <PopoverTrigger asChild>
              <button
                className={cn(
                  "inline-flex items-center gap-2 px-4 py-2 text-xs font-bold uppercase tracking-wider rounded-full transition-all",
                  locFilterActive
                    ? "bg-primary text-primary-foreground shadow-md shadow-primary/25 hover:shadow-lg hover:shadow-primary/40 hover:bg-primary/90 hover:scale-105"
                    : "bg-muted/80 text-muted-foreground border border-border hover:bg-primary/10 hover:text-primary hover:border-primary/40 hover:shadow-md hover:shadow-primary/10 hover:scale-105"
                )}
              >
                <SlidersHorizontal className="w-3.5 h-3.5" />
                {locFilterActive
                  ? `${value.fLocRange[0].toLocaleString()}–${value.fLocRange[1].toLocaleString()} locs`
                  : "Locations"}
              </button>
            </PopoverTrigger>
            <PopoverContent className="w-72 p-4" align="start">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-foreground">Location Count</span>
                  {locFilterActive && (
                    <button
                      onClick={() => updateField("fLocRange", [0, maxLocs])}
                      className="text-[10px] text-primary hover:underline"
                    >
                      Reset
                    </button>
                  )}
                </div>
                <Slider
                  value={value.fLocRange}
                  onValueChange={(val) => updateField("fLocRange", val as [number, number])}
                  min={0}
                  max={maxLocs}
                  step={maxLocs > 500 ? 10 : maxLocs > 100 ? 5 : 1}
                  minStepsBetweenThumbs={1}
                  className="w-full"
                />
                <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                  <span>{value.fLocRange[0].toLocaleString()}</span>
                  <span>{value.fLocRange[1].toLocaleString()}</span>
                </div>
              </div>
            </PopoverContent>
          </Popover>

          {hasFilters && (
            <>
              <button
                onClick={clearAll}
                className="px-3 py-2 text-xs font-medium rounded-lg border border-destructive/30 text-destructive hover:bg-destructive/5 transition-all"
              >
                Clear
              </button>
              <button
                onClick={() => setShowSaveView(true)}
                className="px-3 py-2 text-xs font-medium rounded-lg border border-primary/30 text-primary hover:bg-primary/5 transition-all gap-1 inline-flex items-center glow-blue"
              >
                <Save className="w-3 h-3" /> Save View
              </button>
            </>
          )}
        </div>
      </div>

      {/* Save View Dialog */}
      <Dialog open={showSaveView} onOpenChange={setShowSaveView}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Save Current View</DialogTitle>
            <DialogDescription>Save your current filters as a named view for quick access.</DialogDescription>
          </DialogHeader>
          <input
            value={viewName}
            onChange={(e) => setViewName(e.target.value)}
            placeholder="View name (e.g. Hot Tier 1)"
            className="w-full px-3 py-2 text-sm rounded-lg border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/50 placeholder:text-muted-foreground transition-all"
            onKeyDown={(e) => e.key === "Enter" && handleSaveView()}
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowSaveView(false)}>Cancel</Button>
            <Button onClick={handleSaveView} disabled={!viewName.trim()}>Save View</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

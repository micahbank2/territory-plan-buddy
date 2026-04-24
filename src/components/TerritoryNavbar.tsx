import type { User } from "@supabase/supabase-js";
import type { Territory } from "@/hooks/useTerritories";
import { useNavigate } from "react-router-dom";
import { useTheme } from "next-themes";
import { Wordmark } from "@/components/brand/Wordmark";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import {
  Building2,
  CalendarDays,
  ChevronDown,
  ClipboardPaste,
  DollarSign,
  Download,
  GitCompare,
  LayoutGrid,
  List,
  LogOut,
  Mail,
  Menu,
  Moon,
  Plus,
  RotateCcw,
  Share2,
  ShieldCheck,
  SlidersHorizontal,
  Sparkles,
  Sun,
  Target,
  TrendingUp,
  Upload,
  Users,
} from "lucide-react";
import { cn } from "@/lib/utils";

export interface TerritoryNavbarProps {
  user: User | null;
  territories: Territory[];
  activeTerritory: string | null;
  activeTerrObj: Territory | null;
  myRole: "owner" | "editor" | "viewer";
  totalCount: number;
  selectedCount: number;
  pendingBatchCount: number;
  viewMode: "table" | "kanban";
  setViewMode: (m: "table" | "kanban") => void;
  onSwitchTerritory: (id: string) => void;
  onCompare: () => void;
  onSignOut: () => void;
  onOpenAdd: () => void;
  onOpenAddContact: () => void;
  onOpenUpload: () => void;
  onOpenPasteImport: () => void;
  onOpenExport: () => void;
  onOpenShare: () => void;
  onOpenEnrich: () => void;
  onOpenNewTerritory: () => void;
  onOpenReset: () => void;
  onOpenDraftEmails: () => void;
}

export function TerritoryNavbar({
  user,
  territories,
  activeTerritory,
  activeTerrObj,
  myRole,
  totalCount,
  selectedCount,
  pendingBatchCount,
  viewMode,
  setViewMode,
  onSwitchTerritory,
  onCompare,
  onSignOut,
  onOpenAdd,
  onOpenAddContact,
  onOpenUpload,
  onOpenPasteImport,
  onOpenExport,
  onOpenShare,
  onOpenEnrich,
  onOpenNewTerritory,
  onOpenReset,
  onOpenDraftEmails,
}: TerritoryNavbarProps) {
  const navigate = useNavigate();
  const { theme, setTheme } = useTheme();
  const isReadOnly = myRole === "viewer";
  const canManageTerritory = myRole === "owner";

  return (
    <nav className="bg-background border-b border-border">
      <div className="h-14 px-4 sm:px-8 flex items-center gap-4">
        <div className="flex items-center gap-3 min-w-0 shrink-0">
          <Wordmark className="text-base shrink-0" />
          <div className="hidden sm:flex items-center gap-2 text-muted-foreground">
            <span className="text-border">/</span>
            {territories.length > 1 ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className="flex items-center gap-1.5 hover:text-foreground transition-colors text-base font-semibold">
                    <span className="truncate max-w-[180px]">{activeTerrObj?.name || "My Territory"}</span>
                    <ChevronDown className="w-3.5 h-3.5 opacity-60" />
                    {isReadOnly && (
                      <span className="text-[9px] bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-400 rounded px-1.5 py-0.5 font-semibold uppercase">
                        View Only
                      </span>
                    )}
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="w-56 bg-popover border-border z-50">
                  {territories.map((t) => (
                    <DropdownMenuItem
                      key={t.id}
                      onClick={() => onSwitchTerritory(t.id)}
                      className={t.id === activeTerritory ? "bg-primary/10" : ""}
                    >
                      <Users className="w-3.5 h-3.5 mr-2" />
                      <span className="truncate">{t.name}</span>
                      {t.owner_id === user?.id && (
                        <span className="ml-auto text-[9px] text-muted-foreground">owner</span>
                      )}
                    </DropdownMenuItem>
                  ))}
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={onOpenNewTerritory}>
                    <Plus className="w-3.5 h-3.5 mr-2" /> New Territory
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <span className="text-base font-semibold text-foreground">
                {activeTerrObj?.name || "My Territory"}
              </span>
            )}
            <span className="inline-flex items-center rounded-full bg-muted px-2 py-0.5 text-[10px] font-semibold text-muted-foreground tabular-nums">
              {totalCount}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2 ml-auto shrink-0">
          {selectedCount >= 2 && selectedCount <= 3 && (
            <Button variant="outline" size="sm" onClick={onCompare} className="gap-1.5 hidden sm:inline-flex">
              <GitCompare className="w-3.5 h-3.5" /> Compare ({selectedCount})
            </Button>
          )}

          <div className="hidden md:flex items-center gap-0.5">
            <div className="inline-flex items-center rounded-md border border-border overflow-hidden mr-1">
              <Tooltip delayDuration={150}>
                <TooltipTrigger asChild>
                  <button
                    onClick={() => setViewMode("table")}
                    className={cn(
                      "h-7 w-7 flex items-center justify-center transition-colors",
                      viewMode === "table"
                        ? "bg-foreground text-background"
                        : "bg-background hover:bg-muted text-muted-foreground"
                    )}
                  >
                    <List className="h-3.5 w-3.5" />
                  </button>
                </TooltipTrigger>
                <TooltipContent side="bottom" sideOffset={8}>
                  <p>Table view</p>
                </TooltipContent>
              </Tooltip>
              <Tooltip delayDuration={150}>
                <TooltipTrigger asChild>
                  <button
                    onClick={() => setViewMode("kanban")}
                    className={cn(
                      "h-7 w-7 flex items-center justify-center transition-colors",
                      viewMode === "kanban"
                        ? "bg-foreground text-background"
                        : "bg-background hover:bg-muted text-muted-foreground"
                    )}
                  >
                    <LayoutGrid className="h-3.5 w-3.5" />
                  </button>
                </TooltipTrigger>
                <TooltipContent side="bottom" sideOffset={8}>
                  <p>Kanban view</p>
                </TooltipContent>
              </Tooltip>
            </div>
            <Tooltip delayDuration={150}>
              <TooltipTrigger asChild>
                <button
                  onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
                  className="h-7 w-7 rounded-md flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                >
                  {theme === "dark" ? <Sun className="h-3.5 w-3.5" /> : <Moon className="h-3.5 w-3.5" />}
                </button>
              </TooltipTrigger>
              <TooltipContent side="bottom" sideOffset={8}>
                <p>{theme === "dark" ? "Light mode" : "Dark mode"}</p>
              </TooltipContent>
            </Tooltip>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="h-7 w-7 rounded-md flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-colors">
                  <SlidersHorizontal className="h-3.5 w-3.5" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48 z-50">
                <DropdownMenuItem onClick={onOpenReset} className="gap-2 text-sm">
                  <RotateCcw className="w-3.5 h-3.5" /> Reset Data
                </DropdownMenuItem>
                <DropdownMenuItem onClick={onSignOut} className="gap-2 text-sm text-destructive">
                  <LogOut className="w-3.5 h-3.5" /> Sign Out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          <div className="hidden md:block w-px h-6 bg-border mx-1" />

          <Button
            variant="outline"
            onClick={onOpenDraftEmails}
            className="gap-2 hidden sm:inline-flex h-9 px-4 text-sm font-semibold border-primary/30 hover:bg-primary/5 hover:border-primary/50 relative"
          >
            <Mail className="w-4 h-4" /> Draft Emails
            {pendingBatchCount > 0 && (
              <Badge variant="destructive" className="absolute -top-2 -right-2 h-5 min-w-[20px] px-1 text-[10px]">
                {pendingBatchCount}
              </Badge>
            )}
          </Button>

          <Button
            variant="outline"
            onClick={onOpenShare}
            className="gap-2 hidden md:inline-flex h-9 px-4 text-sm font-semibold"
          >
            <Share2 className="w-4 h-4" /> Share
          </Button>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button className="gap-2 bg-primary hover:bg-primary/90 font-bold h-9 px-5 text-sm shadow-sm">
                <Plus className="w-4 h-4" />
                <span className="hidden sm:inline">Import / Export</span>
                <span className="sm:hidden">Data</span>
                <ChevronDown className="w-3.5 h-3.5 ml-0.5 opacity-70" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-[200px] z-50 p-1">
              <DropdownMenuItem onClick={onOpenAdd} className="gap-3 px-4 py-2.5 rounded-md text-sm cursor-pointer font-medium">
                <Building2 className="w-4 h-4 text-muted-foreground shrink-0" /> Add Account
              </DropdownMenuItem>
              <DropdownMenuItem onClick={onOpenAddContact} className="gap-3 px-4 py-2.5 rounded-md text-sm cursor-pointer font-medium">
                <Users className="w-4 h-4 text-muted-foreground shrink-0" /> Add Contact
              </DropdownMenuItem>
              <DropdownMenuSeparator className="my-1" />
              <DropdownMenuItem onClick={onOpenUpload} className="gap-3 px-4 py-2.5 rounded-md text-sm cursor-pointer font-medium">
                <Upload className="w-4 h-4 text-muted-foreground shrink-0" /> Upload CSV
              </DropdownMenuItem>
              <DropdownMenuItem onClick={onOpenPasteImport} className="gap-3 px-4 py-2.5 rounded-md text-sm cursor-pointer font-medium">
                <ClipboardPaste className="w-4 h-4 text-muted-foreground shrink-0" /> Paste Import
              </DropdownMenuItem>
              <DropdownMenuSeparator className="my-1" />
              <DropdownMenuItem onClick={onOpenExport} className="gap-3 px-4 py-2.5 rounded-md text-sm cursor-pointer font-medium">
                <Download className="w-4 h-4 text-muted-foreground shrink-0" /> Export CSV
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

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
                {canManageTerritory && (
                  <DropdownMenuItem onClick={() => navigate("/my-numbers")} className="gap-3 px-4 py-2 rounded-md text-sm">
                    <Target className="w-4 h-4 text-muted-foreground" /> Quota
                  </DropdownMenuItem>
                )}
                <DropdownMenuItem onClick={onOpenEnrich} className="gap-3 px-4 py-2 rounded-md text-sm">
                  <Sparkles className="w-4 h-4 text-muted-foreground" /> Enrich
                </DropdownMenuItem>
                <DropdownMenuItem onClick={onOpenDraftEmails} className="gap-3 px-4 py-2 rounded-md text-sm">
                  <Mail className="w-4 h-4 text-muted-foreground" /> Draft Emails
                  {pendingBatchCount > 0 && (
                    <Badge variant="destructive" className="ml-auto h-5 min-w-[20px] px-1 text-[10px]">
                      {pendingBatchCount}
                    </Badge>
                  )}
                </DropdownMenuItem>
                <DropdownMenuSeparator className="my-1" />
                <DropdownMenuItem onClick={onOpenAdd} className="gap-3 px-4 py-2 rounded-md text-sm">
                  <Building2 className="w-4 h-4 text-muted-foreground" /> Add Account
                </DropdownMenuItem>
                <DropdownMenuItem onClick={onOpenUpload} className="gap-3 px-4 py-2 rounded-md text-sm">
                  <Upload className="w-4 h-4 text-muted-foreground" /> Upload CSV
                </DropdownMenuItem>
                <DropdownMenuItem onClick={onOpenPasteImport} className="gap-3 px-4 py-2 rounded-md text-sm">
                  <ClipboardPaste className="w-4 h-4 text-muted-foreground" /> Paste Import
                </DropdownMenuItem>
                <DropdownMenuItem onClick={onOpenExport} className="gap-3 px-4 py-2 rounded-md text-sm">
                  <Download className="w-4 h-4 text-muted-foreground" /> Export CSV
                </DropdownMenuItem>
                <DropdownMenuItem onClick={onOpenShare} className="gap-3 px-4 py-2 rounded-md text-sm">
                  <Share2 className="w-4 h-4 text-muted-foreground" /> Share Territory
                </DropdownMenuItem>
                <DropdownMenuSeparator className="my-1" />
                <DropdownMenuItem
                  onClick={() => setViewMode(viewMode === "table" ? "kanban" : "table")}
                  className="gap-3 px-4 py-2 rounded-md text-sm"
                >
                  {viewMode === "table" ? (
                    <LayoutGrid className="w-4 h-4 text-muted-foreground" />
                  ) : (
                    <List className="w-4 h-4 text-muted-foreground" />
                  )}
                  {viewMode === "table" ? "Kanban View" : "Table View"}
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
                  className="gap-3 px-4 py-2 rounded-md text-sm"
                >
                  {theme === "dark" ? (
                    <Sun className="w-4 h-4 text-muted-foreground" />
                  ) : (
                    <Moon className="w-4 h-4 text-muted-foreground" />
                  )}
                  {theme === "dark" ? "Light Mode" : "Dark Mode"}
                </DropdownMenuItem>
                <DropdownMenuSeparator className="my-1" />
                <DropdownMenuItem onClick={onOpenReset} className="text-destructive gap-3 px-4 py-2 rounded-md text-sm">
                  <RotateCcw className="w-4 h-4" /> Reset Data
                </DropdownMenuItem>
                <DropdownMenuItem onClick={onSignOut} className="text-destructive gap-3 px-4 py-2 rounded-md text-sm">
                  <LogOut className="w-4 h-4" /> Sign Out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>

      <div className="hidden md:flex items-center px-4 sm:px-8 -mb-px">
        {[
          { label: "Accounts", icon: Building2, onClick: () => {}, active: true },
          { label: "Today", icon: CalendarDays, onClick: () => navigate("/today"), active: false },
          { label: "Pipeline", icon: DollarSign, onClick: () => navigate("/opportunities"), active: false },
          ...(canManageTerritory
            ? [{ label: "Quota", icon: Target, onClick: () => navigate("/my-numbers"), active: false }]
            : []),
          { label: "Enrich", icon: Sparkles, onClick: onOpenEnrich, active: false },
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
  );
}

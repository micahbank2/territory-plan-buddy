import { useNavigate } from "react-router-dom";
import {
  Command as CmdK,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { LogoImg } from "@/components/territory/LogoImg";
import {
  Plus,
  Download,
  Upload,
  ClipboardPaste,
  Sparkles,
  CalendarDays,
  DollarSign,
  Target,
  LayoutGrid,
} from "lucide-react";
import type { Prospect } from "@/data/prospects";

export interface CommandPaletteProps {
  open: boolean;
  onClose: () => void;
  prospects: Prospect[];
  canManageTerritory: boolean;
  viewMode: "table" | "kanban";
  setViewMode: (m: "table" | "kanban") => void;
  onOpenProspect: (id: any) => void;
  onOpenAdd: () => void;
  onExportCSV: () => void;
  onOpenUpload: () => void;
  onOpenPasteImport: () => void;
  onOpenEnrich: () => void;
}

export function CommandPalette({
  open,
  onClose,
  prospects,
  canManageTerritory,
  viewMode,
  setViewMode,
  onOpenProspect,
  onOpenAdd,
  onExportCSV,
  onOpenUpload,
  onOpenPasteImport,
  onOpenEnrich,
}: CommandPaletteProps) {
  const navigate = useNavigate();
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 cmd-overlay" onClick={onClose}>
      <div className="fixed inset-0 bg-background/80 backdrop-blur-sm" />
      <div className="fixed top-[20%] left-1/2 -translate-x-1/2 w-full max-w-lg z-50 cmd-dialog" onClick={(e) => e.stopPropagation()}>
        <CmdK className="rounded-xl border border-primary/20 shadow-2xl bg-popover text-popover-foreground overflow-hidden">
          <CommandInput placeholder="Search prospects, actions..." className="h-12" />
          <CommandList className="max-h-80">
            <CommandEmpty>No results found.</CommandEmpty>
            <CommandGroup heading="Actions">
              <CommandItem onSelect={() => { onClose(); onOpenAdd(); }}>
                <Plus className="w-4 h-4 mr-2" /> Add Prospect
              </CommandItem>
              <CommandItem onSelect={() => { onClose(); onExportCSV(); }}>
                <Download className="w-4 h-4 mr-2" /> Export CSV
              </CommandItem>
              <CommandItem onSelect={() => { onClose(); onOpenUpload(); }}>
                <Upload className="w-4 h-4 mr-2" /> Upload CSV
              </CommandItem>
              <CommandItem onSelect={() => { onClose(); onOpenPasteImport(); }}>
                <ClipboardPaste className="w-4 h-4 mr-2" /> Paste Import
              </CommandItem>
              <CommandItem onSelect={() => { onClose(); onOpenEnrich(); }}>
                <Sparkles className="w-4 h-4 mr-2" /> Enrich Prospects
              </CommandItem>
              <CommandItem onSelect={() => { onClose(); navigate("/today"); }}>
                <CalendarDays className="w-4 h-4 mr-2" /> Open Today
              </CommandItem>
              <CommandItem onSelect={() => { onClose(); navigate("/opportunities"); }}>
                <DollarSign className="w-4 h-4 mr-2" /> Open Pipeline
              </CommandItem>
              {canManageTerritory && (
                <CommandItem onSelect={() => { onClose(); navigate("/my-numbers"); }}>
                  <Target className="w-4 h-4 mr-2" /> Open Quota & Attainment
                </CommandItem>
              )}
              <CommandItem onSelect={() => { onClose(); setViewMode(viewMode === "table" ? "kanban" : "table"); }}>
                <LayoutGrid className="w-4 h-4 mr-2" /> Toggle {viewMode === "table" ? "Kanban" : "Table"} View
              </CommandItem>
            </CommandGroup>
            <CommandGroup heading="Prospects">
              {prospects.slice(0, 20).map((p) => (
                <CommandItem key={p.id} onSelect={() => { onClose(); onOpenProspect(p.id); }}>
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
  );
}

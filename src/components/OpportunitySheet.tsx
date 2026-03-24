import { useState, useMemo, useEffect } from "react";
import {
  Sheet, SheetContent,
} from "@/components/ui/sheet";
import { Drawer, DrawerContent } from "@/components/ui/drawer";
import { useIsMobile } from "@/hooks/use-mobile";
import { OPP_TYPES, OPP_STAGES, type Opportunity } from "@/hooks/useOpportunities";
import { getLogoUrl } from "@/data/prospects";
import { AccountCombobox } from "@/components/AccountCombobox";
import { cn } from "@/lib/utils";
import {
  DollarSign, Trash2, CalendarIcon, Building2, ExternalLink,
} from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface OpportunitySheetProps {
  opportunityId: string | null;
  onClose: () => void;
  opportunities: Opportunity[];
  update: (id: string, u: Partial<Opportunity>) => void;
  remove: (id: string) => void;
  prospectMap?: Map<string, { name: string; website: string; customLogo?: string }>;
  accountOptions?: { id: string; name: string }[];
  onCreateAccount?: (partial: { name: string }) => Promise<string | undefined>;
}

const typeColors: Record<string, string> = {
  "Net New": "bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300",
  "Renewal": "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300",
  "Order Form": "bg-purple-100 text-purple-800 dark:bg-purple-900/40 dark:text-purple-300",
};

const stageColors: Record<string, string> = {
  "Develop": "text-muted-foreground",
  "Discovery": "text-blue-600 dark:text-blue-400",
  "Business Alignment": "text-indigo-600 dark:text-indigo-400",
  "Validate": "text-violet-600 dark:text-violet-400",
  "Propose": "text-amber-600 dark:text-amber-400",
  "Negotiate": "text-orange-600 dark:text-orange-400",
  "Won": "text-emerald-600 dark:text-emerald-400",
  "Closed Won": "text-emerald-600 dark:text-emerald-400",
  "Closed Lost": "text-destructive",
  "Dead": "text-muted-foreground",
};

function SheetLogo({ website, customLogo, size = 36 }: { website?: string; customLogo?: string; size?: number }) {
  const [err, setErr] = useState(false);
  const url = getLogoUrl(website, size >= 32 ? 64 : 32);
  if (customLogo) return <img src={customLogo} alt="" className="rounded-lg bg-muted object-contain" style={{ width: size, height: size }} />;
  if (!website || err || !url) return <div className="rounded-lg bg-primary/10 flex items-center justify-center" style={{ width: size, height: size }}><DollarSign className="text-primary" style={{ width: size * 0.5, height: size * 0.5 }} /></div>;
  return <img src={url} alt="" className="rounded-lg bg-muted object-contain" style={{ width: size, height: size }} onError={() => setErr(true)} />;
}

export function OpportunitySheet({
  opportunityId, onClose, opportunities, update, remove,
  prospectMap, accountOptions = [], onCreateAccount,
}: OpportunitySheetProps) {
  const isMobile = useIsMobile();
  const opp = useMemo(() => opportunities.find(o => o.id === opportunityId), [opportunities, opportunityId]);
  const prospect = useMemo(() => {
    if (!opp?.prospect_id || !prospectMap) return null;
    return prospectMap.get(opp.prospect_id) || null;
  }, [opp?.prospect_id, prospectMap]);

  const [localName, setLocalName] = useState("");
  const [localProducts, setLocalProducts] = useState("");
  const [localNotes, setLocalNotes] = useState("");
  const [localACV, setLocalACV] = useState("");
  const [localPOC, setLocalPOC] = useState("");
  
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  useEffect(() => {
    if (opp) {
      setLocalName(opp.name || "");
      setLocalProducts(opp.products || "");
      setLocalNotes(opp.notes || "");
      setLocalACV(opp.potential_value ? String(opp.potential_value) : "");
      setLocalPOC(opp.point_of_contact || "");
    }
  }, [opp?.id, opp?.name, opp?.products, opp?.notes, opp?.potential_value, opp?.point_of_contact]);

  if (!opp) return null;

  const logoWebsite = prospect?.website || "";
  const logoCustom = prospect?.customLogo;
  const accountLabel = prospect?.name || "";

  const handleUpdate = (field: string, value: any) => {
    update(opp.id, { [field]: value } as any);
    toast.success("Updated!");
  };

  const commitField = (field: string, localVal: string, currentVal: string | number) => {
    const trimmed = localVal.trim();
    if (field === "potential_value") {
      const num = parseInt(trimmed) || 0;
      if (num !== currentVal) {
        update(opp.id, { potential_value: num } as any);
        toast.success("Updated!");
      }
    } else {
      if (trimmed !== currentVal) {
        update(opp.id, { [field]: trimmed } as any);
        toast.success("Updated!");
      }
    }
  };

  const commitNotes = () => {
    if (localNotes !== (opp.notes || "")) {
      update(opp.id, { notes: localNotes } as any);
      toast.success("Notes saved!");
    }
  };

  const handleCreateAccountInDrawer = async (name: string) => {
    if (!onCreateAccount) return;
    const newId = await onCreateAccount({ name });
    if (newId) handleUpdate("prospect_id", newId);
  };

  const inputClass = "w-full px-3 py-2 text-sm rounded-lg border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/50 placeholder:text-muted-foreground transition-all";
  const selectClass = "w-full px-3 py-2 text-sm rounded-lg border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/50 appearance-none cursor-pointer transition-all";

  const isOpen = opportunityId !== null;
  const handleOpenChange = (open: boolean) => !open && onClose();

  const sheetContent = (
    <div className="w-full h-full overflow-y-auto pb-8">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-card border-b border-border px-6 py-4">
        <div className="flex items-center gap-3">
          <SheetLogo
            website={logoWebsite}
            customLogo={logoCustom}
            size={36}
          />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <input
                value={localName}
                onChange={e => setLocalName(e.target.value)}
                onBlur={() => commitField("name", localName, opp.name)}
                onKeyDown={e => { if (e.key === "Enter") (e.target as HTMLInputElement).blur(); }}
                className="text-base font-extrabold truncate bg-transparent border-b border-transparent hover:border-border focus:border-primary focus:outline-none transition-colors max-w-[240px]"
              />
              <Badge className={`${typeColors[opp.type] || "bg-muted text-foreground"} border-0 font-medium text-xs`}>
                {opp.type}
              </Badge>
            </div>
            {accountLabel && (
              <span className="text-xs text-muted-foreground block mt-0.5 truncate">{accountLabel}</span>
            )}
            <div className="flex items-center gap-2 mt-0.5">
              <span className={`text-sm font-semibold ${stageColors[opp.stage] || "text-foreground"}`}>{opp.stage}</span>
              {opp.close_date && (
                <span className={cn("text-xs", opp.close_date < new Date().toISOString().split("T")[0] ? "text-red-600 dark:text-red-400 font-medium" : "text-muted-foreground")}>
                  Close: {opp.close_date}
                </span>
              )}
            </div>
          </div>
          <div className="text-right px-2">
            <div className="text-2xl font-black text-foreground font-mono">${(opp.potential_value || 0).toLocaleString()}</div>
            <div className="text-xs text-muted-foreground font-medium">ACV</div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="px-6 py-5 space-y-5">
        {/* Deal Details */}
        <div className="space-y-3 animate-fade-in-up">
          <h3 className="text-sm font-bold text-foreground uppercase tracking-wider">Deal Details</h3>
          <div className="space-y-1">
            <label className="text-xs font-semibold text-muted-foreground uppercase">Account</label>
            <AccountCombobox
              accounts={accountOptions}
              value={opp.prospect_id}
              onChange={v => handleUpdate("prospect_id", v)}
              onCreateNew={onCreateAccount ? handleCreateAccountInDrawer : undefined}
              placeholder="Link to an account..."
              triggerClassName="w-full"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-muted-foreground uppercase">Deal Type</label>
              <select value={opp.type} onChange={e => handleUpdate("type", e.target.value)} className={selectClass}>
                {OPP_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-xs font-semibold text-muted-foreground uppercase">Stage</label>
              <select value={opp.stage} onChange={e => handleUpdate("stage", e.target.value)} className={selectClass}>
                {OPP_STAGES.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-xs font-semibold text-muted-foreground uppercase">ACV ($)</label>
              <input
                type="number"
                value={localACV}
                onChange={e => setLocalACV(e.target.value)}
                onBlur={() => commitField("potential_value", localACV, opp.potential_value)}
                className={inputClass}
                placeholder="0"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-semibold text-muted-foreground uppercase">Close Date</label>
              <Popover>
                <PopoverTrigger asChild>
                  <button className={cn(inputClass, "flex items-center gap-2 text-left", !opp.close_date && "text-muted-foreground", opp.close_date && opp.close_date < new Date().toISOString().split("T")[0] && "text-red-600 dark:text-red-400 font-medium")}>
                    <CalendarIcon className="w-4 h-4 shrink-0" />
                    {opp.close_date ? format(new Date(opp.close_date), "PPP") : "Pick a date"}
                  </button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0 z-[60]" align="start">
                  <Calendar
                    mode="single"
                    selected={opp.close_date ? new Date(opp.close_date) : undefined}
                    onSelect={date => handleUpdate("close_date", date ? date.toISOString().split("T")[0] : "")}
                    initialFocus
                    className="p-3 pointer-events-auto"
                  />
                </PopoverContent>
              </Popover>
            </div>
          </div>
          <div className="space-y-1">
            <label className="text-xs font-semibold text-muted-foreground uppercase">Products</label>
            <input
              value={localProducts}
              onChange={e => setLocalProducts(e.target.value)}
              onBlur={() => commitField("products", localProducts, opp.products)}
              className={inputClass}
              placeholder="e.g. Listings, Pages, Reviews"
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-semibold text-muted-foreground uppercase">Point of Contact</label>
            <input
              value={localPOC}
              onChange={e => setLocalPOC(e.target.value)}
              onBlur={() => commitField("point_of_contact", localPOC, opp.point_of_contact)}
              className={inputClass}
              placeholder="Contact name"
            />
          </div>
        </div>

        {/* Notes / Next Steps */}
        <div className="space-y-3 animate-fade-in-up" style={{ animationDelay: "50ms" }}>
          <h3 className="text-sm font-bold text-foreground uppercase tracking-wider">Notes / Next Steps</h3>
          <textarea
            value={localNotes}
            onChange={e => setLocalNotes(e.target.value)}
            onBlur={commitNotes}
            className={cn(inputClass, "min-h-[150px] resize-y overflow-y-auto")}
            placeholder="Add notes, next steps, key details..."
            rows={6}
          />
          {localNotes !== (opp.notes || "") && (
            <Button size="sm" onClick={commitNotes} className="gap-1.5">
              Save Notes
            </Button>
          )}
        </div>

        {/* Danger Zone */}
        <div className="pt-4 border-t border-border animate-fade-in-up" style={{ animationDelay: "100ms" }}>
          <Button
            variant="outline"
            size="sm"
            className="text-destructive hover:text-destructive hover:bg-destructive/10 border-destructive/30"
            onClick={() => setShowDeleteConfirm(true)}
          >
            <Trash2 className="w-3.5 h-3.5 mr-1.5" />
            Delete Opportunity
          </Button>
        </div>
      </div>

      {/* Delete Confirmation */}
      <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure you want to delete this deal?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete "{opp.name}". This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => {
                remove(opp.id);
                setShowDeleteConfirm(false);
                onClose();
              }}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );

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
}

import { useState, useMemo, useEffect, useRef } from "react";
import {
  Sheet, SheetContent,
} from "@/components/ui/sheet";
import { Drawer, DrawerContent } from "@/components/ui/drawer";
import { useIsMobile } from "@/hooks/use-mobile";
import { OPP_TYPES, OPP_STAGES, type Opportunity } from "@/hooks/useOpportunities";
import { cn } from "@/lib/utils";
import {
  Trash2, CalendarIcon,
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

function SheetLogo({ website, accountName, size = 36 }: { website?: string; accountName?: string; size?: number }) {
  const [logoError, setLogoError] = useState(false);
  const domain = website?.trim().replace(/^https?:\/\//, "").replace(/\/.*$/, "") ?? "";
  const initial = (accountName || "?")[0].toUpperCase();

  useEffect(() => {
    setLogoError(false);
  }, [domain]);

  if (domain && !logoError) {
    return (
      <img
        src={`https://www.google.com/s2/favicons?domain=${domain}&sz=64`}
        alt={accountName || ""}
        width={size}
        height={size}
        style={{ borderRadius: 8, objectFit: "contain" }}
        onError={() => setLogoError(true)}
      />
    );
  }
  return (
    <div className="rounded-lg bg-primary/10 flex items-center justify-center text-primary font-bold" style={{ width: size, height: size, fontSize: size * 0.45 }}>
      {initial}
    </div>
  );
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
  const [localWebsite, setLocalWebsite] = useState("");
  
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [localAccount, setLocalAccount] = useState("");
  const [acctDropdown, setAcctDropdown] = useState(false);
  const acctRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (opp) {
      setLocalName(opp.name || "");
      setLocalProducts(opp.products || "");
      setLocalNotes(opp.notes || "");
      setLocalACV(opp.potential_value ? String(opp.potential_value) : "");
      setLocalPOC(opp.point_of_contact || "");
      setLocalWebsite(opp.website || "");
      const p = opp.prospect_id && prospectMap ? prospectMap.get(opp.prospect_id) : null;
      setLocalAccount(p?.name || "");
    }
  }, [opp?.id, opp?.name, opp?.products, opp?.notes, opp?.potential_value, opp?.point_of_contact, opp?.prospect_id, opp?.website, prospectMap]);

  if (!opp) return null;

  const logoWebsite = localWebsite || opp.website || prospect?.website || "";
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

  // Dirty tracking across all local-state fields
  const isDirty =
    localName.trim() !== (opp.name || "") ||
    localProducts.trim() !== (opp.products || "") ||
    localNotes !== (opp.notes || "") ||
    (parseInt(localACV) || 0) !== (opp.potential_value || 0) ||
    localPOC.trim() !== (opp.point_of_contact || "") ||
    localWebsite.trim() !== (opp.website || "");

  const saveAll = () => {
    const changes: Partial<Opportunity> = {};
    if (localName.trim() !== (opp.name || "")) changes.name = localName.trim();
    if (localProducts.trim() !== (opp.products || "")) changes.products = localProducts.trim();
    if (localNotes !== (opp.notes || "")) changes.notes = localNotes;
    const acvNum = parseInt(localACV) || 0;
    if (acvNum !== (opp.potential_value || 0)) changes.potential_value = acvNum;
    if (localPOC.trim() !== (opp.point_of_contact || "")) changes.point_of_contact = localPOC.trim();
    if (localWebsite.trim() !== (opp.website || "")) changes.website = localWebsite.trim();
    if (Object.keys(changes).length > 0) {
      update(opp.id, changes);
      toast.success("Changes saved!");
    }
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
            accountName={accountLabel || opp.name}
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
          <div className="space-y-1" ref={acctRef}>
            <label className="text-xs font-semibold text-muted-foreground uppercase">Account</label>
            <div className="relative">
              <input
                value={localAccount}
                onChange={e => {
                  setLocalAccount(e.target.value);
                  setAcctDropdown(true);
                }}
                onFocus={() => { if (localAccount) setAcctDropdown(true); }}
                onBlur={async () => {
                  setTimeout(async () => {
                    setAcctDropdown(false);
                    const trimmed = localAccount.trim();
                    if (!trimmed) {
                      if (opp.prospect_id) handleUpdate("prospect_id", null);
                      return;
                    }
                    // Check if it matches current linked prospect
                    const current = opp.prospect_id && prospectMap ? prospectMap.get(opp.prospect_id) : null;
                    if (current?.name === trimmed) return;
                    // Check if typed name matches an existing prospect
                    const match = accountOptions?.find(a => a.name.toLowerCase() === trimmed.toLowerCase());
                    if (match) {
                      handleUpdate("prospect_id", match.id);
                    } else if (onCreateAccount) {
                      const newId = await onCreateAccount({ name: trimmed });
                      if (newId) handleUpdate("prospect_id", newId);
                    }
                  }, 150);
                }}
                placeholder="Type account name..."
                className={inputClass}
              />
              {acctDropdown && localAccount.trim() && (() => {
                const q = localAccount.toLowerCase();
                const matches = (accountOptions || []).filter(a => a.name.toLowerCase().includes(q)).slice(0, 8);
                if (!matches.length) return null;
                return (
                  <div className="absolute z-50 mt-1 w-full rounded-md border bg-popover shadow-md max-h-48 overflow-y-auto">
                    {matches.map(a => (
                      <div
                        key={a.id}
                        className="px-3 py-2 text-sm cursor-pointer hover:bg-accent truncate"
                        onMouseDown={e => {
                          e.preventDefault();
                          setLocalAccount(a.name);
                          handleUpdate("prospect_id", a.id);
                          setAcctDropdown(false);
                        }}
                      >
                        {a.name}
                      </div>
                    ))}
                  </div>
                );
              })()}
            </div>
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
          <div className="space-y-1">
            <label className="text-xs font-semibold text-muted-foreground uppercase">Website</label>
            <input
              value={localWebsite}
              onChange={e => setLocalWebsite(e.target.value)}
              onBlur={() => commitField("website", localWebsite, opp.website || "")}
              className={inputClass}
              placeholder="e.g. in-n-out.com"
            />
          </div>
        </div>

        {/* Notes / Next Steps */}
        <div className="space-y-3 animate-fade-in-up" style={{ animationDelay: "50ms" }}>
          <h3 className="text-sm font-bold text-foreground uppercase tracking-wider">Notes / Next Steps</h3>
          <textarea
            value={localNotes}
            onChange={e => setLocalNotes(e.target.value)}
            onBlur={() => commitField("notes", localNotes, opp.notes || "")}
            className={cn(inputClass, "min-h-[150px] resize-y overflow-y-auto")}
            placeholder="Add notes, next steps, key details..."
            rows={6}
          />
        </div>

        {/* Save Changes */}
        {isDirty && (
          <div className="sticky bottom-0 bg-card border-t border-border py-3 -mx-6 px-6 flex items-center gap-3 animate-fade-in-up">
            <Button size="sm" onClick={saveAll} className="gap-1.5">
              Save Changes
            </Button>
            <span className="text-xs text-muted-foreground">Unsaved changes</span>
          </div>
        )}

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

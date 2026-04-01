import { useState, useMemo, useCallback } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { MultiSelect } from "@/components/MultiSelect";
import { Mail, Copy, ChevronDown, ChevronRight, Search, ArrowLeft, ArrowRight, Check, Filter, Sparkles, Star } from "lucide-react";
import { toast } from "sonner";
import type { Prospect, Contact } from "@/data/prospects";
import { INDUSTRIES, STATUSES, TIERS, COMPETITORS, getLogoUrl } from "@/data/prospects";
import { RoleBadge, StrengthDot } from "@/components/ContactBadges";
import { buildContactPrompt, type ContactSelection } from "@/lib/buildContactPrompt";
import { savePendingBatch } from "@/lib/pendingBatch";
import type { PendingBatchEntry } from "@/lib/pendingBatch";
import type { Signal } from "@/hooks/useSignals";

interface ContactPickerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  prospects: Prospect[];
  signals: Signal[];
  onPromptGenerated?: () => void;
}

type ViewState = "picking" | "preview" | "guidance";

export function ContactPickerDialog({ open, onOpenChange, prospects, signals, onPromptGenerated }: ContactPickerDialogProps) {
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [search, setSearch] = useState("");
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [view, setView] = useState<ViewState>("picking");
  const [promptText, setPromptText] = useState("");
  const [copied, setCopied] = useState(false);
  const [showFilters, setShowFilters] = useState(false);

  // Filters
  const [fIndustry, setFIndustry] = useState<string[]>([]);
  const [fStatus, setFStatus] = useState<string[]>([]);
  const [fTier, setFTier] = useState<string[]>([]);
  const [fPriority, setFPriority] = useState<string[]>([]);
  const [fCompetitor, setFCompetitor] = useState<string[]>([]);

  const hasFilters = fIndustry.length > 0 || fStatus.length > 0 || fTier.length > 0 || fPriority.length > 0 || fCompetitor.length > 0;

  const clearFilters = () => {
    setFIndustry([]);
    setFStatus([]);
    setFTier([]);
    setFPriority([]);
    setFCompetitor([]);
  };

  const accountsWithContacts = useMemo(
    () => prospects.filter(p => p.contacts.length > 0),
    [prospects],
  );

  const filteredAccounts = useMemo(() => {
    let result = accountsWithContacts;

    // Apply filters
    if (fIndustry.length > 0) result = result.filter(p => fIndustry.includes(p.industry));
    if (fStatus.length > 0) result = result.filter(p => fStatus.includes(p.status));
    if (fTier.length > 0) result = result.filter(p => fTier.includes(p.tier));
    if (fPriority.length > 0) result = result.filter(p => fPriority.includes(p.priority));
    if (fCompetitor.length > 0) result = result.filter(p => fCompetitor.includes(p.competitor));

    // Apply search
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(p => {
        if (p.name.toLowerCase().includes(q)) return true;
        if (p.industry?.toLowerCase().includes(q)) return true;
        return p.contacts.some(
          c =>
            c.name.toLowerCase().includes(q) ||
            c.title?.toLowerCase().includes(q) ||
            c.email?.toLowerCase().includes(q),
        );
      });
    }

    return result;
  }, [accountsWithContacts, search, fIndustry, fStatus, fTier, fPriority, fCompetitor]);

  const getVisibleContacts = useCallback(
    (p: Prospect): Contact[] => {
      if (!search.trim()) return p.contacts;
      const q = search.toLowerCase();
      if (p.name.toLowerCase().includes(q) || p.industry?.toLowerCase().includes(q)) return p.contacts;
      return p.contacts.filter(
        c =>
          c.name.toLowerCase().includes(q) ||
          c.title?.toLowerCase().includes(q) ||
          c.email?.toLowerCase().includes(q),
      );
    },
    [search],
  );

  const totalVisibleContacts = useMemo(
    () => filteredAccounts.reduce((sum, p) => sum + getVisibleContacts(p).length, 0),
    [filteredAccounts, getVisibleContacts],
  );

  const toggleContact = (contactId: string) => {
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(contactId)) next.delete(contactId);
      else next.add(contactId);
      return next;
    });
  };

  const toggleAccount = (p: Prospect) => {
    const contacts = getVisibleContacts(p);
    const allSelected = contacts.every(c => selected.has(c.id));
    setSelected(prev => {
      const next = new Set(prev);
      for (const c of contacts) {
        if (allSelected) next.delete(c.id);
        else next.add(c.id);
      }
      return next;
    });
  };

  const selectAll = () => {
    const allIds = filteredAccounts.flatMap(p => getVisibleContacts(p).map(c => c.id));
    setSelected(new Set(allIds));
  };

  const clearAll = () => setSelected(new Set());

  const toggleExpanded = (prospectId: string) => {
    setExpanded(prev => {
      const next = new Set(prev);
      if (next.has(prospectId)) next.delete(prospectId);
      else next.add(prospectId);
      return next;
    });
  };

  const signalsByProspect = useMemo(() => {
    const map = new Map<string, Signal[]>();
    for (const s of signals) {
      if (!map.has(s.prospect_id)) map.set(s.prospect_id, []);
      map.get(s.prospect_id)!.push(s);
    }
    return map;
  }, [signals]);

  // Build active filter summary for prompt context
  const activeFilterSummary = useMemo(() => {
    const parts: string[] = [];
    if (fStatus.length > 0) parts.push(`Status: ${fStatus.join(", ")}`);
    if (fIndustry.length > 0) parts.push(`Industry: ${fIndustry.join(", ")}`);
    if (fTier.length > 0) parts.push(`Tier: ${fTier.join(", ")}`);
    if (fPriority.length > 0) parts.push(`Priority: ${fPriority.join(", ")}`);
    if (fCompetitor.length > 0) parts.push(`Competitor: ${fCompetitor.join(", ")}`);
    return parts;
  }, [fStatus, fIndustry, fTier, fPriority, fCompetitor]);

  const handleGenerate = () => {
    // Dedup contacts — same name + same prospect = skip duplicates
    const seen = new Set<string>();
    const dedupedSelections: ContactSelection[] = [];

    for (const p of prospects) {
      const prospectSignals = signalsByProspect.get(p.id) || [];
      for (const c of p.contacts) {
        if (!selected.has(c.id)) continue;
        const dedupeKey = `${p.id}::${c.name.toLowerCase().trim()}`;
        if (seen.has(dedupeKey)) continue;
        seen.add(dedupeKey);
        dedupedSelections.push({ contact: c, prospect: p, signals: prospectSignals });
      }
    }

    const prompt = buildContactPrompt(dedupedSelections, activeFilterSummary);
    setPromptText(prompt);
    setView("preview");
    setCopied(false);

    // Save pending outreach batch to localStorage for post-outreach tracking
    const batchEntries: PendingBatchEntry[] = dedupedSelections.map(s => ({
      contactId: s.contact.id,
      contactName: s.contact.name,
      contactTitle: s.contact.title || "",
      prospectId: s.prospect.id,
      prospectName: s.prospect.name,
    }));
    savePendingBatch({
      entries: batchEntries,
      savedAt: new Date().toISOString(),
    });
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(promptText);
    setCopied(true);
    toast.success(`Prompt copied — ${selected.size} contact${selected.size !== 1 ? "s" : ""} ready for Claude`);
    setTimeout(() => setCopied(false), 2000);
    // Transition to guidance view after copy
    setTimeout(() => setView("guidance"), 300);
  };

  const handleClose = () => {
    setView("picking");
    setSearch("");
    setSelected(new Set());
    setExpanded(new Set());
    setPromptText("");
    setCopied(false);
    clearFilters();
    setShowFilters(false);
    onOpenChange(false);
  };

  const handleGuidanceNext = () => {
    // Close this dialog and signal parent to open pending outreach
    setView("picking");
    setSearch("");
    setSelected(new Set());
    setExpanded(new Set());
    setPromptText("");
    setCopied(false);
    clearFilters();
    setShowFilters(false);
    onOpenChange(false);
    onPromptGenerated?.();
  };

  const isExpanded = (id: string) => {
    if (search.trim()) return true;
    return expanded.has(id);
  };

  const wordCount = promptText.split(/\s+/).filter(Boolean).length;
  const charCount = promptText.length;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[900px] h-[90vh] max-h-[90vh] min-h-0 overflow-hidden flex flex-col p-0">
        <DialogHeader className="px-6 pt-6 pb-0 shrink-0">
          <DialogTitle className="flex items-center gap-2">
            <Mail className="w-4 h-4 text-primary" />
            {view === "picking" ? "Select Contacts for Email Drafting" : view === "preview" ? "Prompt Preview" : "Next Steps"}
          </DialogTitle>
        </DialogHeader>

        {view === "picking" ? (
          <>
            <div className="px-6 pt-3 pb-2 space-y-2 shrink-0">
              <div className="flex items-center gap-2">
                <div className="relative flex-1">
                  <Search className="absolute left-2.5 top-2.5 w-3.5 h-3.5 text-muted-foreground" />
                  <Input
                    placeholder="Search contacts, accounts, or industries..."
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    className="pl-8 h-9 text-sm"
                  />
                </div>
                <Button
                  variant={showFilters || hasFilters ? "default" : "outline"}
                  size="sm"
                  onClick={() => setShowFilters(v => !v)}
                  className="gap-1.5 h-9 shrink-0"
                >
                  <Filter className="w-3.5 h-3.5" />
                  {hasFilters ? `Filters (${[fIndustry, fStatus, fTier, fPriority, fCompetitor].filter(f => f.length > 0).length})` : "Filter"}
                </Button>
              </div>

              {/* Filter row */}
              {showFilters && (
                <div className="flex items-center gap-2 flex-wrap animate-fade-in-up">
                  <MultiSelect options={INDUSTRIES} selected={fIndustry} onChange={setFIndustry} placeholder="Industry" />
                  <MultiSelect options={[...STATUSES]} selected={fStatus} onChange={setFStatus} placeholder="Status" />
                  <MultiSelect options={TIERS.filter(Boolean)} selected={fTier} onChange={setFTier} placeholder="Tier" />
                  <MultiSelect options={["Hot", "Warm", "Cold", "Dead"]} selected={fPriority} onChange={setFPriority} placeholder="Priority" />
                  <MultiSelect options={COMPETITORS.filter(Boolean)} selected={fCompetitor} onChange={setFCompetitor} placeholder="Competitor" />
                  {hasFilters && (
                    <button onClick={clearFilters} className="text-xs text-muted-foreground hover:text-foreground transition-colors">
                      Clear
                    </button>
                  )}
                </div>
              )}

              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>
                  <strong className="text-foreground">{selected.size}</strong> selected of {totalVisibleContacts} contacts
                  {hasFilters && ` (filtered)`}
                </span>
                <div className="flex gap-2">
                  <button onClick={selectAll} className="hover:text-foreground transition-colors">Select all</button>
                  <span>·</span>
                  <button onClick={clearAll} className="hover:text-foreground transition-colors">Clear</button>
                </div>
              </div>
            </div>

            <div className="flex-1 min-h-0 overflow-y-auto px-6 pb-2">
              <div className="space-y-1">
                {filteredAccounts.length === 0 && (
                  <p className="text-sm text-muted-foreground text-center py-8">
                    {search || hasFilters ? "No contacts match your search/filters" : "No accounts have contacts yet"}
                  </p>
                )}
                {filteredAccounts.map(p => {
                  const visibleContacts = getVisibleContacts(p);
                  const accountSelected = visibleContacts.every(c => selected.has(c.id));
                  const accountPartial = !accountSelected && visibleContacts.some(c => selected.has(c.id));
                  const open = isExpanded(p.id);

                  return (
                    <div key={p.id} className="border border-border rounded-lg overflow-hidden">
                      <button
                        onClick={() => toggleExpanded(p.id)}
                        className="w-full flex items-center gap-2 px-3 py-2 hover:bg-muted/50 transition-colors text-left"
                      >
                        {open ? <ChevronDown className="w-3.5 h-3.5 text-muted-foreground shrink-0" /> : <ChevronRight className="w-3.5 h-3.5 text-muted-foreground shrink-0" />}
                        <Checkbox
                          checked={accountSelected ? true : accountPartial ? "indeterminate" : false}
                          onCheckedChange={() => toggleAccount(p)}
                          onClick={e => e.stopPropagation()}
                          className="shrink-0"
                        />
                        <img
                          src={getLogoUrl(p.website, 24)}
                          alt=""
                          className="w-4 h-4 rounded shrink-0"
                          onError={e => { (e.target as HTMLImageElement).style.display = "none"; }}
                        />
                        <span className="font-medium text-sm truncate">{p.name}</span>
                        <span className="text-[10px] text-muted-foreground ml-auto shrink-0">
                          {p.status !== "Prospect" && <span className={p.status === "Churned" ? "text-destructive" : p.status === "Customer" ? "text-emerald-600" : "text-amber-600"}>{p.status} · </span>}
                          {p.industry}{visibleContacts.length > 0 && ` · ${visibleContacts.length}`}
                        </span>
                      </button>

                      {open && (
                        <div className="border-t border-border">
                          {visibleContacts.map(c => (
                            <label
                              key={c.id}
                              className="flex items-center gap-2.5 px-3 py-1.5 pl-10 hover:bg-muted/30 cursor-pointer transition-colors"
                            >
                              <Checkbox
                                checked={selected.has(c.id)}
                                onCheckedChange={() => toggleContact(c.id)}
                                className="shrink-0"
                              />
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-1.5">
                                  <span className="text-sm font-medium truncate">{c.name}</span>
                                  <RoleBadge role={c.role} />
                                  {c.starred && <Star className="w-3 h-3 fill-amber-400 text-amber-400 shrink-0" title="Starred" />}
                                </div>
                                <div className="flex items-center gap-2 mt-0.5">
                                  {c.title && <span className="text-[11px] text-muted-foreground truncate">{c.title}</span>}
                                  {c.email && <span className="text-[11px] text-muted-foreground/60 truncate">{c.email}</span>}
                                </div>
                              </div>
                              <StrengthDot strength={c.relationshipStrength} />
                            </label>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="px-6 py-3 border-t border-border flex items-center justify-between shrink-0">
              <span className="text-xs text-muted-foreground">
                {selected.size > 0 && `${selected.size} contact${selected.size !== 1 ? "s" : ""} across ${new Set(
                  prospects.flatMap(p => p.contacts.filter(c => selected.has(c.id)).map(() => p.id))
                ).size} account${new Set(prospects.flatMap(p => p.contacts.filter(c => selected.has(c.id)).map(() => p.id))).size !== 1 ? "s" : ""}`}
              </span>
              <Button onClick={handleGenerate} disabled={selected.size === 0} className="gap-1.5">
                <Mail className="w-3.5 h-3.5" />
                Generate Prompt ({selected.size})
              </Button>
            </div>
          </>
        ) : view === "preview" ? (
          <>
            <div className="px-6 pt-3 pb-2 flex items-center justify-between shrink-0">
              <button
                onClick={() => setView("picking")}
                className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 transition-colors"
              >
                <ArrowLeft className="w-3 h-3" /> Back to selection
              </button>
              <span className="text-[10px] text-muted-foreground">
                {wordCount.toLocaleString()} words · {charCount.toLocaleString()} chars
              </span>
            </div>

            <div className="flex-1 min-h-0 overflow-y-auto px-6 pb-4">
              <pre className="text-xs text-foreground whitespace-pre-wrap font-mono leading-relaxed bg-muted/30 rounded-lg p-4 border border-border">
                {promptText}
              </pre>
            </div>

            <div className="px-6 py-3 border-t border-border flex items-center justify-between shrink-0">
              <span className="text-xs text-muted-foreground">
                {selected.size} contact{selected.size !== 1 ? "s" : ""} included
              </span>
              <Button onClick={handleCopy} className="gap-1.5">
                {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                {copied ? "Copied!" : "Copy to Clipboard"}
              </Button>
            </div>
          </>
        ) : (
          /* Guidance view — shown after copying prompt */
          <div className="flex-1 flex flex-col items-center justify-center px-6 py-12 text-center space-y-6">
            <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center">
              <Sparkles className="w-7 h-7 text-primary" />
            </div>
            <div className="space-y-2 max-w-sm">
              <h3 className="text-lg font-semibold">Prompt copied!</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Paste it into Claude, ChatGPT, or your AI tool of choice to generate personalized emails for your {selected.size} contact{selected.size !== 1 ? "s" : ""}.
              </p>
              <p className="text-xs text-muted-foreground/70">
                When you're done sending, come back to mark who you actually emailed.
              </p>
            </div>
            <div className="flex flex-col gap-2 w-full max-w-xs">
              <Button onClick={handleGuidanceNext} className="gap-2 w-full">
                Review Contacts <ArrowRight className="w-4 h-4" />
              </Button>
              <Button variant="ghost" size="sm" onClick={handleClose} className="text-muted-foreground">
                I'll do this later
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

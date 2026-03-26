import { useState, useMemo, useCallback } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Mail, Copy, ChevronDown, ChevronRight, Search, ArrowLeft, Check } from "lucide-react";
import { toast } from "sonner";
import type { Prospect, Contact } from "@/data/prospects";
import { getLogoUrl } from "@/data/prospects";
import { RoleBadge, StrengthDot } from "@/components/ContactBadges";
import { buildContactPrompt, type ContactSelection } from "@/lib/buildContactPrompt";
import type { Signal } from "@/hooks/useSignals";

interface ContactPickerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  prospects: Prospect[];
  signals: Signal[];
}

type ViewState = "picking" | "preview";

export function ContactPickerDialog({ open, onOpenChange, prospects, signals }: ContactPickerDialogProps) {
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [search, setSearch] = useState("");
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [view, setView] = useState<ViewState>("picking");
  const [promptText, setPromptText] = useState("");
  const [copied, setCopied] = useState(false);

  const accountsWithContacts = useMemo(
    () => prospects.filter(p => p.contacts.length > 0),
    [prospects],
  );

  const filteredAccounts = useMemo(() => {
    if (!search.trim()) return accountsWithContacts;
    const q = search.toLowerCase();
    return accountsWithContacts.filter(p => {
      if (p.name.toLowerCase().includes(q)) return true;
      if (p.industry?.toLowerCase().includes(q)) return true;
      return p.contacts.some(
        c =>
          c.name.toLowerCase().includes(q) ||
          c.title?.toLowerCase().includes(q) ||
          c.email?.toLowerCase().includes(q),
      );
    });
  }, [accountsWithContacts, search]);

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

  const handleGenerate = () => {
    const selections: ContactSelection[] = [];
    for (const p of prospects) {
      const prospectSignals = signalsByProspect.get(p.id) || [];
      for (const c of p.contacts) {
        if (selected.has(c.id)) {
          selections.push({ contact: c, prospect: p, signals: prospectSignals });
        }
      }
    }
    const prompt = buildContactPrompt(selections);
    setPromptText(prompt);
    setView("preview");
    setCopied(false);
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(promptText);
    setCopied(true);
    toast.success(`Prompt copied — ${selected.size} contact${selected.size !== 1 ? "s" : ""} ready for Claude`);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleClose = () => {
    setView("picking");
    setSearch("");
    setSelected(new Set());
    setExpanded(new Set());
    setPromptText("");
    setCopied(false);
    onOpenChange(false);
  };

  const isExpanded = (id: string) => {
    if (search.trim()) return true;
    return expanded.has(id);
  };

  const wordCount = promptText.split(/\s+/).filter(Boolean).length;
  const charCount = promptText.length;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[700px] h-[85vh] max-h-[85vh] min-h-0 overflow-hidden flex flex-col p-0">
        <DialogHeader className="px-6 pt-6 pb-0 shrink-0">
          <DialogTitle className="flex items-center gap-2">
            <Mail className="w-4 h-4 text-primary" />
            {view === "picking" ? "Select Contacts for Email Drafting" : "Prompt Preview"}
          </DialogTitle>
        </DialogHeader>

        {view === "picking" ? (
          <>
            <div className="px-6 pt-3 pb-2 space-y-2 shrink-0">
              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 w-3.5 h-3.5 text-muted-foreground" />
                <Input
                  placeholder="Search contacts, accounts, or industries..."
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  className="pl-8 h-9 text-sm"
                />
              </div>
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>
                  <strong className="text-foreground">{selected.size}</strong> selected of {totalVisibleContacts} contacts
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
                    {search ? "No contacts match your search" : "No accounts have contacts yet"}
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
        ) : (
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
        )}
      </DialogContent>
    </Dialog>
  );
}

import { useState, useMemo, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { format } from "date-fns";
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription,
} from "@/components/ui/sheet";
import { Drawer, DrawerContent } from "@/components/ui/drawer";
import { useIsMobile } from "@/hooks/use-mobile";
import {
  INDUSTRIES, STAGES, PRIORITIES, TIERS, COMPETITORS, INTERACTION_TYPES,
  scoreProspect, scoreBreakdown, getScoreLabel, getLogoUrl,
  type Prospect, type Contact, type InteractionLog, type NoteEntry, type Task,
} from "@/data/prospects";
import { cn, normalizeUrl } from "@/lib/utils";
import {
  ExternalLink, Plus, X, Mail, Phone, Building2, MessageSquare, PhoneCall,
  Linkedin, Clock, CalendarIcon, Target, ArrowRight, Check, CheckCircle,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface ProspectSheetProps {
  prospectId: any;
  onClose: () => void;
  data: Prospect[];
  update: (id: any, u: Partial<Prospect>) => void;
  remove: (id: any) => void;
}

const STAGE_EMOJI: Record<string, string> = {
  "Not Started": "⬜", "Actively Prospecting": "🔍", "Meeting Booked": "📅",
  "Closed Lost": "❌", "Closed Won": "🏆",
};

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

function InteractionIcon({ type }: { type: string }) {
  if (type === "Email") return <MessageSquare className="w-3.5 h-3.5" />;
  if (type === "Call") return <PhoneCall className="w-3.5 h-3.5" />;
  if (type === "Task Completed") return <CheckCircle className="w-3.5 h-3.5" />;
  return <Linkedin className="w-3.5 h-3.5" />;
}

function SheetLogoImg({ website, size = 32, customLogo }: { website?: string; size?: number; customLogo?: string }) {
  const [err, setErr] = useState(false);
  const url = getLogoUrl(website, size >= 32 ? 64 : 32);
  if (customLogo) return <img src={customLogo} alt="" className="rounded-lg bg-muted object-contain" style={{ width: size, height: size }} />;
  if (!website || err || !url) return <div className="rounded-lg bg-muted flex items-center justify-center" style={{ width: size, height: size }}><Building2 className="text-muted-foreground" style={{ width: size * 0.5, height: size * 0.5 }} /></div>;
  return <img src={url} alt="" className="rounded-lg bg-muted object-contain" style={{ width: size, height: size }} onError={() => setErr(true)} />;
}

export function ProspectSheet({ prospectId, onClose, data, update, remove }: ProspectSheetProps) {
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const prospect = useMemo(() => data.find(p => p.id === prospectId), [data, prospectId]);

  const [newContact, setNewContact] = useState<Partial<Contact>>({});
  const [showAddContact, setShowAddContact] = useState(false);
  const [editingContactId, setEditingContactId] = useState<string | null>(null);
  const [editContact, setEditContact] = useState<Partial<Contact>>({});
  const [interactionType, setInteractionType] = useState(INTERACTION_TYPES[0]);
  const [interactionNotes, setInteractionNotes] = useState("");
  const [newNote, setNewNote] = useState("");

  // Local state for debounced text inputs
  const [localLocCount, setLocalLocCount] = useState("");
  const [localCustomCompetitor, setLocalCustomCompetitor] = useState("");
  const [localName, setLocalName] = useState("");
  // Task manager state
  const [newTaskText, setNewTaskText] = useState("");
  const [newTaskDate, setNewTaskDate] = useState("");

  // Sync local state when prospect changes
  useEffect(() => {
    if (prospect) {
      setLocalLocCount(prospect.locationCount != null ? String(prospect.locationCount) : "");
      setLocalName(prospect.name || "");
      if (prospect.competitor && !COMPETITORS.includes(prospect.competitor) && prospect.competitor.startsWith("Other: ")) {
        setLocalCustomCompetitor(prospect.competitor.replace("Other: ", ""));
      } else {
        setLocalCustomCompetitor("");
      }
    }
  }, [prospect?.id, prospect?.locationCount, prospect?.competitor, prospect?.name]);

  if (!prospect) return null;

  const score = scoreProspect(prospect);
  const scoreInfo = getScoreLabel(score);

  const handleUpdate = (field: string, value: any) => {
    update(prospect.id, { [field]: value });
    toast.success("✅ Updated!");
  };

  // Commit debounced fields on blur
  const commitLocCount = () => {
    const val = localLocCount ? parseInt(localLocCount) : null;
    if (val !== prospect.locationCount) {
      update(prospect.id, { locationCount: val });
      toast.success("✅ Updated!");
    }
  };

  const commitCustomCompetitor = () => {
    const val = localCustomCompetitor.trim() ? `Other: ${localCustomCompetitor.trim()}` : "Other";
    if (val !== prospect.competitor) {
      update(prospect.id, { competitor: val });
      toast.success("✅ Updated!");
    }
  };

  const addTask = () => {
    if (!newTaskText.trim()) return;
    const task: Task = { id: Date.now().toString(), text: newTaskText.trim(), dueDate: newTaskDate };
    update(prospect.id, { tasks: [...(prospect.tasks || []), task] });
    setNewTaskText("");
    setNewTaskDate("");
    toast.success("✅ Task added!");
  };

  const completeTask = (task: Task) => {
    const interaction: InteractionLog = {
      id: Date.now().toString(), type: "Task Completed",
      date: new Date().toISOString().split("T")[0], notes: task.text,
    };
    update(prospect.id, {
      tasks: (prospect.tasks || []).filter(t => t.id !== task.id),
      interactions: [...(prospect.interactions || []), interaction],
    });
    toast.success("✅ Task completed!");
  };

  const removeTask = (taskId: string) => {
    update(prospect.id, { tasks: (prospect.tasks || []).filter(t => t.id !== taskId) });
    toast("🗑️ Task removed");
  };

  // Determine displayed competitor value for select
  const competitorSelectValue = prospect.competitor && !COMPETITORS.includes(prospect.competitor) && prospect.competitor.startsWith("Other: ")
    ? "Other" : prospect.competitor;
  const showCustomCompetitorInput = competitorSelectValue === "Other" || (prospect.competitor && prospect.competitor.startsWith("Other: "));

  const addContact = () => {
    if (!newContact.name) return;
    const contact: Contact = {
      id: Date.now().toString(), name: newContact.name || "", email: newContact.email || "",
      phone: newContact.phone || "", title: newContact.title || "", notes: newContact.notes || "",
    };
    update(prospect.id, { contacts: [...(prospect.contacts || []), contact] });
    setNewContact({}); setShowAddContact(false);
    toast.success("👤 Contact added!");
  };

  const removeContact = (contactId: string) => {
    update(prospect.id, { contacts: (prospect.contacts || []).filter(c => c.id !== contactId) });
    toast("👤 Contact removed");
  };

  const startEditContact = (c: Contact) => {
    setEditingContactId(c.id);
    setEditContact({ name: c.name, title: c.title, email: c.email, phone: c.phone, notes: c.notes });
  };

  const saveEditContact = () => {
    if (!editingContactId || !editContact.name) return;
    const updated = (prospect.contacts || []).map(c =>
      c.id === editingContactId ? { ...c, ...editContact } : c
    );
    update(prospect.id, { contacts: updated });
    setEditingContactId(null);
    setEditContact({});
    toast.success("✅ Contact updated!");
  };

  const logInteraction = () => {
    const interaction: InteractionLog = {
      id: Date.now().toString(), type: interactionType,
      date: new Date().toISOString().split("T")[0], notes: interactionNotes || `${interactionType} logged`,
    };
    update(prospect.id, { interactions: [...(prospect.interactions || []), interaction] });
    setInteractionNotes("");
    toast.success("📝 Activity logged!");
  };

  const addNote = () => {
    if (!newNote.trim()) return;
    const entry: NoteEntry = { id: Date.now().toString(), text: newNote.trim(), timestamp: new Date().toISOString() };
    update(prospect.id, { noteLog: [...(prospect.noteLog || []), entry] });
    setNewNote("");
    toast.success("📌 Note saved!");
  };

  const inputClass = "w-full px-3 py-2 text-sm rounded-lg border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/50 placeholder:text-muted-foreground transition-all";
  const selectClass = "w-full px-3 py-2 text-sm rounded-lg border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/50 appearance-none cursor-pointer transition-all";

  const isOpen = prospectId !== null;
  const handleOpenChange = (open: boolean) => !open && onClose();

  const sheetContent = (
    <div className="w-full h-full overflow-y-auto">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-card border-b border-border px-6 py-4">
          <div className="flex items-center gap-3">
            <SheetLogoImg website={prospect.website} size={36} customLogo={prospect.customLogo} />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <input
                  value={localName}
                  onChange={e => setLocalName(e.target.value)}
                  onBlur={() => {
                    const trimmed = localName.trim();
                    if (trimmed && trimmed !== prospect.name) {
                      update(prospect.id, { name: trimmed });
                      toast.success("✅ Updated!");
                    } else if (!trimmed) {
                      setLocalName(prospect.name);
                    }
                  }}
                  onKeyDown={e => { if (e.key === "Enter") (e.target as HTMLInputElement).blur(); }}
                  className="text-base font-extrabold truncate bg-transparent border-b border-transparent hover:border-border focus:border-primary focus:outline-none transition-colors max-w-[200px]"
                />
                <span className={cn("px-2 py-0.5 text-[10px] font-bold rounded-md uppercase",
                  prospect.status === "Churned" ? "bg-destructive/15 text-destructive" : "bg-[hsl(var(--success))]/15 text-[hsl(var(--success))]"
                )}>{prospect.status === "Churned" ? "💀 Churned" : "🎯 Prospect"}</span>
                {prospect.tier && <span className={cn("px-2 py-0.5 text-[10px] font-bold rounded-md",
                  prospect.tier === "Tier 1" ? "bg-primary/15 text-primary" : "bg-muted text-muted-foreground"
                )}>{prospect.tier === "Tier 1" ? "⭐" : prospect.tier === "Tier 2" ? "🥈" : "🥉"} {prospect.tier}</span>}
              </div>
              <SheetDescription className="text-xs mt-0.5">
                {prospect.website && <a href={normalizeUrl(prospect.website)} target="_blank" rel="noreferrer" className="text-primary hover:underline inline-flex items-center gap-1">{prospect.website} <ExternalLink className="w-3 h-3" /></a>}
              </SheetDescription>
            </div>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="text-center px-3 cursor-help">
                    <div className="text-xl font-black animate-count-up" style={{ color: scoreInfo.color }}>{score}</div>
                    <div className="text-[10px] font-bold" style={{ color: scoreInfo.color }}>{scoreInfo.label}</div>
                  </div>
                </TooltipTrigger>
                <TooltipContent side="bottom" align="end" collisionPadding={16} className="text-xs max-w-[220px] p-3 z-[100]">
                  <p className="font-bold mb-1.5" style={{ color: scoreInfo.color }}>{scoreInfo.label} — {score} pts</p>
                  {(() => { const bd = scoreBreakdown(prospect); return bd.length > 0 ? (
                    <div className="space-y-0.5 border-t border-border pt-1.5 mb-1.5">
                      {bd.map((b, i) => (
                        <div key={i} className="flex justify-between gap-3">
                          <span className="text-muted-foreground">{b.label}</span>
                          <span className={cn("font-bold", b.value >= 0 ? "text-[hsl(var(--success))]" : "text-destructive")}>{b.value > 0 ? "+" : ""}{b.value}</span>
                        </div>
                      ))}
                    </div>
                  ) : <p className="text-muted-foreground mb-1.5">No scoring factors detected.</p>; })()}
                  <p className="text-[10px] text-muted-foreground border-t border-border pt-1.5">Higher scores are prioritized in Action Items & Insights.</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
          <button onClick={() => { onClose(); navigate(`/prospect/${prospect.id}`); }}
            className="text-[10px] text-primary hover:underline mt-2 inline-flex items-center gap-1">
            Open full page <ArrowRight className="w-3 h-3" />
          </button>
        </div>

        {/* Content */}
        <div className="px-6 py-5 space-y-5">
          {/* Account Details */}
          <div className="space-y-3 animate-fade-in-up">
            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Account Details</h3>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-[10px] font-semibold text-muted-foreground uppercase">Locations</label>
                <input type="number" value={localLocCount} onChange={e => setLocalLocCount(e.target.value)} onBlur={commitLocCount} className={inputClass} placeholder="# of locations" />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-semibold text-muted-foreground uppercase">Industry</label>
                <select value={prospect.industry} onChange={e => handleUpdate("industry", e.target.value)} className={selectClass}>
                  <option value="">Select</option>
                  {INDUSTRIES.map(i => <option key={i} value={i}>{i}</option>)}
                </select>
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-semibold text-muted-foreground uppercase">Outreach</label>
                <select value={prospect.outreach} onChange={e => handleUpdate("outreach", e.target.value)} className={selectClass}>
                  {STAGES.map(s => <option key={s} value={s}>{STAGE_EMOJI[s] || ""} {s}</option>)}
                </select>
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-semibold text-muted-foreground uppercase">Priority</label>
                <select value={prospect.priority} onChange={e => handleUpdate("priority", e.target.value)} className={selectClass}>
                  <option value="">None</option>
                  <option value="Hot">🔥 Hot</option>
                  <option value="Warm">☀️ Warm</option>
                  <option value="Cold">🧊 Cold</option>
                  <option value="Dead">💀 Dead</option>
                </select>
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-semibold text-muted-foreground uppercase">Tier</label>
                <select value={prospect.tier} onChange={e => handleUpdate("tier", e.target.value)} className={selectClass}>
                  <option value="">None</option>
                  <option value="Tier 1">⭐ Tier 1</option>
                  <option value="Tier 2">🥈 Tier 2</option>
                  <option value="Tier 3">🥉 Tier 3</option>
                  <option value="Tier 4">Tier 4</option>
                </select>
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-semibold text-muted-foreground uppercase">Competitor</label>
                <select value={competitorSelectValue} onChange={e => {
                  const val = e.target.value;
                  if (val === "Other") {
                    handleUpdate("competitor", "Other");
                    setLocalCustomCompetitor("");
                  } else {
                    handleUpdate("competitor", val);
                    setLocalCustomCompetitor("");
                  }
                }} className={selectClass}>
                  {COMPETITORS.map(c => <option key={c} value={c}>{c || "None"}</option>)}
                </select>
                {showCustomCompetitorInput && (
                  <input value={localCustomCompetitor} onChange={e => setLocalCustomCompetitor(e.target.value)} onBlur={commitCustomCompetitor} placeholder="Type competitor name..." className={cn(inputClass, "mt-1 text-xs")} />
                )}
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-semibold text-muted-foreground uppercase">Status</label>
                <select value={prospect.status} onChange={e => handleUpdate("status", e.target.value)} className={selectClass}>
                  <option value="Prospect">🎯 Prospect</option>
                  <option value="Churned">💀 Churned</option>
                </select>
              </div>
            </div>
          </div>

          {/* Tasks */}
          <div className="space-y-3 animate-fade-in-up" style={{ animationDelay: "50ms" }}>
            <div className="flex items-center gap-2">
              <Target className="w-4 h-4 text-primary" />
              <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Tasks</h3>
            </div>
            {/* Add task form */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-[10px] font-semibold text-muted-foreground uppercase">Action</label>
                <input value={newTaskText} onChange={e => setNewTaskText(e.target.value)} placeholder="e.g. Send follow-up" className={inputClass}
                  onKeyDown={e => e.key === "Enter" && addTask()} />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-semibold text-muted-foreground uppercase">Due Date</label>
                <Popover>
                  <PopoverTrigger asChild>
                    <button className={cn(inputClass, "flex items-center gap-2 text-left", !newTaskDate && "text-muted-foreground")}>
                      <CalendarIcon className="w-4 h-4 shrink-0" />
                      {newTaskDate ? format(new Date(newTaskDate), "PPP") : "Pick a date"}
                    </button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0 z-[60]" align="start">
                    <Calendar mode="single" selected={newTaskDate ? new Date(newTaskDate) : undefined}
                      onSelect={date => setNewTaskDate(date ? date.toISOString().split("T")[0] : "")} initialFocus className="p-3 pointer-events-auto" />
                  </PopoverContent>
                </Popover>
              </div>
            </div>
            {newTaskText.trim() && (
              <button onClick={addTask}
                className="px-3 py-1.5 text-xs rounded-md bg-primary text-primary-foreground hover:bg-primary/90 inline-flex items-center gap-1 font-medium">
                <Plus className="w-3 h-3" /> Add Task
              </button>
            )}
            {/* Open tasks list */}
            {(prospect.tasks || []).length > 0 && (
              <div className="space-y-1.5 pt-2 border-t border-border">
                <label className="text-[10px] font-semibold text-muted-foreground uppercase">Open Tasks</label>
                {(prospect.tasks || [])
                  .slice()
                  .sort((a, b) => (a.dueDate || "9999").localeCompare(b.dueDate || "9999"))
                  .map(task => {
                    const isOverdue = task.dueDate && new Date(task.dueDate) < new Date();
                    return (
                      <div key={task.id} className="flex items-center gap-2 p-2 rounded-lg hover:bg-primary/5 group">
                        <button onClick={() => completeTask(task)} className="shrink-0 w-4 h-4 rounded border border-primary/40 hover:bg-primary/20 flex items-center justify-center transition-colors" title="Mark complete">
                          <Check className="w-2.5 h-2.5 text-primary opacity-0 group-hover:opacity-100 transition-opacity" />
                        </button>
                        <div className="flex-1 min-w-0">
                          <span className="text-xs text-foreground">{task.text}</span>
                        </div>
                        {task.dueDate && (
                          <span className={cn("text-[10px] shrink-0", isOverdue ? "text-destructive font-semibold" : "text-muted-foreground")}>
                            {isOverdue ? "⚠️ " : ""}{task.dueDate}
                          </span>
                        )}
                        <button onClick={() => removeTask(task.id)} className="opacity-0 group-hover:opacity-100 transition-opacity p-0.5 rounded hover:bg-destructive/10">
                          <X className="w-3 h-3 text-destructive" />
                        </button>
                      </div>
                    );
                  })}
              </div>
            )}
          </div>
          <div className="space-y-3 animate-fade-in-up" style={{ animationDelay: "100ms" }}>
            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Notes</h3>
            <div className="flex gap-2">
              <input value={newNote} onChange={e => setNewNote(e.target.value)} placeholder="Add a note..." className={cn(inputClass, "flex-1")} onKeyDown={e => e.key === "Enter" && addNote()} />
              <Button size="sm" onClick={addNote} disabled={!newNote.trim()}>Add</Button>
            </div>
            {(prospect.noteLog || []).length > 0 && (
              <div className="space-y-2 max-h-40 overflow-y-auto">
                {[...(prospect.noteLog || [])].reverse().map(note => (
                  <div key={note.id} className="p-2.5 rounded-lg bg-muted/50 border border-border">
                    <p className="text-xs text-foreground">{note.text}</p>
                    <span className="text-[10px] text-muted-foreground flex items-center gap-1 mt-1"><Clock className="w-2.5 h-2.5" />{relativeTime(note.timestamp)}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Contacts */}
          <div className="space-y-3 animate-fade-in-up" style={{ animationDelay: "150ms" }}>
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Contacts</h3>
              <button onClick={() => setShowAddContact(!showAddContact)} className="p-1 rounded-md hover:bg-primary/10"><Plus className="w-3.5 h-3.5 text-primary" /></button>
            </div>
            {showAddContact && (
              <div className="space-y-2 p-3 border border-border rounded-lg bg-muted/30 animate-fade-in-up">
                <input value={newContact.name || ""} onChange={e => setNewContact({...newContact, name: e.target.value})} placeholder="Name *" className={cn(inputClass, "text-xs py-1.5")} />
                <input value={newContact.title || ""} onChange={e => setNewContact({...newContact, title: e.target.value})} placeholder="Title" className={cn(inputClass, "text-xs py-1.5")} />
                <input value={newContact.email || ""} onChange={e => setNewContact({...newContact, email: e.target.value})} placeholder="Email" className={cn(inputClass, "text-xs py-1.5")} />
                <input value={newContact.phone || ""} onChange={e => setNewContact({...newContact, phone: e.target.value})} placeholder="Phone" className={cn(inputClass, "text-xs py-1.5")} />
                <textarea value={newContact.notes || ""} onChange={e => setNewContact({...newContact, notes: e.target.value})} placeholder="Notes (e.g. CMO previously at a Yext customer)" className={cn(inputClass, "text-xs py-1.5 resize-none")} rows={2} />
                <div className="flex gap-2">
                  <button onClick={addContact} className="px-3 py-1.5 bg-primary text-primary-foreground text-xs rounded-md hover:bg-primary/90">Add</button>
                  <button onClick={() => { setShowAddContact(false); setNewContact({}); }} className="px-3 py-1.5 bg-muted text-muted-foreground text-xs rounded-md">Cancel</button>
                </div>
              </div>
            )}
            {(prospect.contacts || []).map(c => (
              <div key={c.id} className="p-2.5 border border-border rounded-lg group relative hover:border-primary/20 transition-colors">
                <button onClick={() => removeContact(c.id)} className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity p-0.5 rounded hover:bg-destructive/10">
                  <X className="w-3 h-3 text-destructive" />
                </button>
                {editingContactId === c.id ? (
                  <div className="space-y-1.5">
                    <input value={editContact.name || ""} onChange={e => setEditContact({...editContact, name: e.target.value})} placeholder="Name *" className={cn(inputClass, "text-xs py-1.5")} />
                    <input value={editContact.title || ""} onChange={e => setEditContact({...editContact, title: e.target.value})} placeholder="Title" className={cn(inputClass, "text-xs py-1.5")} />
                    <input value={editContact.email || ""} onChange={e => setEditContact({...editContact, email: e.target.value})} placeholder="Email" className={cn(inputClass, "text-xs py-1.5")} />
                    <input value={editContact.phone || ""} onChange={e => setEditContact({...editContact, phone: e.target.value})} placeholder="Phone" className={cn(inputClass, "text-xs py-1.5")} />
                    <textarea value={editContact.notes || ""} onChange={e => setEditContact({...editContact, notes: e.target.value})} placeholder="Notes" className={cn(inputClass, "text-xs py-1.5 resize-none")} rows={2} />
                    <div className="flex gap-2">
                      <button onClick={saveEditContact} className="px-3 py-1.5 bg-primary text-primary-foreground text-xs rounded-md hover:bg-primary/90">Save</button>
                      <button onClick={() => { setEditingContactId(null); setEditContact({}); }} className="px-3 py-1.5 bg-muted text-muted-foreground text-xs rounded-md">Cancel</button>
                    </div>
                  </div>
                ) : (
                  <div onClick={() => startEditContact(c)} className="cursor-pointer">
                    <div className="font-medium text-xs text-foreground">{c.name}</div>
                    {c.title && <div className="text-[10px] text-muted-foreground">{c.title}</div>}
                    {c.email && <a href={`mailto:${c.email}`} onClick={e => e.stopPropagation()} className="text-[10px] text-primary hover:underline flex items-center gap-1 mt-1"><Mail className="w-2.5 h-2.5" /> {c.email}</a>}
                    {c.phone && <div className="text-[10px] text-muted-foreground flex items-center gap-1 mt-0.5"><Phone className="w-2.5 h-2.5" /> {c.phone}</div>}
                    {c.notes && <div className="text-[10px] text-muted-foreground mt-1.5 pt-1.5 border-t border-border italic">📝 {c.notes}</div>}
                  </div>
                )}
              </div>
            ))}
            {(prospect.contacts || []).length === 0 && !showAddContact && <p className="text-xs text-muted-foreground">No contacts yet.</p>}
          </div>

          {/* Activity Timeline */}
          <div className="space-y-3 animate-fade-in-up" style={{ animationDelay: "200ms" }}>
            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Activity Timeline</h3>
            <div className="flex gap-2">
              <select value={interactionType} onChange={e => setInteractionType(e.target.value)} className={cn(selectClass, "w-32 text-xs")}>
                {INTERACTION_TYPES.filter(t => t !== "Task Completed").map(t => <option key={t} value={t}>{t}</option>)}
              </select>
              <input value={interactionNotes} onChange={e => setInteractionNotes(e.target.value)} placeholder="What happened?" className={cn(inputClass, "flex-1 text-xs")} onKeyDown={e => e.key === "Enter" && logInteraction()} />
              <Button onClick={logInteraction} size="sm" className="text-xs">Log</Button>
            </div>
            {(prospect.interactions || []).length > 0 && (
              <div className="relative mt-2">
                <div className="absolute left-[13px] top-0 bottom-0 w-px bg-primary/20" />
                <div className="space-y-3">
                  {[...(prospect.interactions || [])].reverse().map((i, idx) => (
                    <div key={i.id} className="flex items-start gap-2.5 relative animate-slide-in-right" style={{ animationDelay: `${idx * 40}ms` }}>
                      <div className={cn("w-7 h-7 rounded-full flex items-center justify-center shrink-0 z-10",
                        i.type === "Email" ? "bg-primary/10 text-primary" :
                        i.type === "Call" ? "bg-[hsl(var(--success))]/10 text-[hsl(var(--success))]" :
                        i.type === "Task Completed" ? "bg-[hsl(var(--success))]/15 text-[hsl(var(--success))]" :
                        "bg-secondary text-secondary-foreground"
                      )}><InteractionIcon type={i.type} /></div>
                      <div>
                        <div className="flex items-center gap-2"><span className="text-xs font-semibold text-foreground">{i.type}</span><span className="text-[10px] text-muted-foreground">{relativeTime(i.date)}</span></div>
                        {i.notes && <p className="text-xs text-muted-foreground mt-0.5">{i.notes}</p>}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
            {(prospect.interactions || []).length === 0 && <p className="text-xs text-muted-foreground text-center py-3">No interactions logged yet.</p>}
          </div>

          {/* Location Notes */}
          {prospect.locationNotes && (
            <div className="space-y-2 animate-fade-in-up" style={{ animationDelay: "250ms" }}>
              <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Location Notes</h3>
              <p className="text-xs text-muted-foreground bg-muted/50 p-3 rounded-lg border border-border">{prospect.locationNotes}</p>
            </div>
          )}
        </div>
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
      <SheetContent side="right" className="w-full sm:w-3/4 sm:max-w-2xl overflow-y-auto p-0">
        {sheetContent}
      </SheetContent>
    </Sheet>
  );
}

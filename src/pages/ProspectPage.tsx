import { useState, useMemo, useRef, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useProspects } from "@/hooks/useProspects";
import { format } from "date-fns";
import {
  INDUSTRIES,
  STAGES,
  PRIORITIES,
  TIERS,
  COMPETITORS,
  INTERACTION_TYPES,
  scoreProspect,
  scoreBreakdown,
  getScoreLabel,
  getLogoUrl,
  type Contact,
  type InteractionLog,
  type NoteEntry,
} from "@/data/prospects";
import { cn } from "@/lib/utils";
import {
  ArrowLeft,
  ExternalLink,
  Trash2,
  Plus,
  X,
  Mail,
  Phone,
  Pencil,
  Check,
  CheckCircle,
  Building2,
  MessageSquare,
  PhoneCall,
  Linkedin,
  Clock,
  CalendarIcon,
  Target,
  Upload,
} from "lucide-react";
import { toast } from "sonner";
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
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

// --- Logo with upload ---
function LogoImg({
  website,
  size = 32,
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
        <img src={customLogo} alt="" className={cn("rounded-lg bg-muted object-contain w-full h-full", dragging && "ring-2 ring-primary")} />
        {onRemove && (
          <button
            onClick={(e) => { e.stopPropagation(); onRemove(); }}
            className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-destructive text-destructive-foreground flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
          >
            <X className="w-2.5 h-2.5" />
          </button>
        )}
        {dragging && (
          <div className="absolute inset-0 rounded-lg bg-primary/30 flex items-center justify-center">
            <Upload className="w-4 h-4 text-primary" />
          </div>
        )}
      </div>
    );
  }

  const showFallback = !website || err || !url;

  if (showFallback) {
    return (
      <div className="relative group shrink-0" style={{ width: size, height: size }} {...dragProps}>
        <div className={cn("rounded-lg bg-muted flex items-center justify-center w-full h-full", dragging && "ring-2 ring-primary")}>
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
              className="absolute inset-0 rounded-lg bg-primary/20 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
              title="Upload logo"
            >
              <Upload className="w-4 h-4 text-primary" />
            </button>
          </>
        )}
      </div>
    );
  }

  return (
    <div className="relative group shrink-0" style={{ width: size, height: size }} {...dragProps}>
      <img src={url} alt="" className={cn("rounded-lg bg-muted object-contain w-full h-full", dragging && "ring-2 ring-primary")} onError={() => setErr(true)} />
      {onUpload && !dragging && (
        <>
          <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleFile} />
          <button
            onClick={(e) => { e.stopPropagation(); fileRef.current?.click(); }}
            className="absolute inset-0 rounded-lg bg-primary/20 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
            title="Upload custom logo"
          >
            <Upload className="w-4 h-4 text-primary" />
          </button>
        </>
      )}
      {dragging && (
        <div className="absolute inset-0 rounded-lg bg-primary/30 flex items-center justify-center">
          <Upload className="w-4 h-4 text-primary" />
        </div>
      )}
    </div>
  );
}

function EditableContact({
  contact,
  onSave,
  onRemove,
}: {
  contact: Contact;
  onSave: (updated: Contact) => void;
  onRemove: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(contact);

  const inputClass =
    "w-full px-2.5 py-1.5 text-xs rounded-lg border border-border bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-primary/30 placeholder:text-muted-foreground";

  if (editing) {
    return (
      <div className="p-3 border border-primary/30 rounded-lg bg-primary/5 space-y-2 animate-fade-in-up">
        <input value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} placeholder="Name *" className={inputClass} />
        <input value={draft.title} onChange={(e) => setDraft({ ...draft, title: e.target.value })} placeholder="Title" className={inputClass} />
        <input value={draft.email} onChange={(e) => setDraft({ ...draft, email: e.target.value })} placeholder="Email" className={inputClass} />
        <input value={draft.phone} onChange={(e) => setDraft({ ...draft, phone: e.target.value })} placeholder="Phone" className={inputClass} />
        <input value={draft.notes} onChange={(e) => setDraft({ ...draft, notes: e.target.value })} placeholder="Notes" className={inputClass} />
        <div className="flex gap-2">
          <button
            onClick={() => { onSave(draft); setEditing(false); toast.success("✅ Contact updated!"); }}
            className="px-3 py-1.5 bg-primary text-primary-foreground text-xs rounded-md hover:bg-primary/90 flex items-center gap-1"
          >
            <Check className="w-3 h-3" /> Save
          </button>
          <button
            onClick={() => { setDraft(contact); setEditing(false); }}
            className="px-3 py-1.5 bg-muted text-muted-foreground text-xs rounded-md hover:bg-accent"
          >
            Cancel
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-3 border border-border rounded-lg group relative hover:border-primary/20 transition-colors">
      <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1">
        <button onClick={() => setEditing(true)} className="p-0.5 rounded hover:bg-accent">
          <Pencil className="w-3 h-3 text-muted-foreground" />
        </button>
        <button onClick={onRemove} className="p-0.5 rounded hover:bg-destructive/10">
          <X className="w-3 h-3 text-destructive" />
        </button>
      </div>
      <div className="font-medium text-xs text-foreground">{contact.name}</div>
      {contact.title && <div className="text-[10px] text-muted-foreground">{contact.title}</div>}
      {contact.email && (
        <a href={`mailto:${contact.email}`} className="text-[10px] text-primary hover:underline flex items-center gap-1 mt-1">
          <Mail className="w-2.5 h-2.5" /> {contact.email}
        </a>
      )}
      {contact.phone && (
        <div className="text-[10px] text-muted-foreground flex items-center gap-1 mt-0.5">
          <Phone className="w-2.5 h-2.5" /> {contact.phone}
        </div>
      )}
      {contact.notes && <div className="text-[10px] text-muted-foreground mt-1 italic">{contact.notes}</div>}
    </div>
  );
}

function relativeTime(dateStr: string): string {
  const now = new Date();
  const then = new Date(dateStr);
  const diffMs = now.getTime() - then.getTime();
  const diffDays = Math.floor(diffMs / 86400000);
  if (diffDays === 0) return "today";
  if (diffDays === 1) return "yesterday";
  if (diffDays < 7) return `${diffDays} days ago`;
  if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
  return `${Math.floor(diffDays / 30)} months ago`;
}

function InteractionIcon({ type }: { type: string }) {
  if (type === "Email") return <MessageSquare className="w-3.5 h-3.5" />;
  if (type === "Call") return <PhoneCall className="w-3.5 h-3.5" />;
  if (type === "Task Completed") return <CheckCircle className="w-3.5 h-3.5" />;
  return <Linkedin className="w-3.5 h-3.5" />;
}

export default function ProspectPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { data, ok, update, remove } = useProspects();

  const prospect = useMemo(
    () => data.find((p) => p.id === Number(id)),
    [data, id]
  );

  const [newContact, setNewContact] = useState<Partial<Contact>>({});
  const [showAddContact, setShowAddContact] = useState(false);
  const [interactionType, setInteractionType] = useState(INTERACTION_TYPES[0]);
  const [interactionNotes, setInteractionNotes] = useState("");
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [newNote, setNewNote] = useState("");
  const [localLocCount, setLocalLocCount] = useState("");
  const [localNextStep, setLocalNextStep] = useState("");
  const [localCustomCompetitor, setLocalCustomCompetitor] = useState("");

  useEffect(() => {
    if (prospect) {
      setLocalLocCount(prospect.locationCount != null ? String(prospect.locationCount) : "");
      setLocalNextStep(prospect.nextStep || "");
      if (prospect.competitor && !COMPETITORS.includes(prospect.competitor) && prospect.competitor.startsWith("Other: ")) {
        setLocalCustomCompetitor(prospect.competitor.replace("Other: ", ""));
      } else {
        setLocalCustomCompetitor("");
      }
    }
  }, [prospect?.id, prospect?.nextStep, prospect?.locationCount, prospect?.competitor]);

  if (!ok) return (
    <div className="bg-background min-h-screen yext-grid-bg">
      <header className="yext-gradient border-b border-primary/10 px-6 py-4 flex items-center gap-4">
        <div className="h-10 w-10 skeleton-shimmer rounded-lg" />
        <div className="space-y-2 flex-1">
          <div className="h-5 w-48 skeleton-shimmer rounded" />
          <div className="h-3 w-32 skeleton-shimmer rounded" />
        </div>
      </header>
      <div className="max-w-5xl mx-auto p-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            {[200, 160, 120].map((h, i) => (
              <div key={i} className="skeleton-shimmer rounded-xl" style={{ height: h }} />
            ))}
          </div>
          <div className="space-y-6">
            <div className="skeleton-shimmer rounded-xl h-48" />
            <div className="skeleton-shimmer rounded-xl h-32" />
          </div>
        </div>
      </div>
    </div>
  );
  if (!prospect) return <div className="flex items-center justify-center h-screen text-muted-foreground">Prospect not found</div>;

  const score = scoreProspect(prospect);
  const breakdown = scoreBreakdown(prospect);
  const scoreInfo = getScoreLabel(score);

  const handleUpdate = (field: string, value: any) => {
    update(prospect.id, { [field]: value });
    toast.success("✅ Updated!");
  };

  const commitLocCount = () => {
    const val = localLocCount ? parseInt(localLocCount) : null;
    if (val !== prospect.locationCount) {
      update(prospect.id, { locationCount: val });
      toast.success("✅ Updated!");
    }
  };

  const commitNextStep = () => {
    if (localNextStep !== (prospect.nextStep || "")) {
      update(prospect.id, { nextStep: localNextStep });
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

  const competitorSelectValue = prospect.competitor && !COMPETITORS.includes(prospect.competitor) && prospect.competitor.startsWith("Other: ")
    ? "Other" : prospect.competitor;
  const showCustomCompetitorInput = competitorSelectValue === "Other" || (prospect.competitor && prospect.competitor.startsWith("Other: "));

  const addContact = () => {
    if (!newContact.name) return;
    const contact: Contact = {
      id: Date.now().toString(),
      name: newContact.name || "",
      email: newContact.email || "",
      phone: newContact.phone || "",
      title: newContact.title || "",
      notes: newContact.notes || "",
    };
    update(prospect.id, { contacts: [...(prospect.contacts || []), contact] });
    setNewContact({});
    setShowAddContact(false);
    toast.success("👤 Contact added!");
  };

  const updateContact = (updated: Contact) => {
    update(prospect.id, {
      contacts: (prospect.contacts || []).map((c) => (c.id === updated.id ? updated : c)),
    });
  };

  const removeContact = (contactId: string) => {
    update(prospect.id, { contacts: (prospect.contacts || []).filter((c) => c.id !== contactId) });
    toast("👤 Contact removed");
  };

  const logInteraction = () => {
    const interaction: InteractionLog = {
      id: Date.now().toString(),
      type: interactionType,
      date: new Date().toISOString().split("T")[0],
      notes: interactionNotes || `${interactionType} logged`,
    };
    update(prospect.id, { interactions: [...(prospect.interactions || []), interaction] });
    setInteractionNotes("");
    toast.success("📝 Activity logged!");
  };

  const markNextStepComplete = () => {
    const taskText = prospect.nextStep || "Task";
    const interaction: InteractionLog = {
      id: Date.now().toString(), type: "Task Completed",
      date: new Date().toISOString().split("T")[0], notes: taskText,
    };
    update(prospect.id, {
      interactions: [...(prospect.interactions || []), interaction],
      nextStep: "",
      nextStepDate: "",
    });
    setLocalNextStep("");
    toast.success("✅ Next step completed!");
  };

  const handleDelete = () => {
    remove(prospect.id);
    toast("🗑️ Prospect removed", { description: `"${prospect.name}" has been deleted` });
    navigate("/");
  };

  const addNote = () => {
    if (!newNote.trim()) return;
    const entry: NoteEntry = {
      id: Date.now().toString(),
      text: newNote.trim(),
      timestamp: new Date().toISOString(),
    };
    update(prospect.id, { noteLog: [...(prospect.noteLog || []), entry] });
    setNewNote("");
    toast.success("📌 Note saved!");
  };

  const Field = ({ label, children }: { label: string; children: React.ReactNode }) => (
    <div className="space-y-1">
      <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">{label}</label>
      {children}
    </div>
  );

  const inputClass = "w-full px-3 py-2 text-sm rounded-lg border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/50 placeholder:text-muted-foreground transition-all";
  const selectClass = "w-full px-3 py-2 text-sm rounded-lg border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/50 appearance-none cursor-pointer transition-all";

  return (
    <div className="bg-background min-h-screen yext-grid-bg">
      {/* Yext Header */}
      <header className="yext-gradient border-b border-primary/10 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button onClick={() => navigate("/")} className="p-1.5 rounded-md hover:bg-primary/10 transition-colors">
            <ArrowLeft className="w-4 h-4 text-foreground/60" />
          </button>
          <LogoImg
            website={prospect.website}
            size={40}
            customLogo={prospect.customLogo}
            onUpload={(b64) => { update(prospect.id, { customLogo: b64 }); toast.success("🖼️ Logo updated!"); }}
            onRemove={prospect.customLogo ? () => { update(prospect.id, { customLogo: undefined }); toast("🖼️ Logo removed"); } : undefined}
          />
          <div>
            <div className="flex items-center gap-2.5 flex-wrap">
              <h1 className="text-lg font-extrabold text-foreground">{prospect.name}</h1>
              <span className={cn(
                "px-3 py-1 text-sm font-bold rounded-lg uppercase",
                prospect.status === "Churned"
                  ? "bg-destructive/15 text-destructive"
                  : "bg-[hsl(var(--success))]/15 text-[hsl(var(--success))]"
              )}>
                {prospect.status === "Churned" ? "💀 Churned" : "🎯 Prospect"}
              </span>
              {prospect.competitor && (
                <span className="px-3 py-1 text-sm font-bold rounded-lg bg-[hsl(var(--warning))]/15 text-[hsl(var(--warning))]">
                  Now w/ {prospect.competitor}
                </span>
              )}
              {prospect.tier && (
                <span className={cn(
                  "px-3 py-1 text-sm font-bold rounded-lg",
                  prospect.tier === "Tier 1" ? "bg-primary/15 text-primary" :
                  prospect.tier === "Tier 2" ? "bg-secondary text-secondary-foreground" :
                  "bg-muted text-muted-foreground"
                )}>
                  {prospect.tier === "Tier 1" ? "⭐" : prospect.tier === "Tier 2" ? "🥈" : "🥉"} {prospect.tier}
                </span>
              )}
            </div>
            {prospect.website && (
              <a href={`https://${prospect.website}`} target="_blank" rel="noreferrer"
                className="text-xs text-primary hover:underline inline-flex items-center gap-1 mt-0.5">
                {prospect.website} <ExternalLink className="w-3 h-3" />
              </a>
            )}
          </div>
        </div>
        <div className="flex items-center gap-3">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="text-center px-4 cursor-help">
                  <div className="text-[10px] text-muted-foreground uppercase">Score</div>
                  <div className="text-2xl font-black animate-count-up" style={{ color: scoreInfo.color }}>
                    {score}
                  </div>
                  <div className="text-[10px] font-bold" style={{ color: scoreInfo.color }}>{scoreInfo.label}</div>
                </div>
              </TooltipTrigger>
              <TooltipContent side="bottom" align="end" collisionPadding={16} className="max-w-xs z-[100]">
                <p className="font-bold text-xs mb-2">Score Breakdown</p>
                {breakdown.length === 0 ? (
                  <p className="text-[10px] text-muted-foreground">No scoring factors</p>
                ) : (
                  <div className="space-y-1">
                    {breakdown.map((item, i) => (
                      <div key={i} className="flex justify-between text-[11px] gap-4">
                        <span className="text-muted-foreground">{item.label}</span>
                        <span className={cn("font-bold", item.value >= 0 ? "text-[hsl(var(--success))]" : "text-destructive")}>
                          {item.value > 0 ? "+" : ""}{item.value}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
          <button
            onClick={() => setShowDeleteDialog(true)}
            className="p-2 rounded-md text-destructive hover:bg-destructive/5 transition-colors delete-glow"
            title="Delete prospect"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </header>

      <div className="max-w-5xl mx-auto p-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left: Details */}
          <div className="lg:col-span-2 space-y-6">
            {/* Account Info */}
            <div className="glass-card rounded-xl p-5 space-y-4 animate-fade-in-up">
              <h2 className="text-sm font-semibold text-foreground">Account Details</h2>
              <div className="grid grid-cols-2 gap-4">
                <Field label="Locations">
                  <input type="number" value={localLocCount} onChange={(e) => setLocalLocCount(e.target.value)} onBlur={commitLocCount} className={inputClass} placeholder="# of locations" />
                </Field>
                <Field label="Industry">
                  <select value={prospect.industry} onChange={(e) => handleUpdate("industry", e.target.value)} className={selectClass}>
                    <option value="">Select industry</option>
                    {INDUSTRIES.map((i) => <option key={i} value={i}>{i}</option>)}
                  </select>
                </Field>
                <Field label="Outreach Stage">
                  <select value={prospect.outreach} onChange={(e) => handleUpdate("outreach", e.target.value)} className={selectClass}>
                    {STAGES.map((s) => <option key={s} value={s}>{s}</option>)}
                  </select>
                </Field>
                <Field label="Priority">
                  <select value={prospect.priority} onChange={(e) => handleUpdate("priority", e.target.value)} className={selectClass}>
                    {PRIORITIES.map((p) => <option key={p} value={p}>{p || "None"}</option>)}
                  </select>
                </Field>
                <Field label="Tier">
                  <select value={prospect.tier} onChange={(e) => handleUpdate("tier", e.target.value)} className={selectClass}>
                    {TIERS.map((t) => <option key={t} value={t}>{t || "None"}</option>)}
                  </select>
                </Field>
                <Field label="Known Competitor">
                  <select value={competitorSelectValue} onChange={(e) => {
                    const val = e.target.value;
                    if (val === "Other") {
                      handleUpdate("competitor", "Other");
                      setLocalCustomCompetitor("");
                    } else {
                      handleUpdate("competitor", val);
                      setLocalCustomCompetitor("");
                    }
                  }} className={selectClass}>
                    {COMPETITORS.map((c) => <option key={c} value={c}>{c || "None"}</option>)}
                  </select>
                  {showCustomCompetitorInput && (
                    <input value={localCustomCompetitor} onChange={e => setLocalCustomCompetitor(e.target.value)} onBlur={commitCustomCompetitor} placeholder="Type competitor name..." className={cn(inputClass, "mt-1 text-xs")} />
                  )}
                </Field>
                <Field label="Status">
                  <select value={prospect.status} onChange={(e) => handleUpdate("status", e.target.value)} className={selectClass}>
                    <option value="Prospect">Prospect</option>
                    <option value="Churned">Churned</option>
                  </select>
                </Field>
              </div>
            </div>

            {/* Next Step */}
            <div className="glass-card rounded-xl p-5 space-y-4 animate-fade-in-up" style={{ animationDelay: "75ms" }}>
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-primary/10">
                  <Target className="w-4 h-4 text-primary" />
                </div>
                <h2 className="text-sm font-semibold text-foreground">Next Step</h2>
                {prospect.nextStepDate && new Date(prospect.nextStepDate) < new Date() && (
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-destructive/10 text-destructive overdue-flag">Overdue</span>
                )}
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Field label="Action">
                  <input
                    value={localNextStep}
                    onChange={(e) => setLocalNextStep(e.target.value)}
                    placeholder="e.g. Send follow-up email"
                    className={inputClass}
                  />
                </Field>
                <Field label="Due Date">
                  <Popover>
                    <PopoverTrigger asChild>
                      <button className={cn(inputClass, "flex items-center gap-2 text-left", !prospect.nextStepDate && "text-muted-foreground")}>
                        <CalendarIcon className="w-4 h-4 shrink-0" />
                        {prospect.nextStepDate ? format(new Date(prospect.nextStepDate), "PPP") : "Pick a date"}
                      </button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={prospect.nextStepDate ? new Date(prospect.nextStepDate) : undefined}
                        onSelect={(date) => handleUpdate("nextStepDate", date ? date.toISOString().split("T")[0] : "")}
                        initialFocus
                        className={cn("p-3 pointer-events-auto")}
                      />
                    </PopoverContent>
                  </Popover>
                </Field>
              </div>
              <div className="flex items-center gap-3">
                {localNextStep && localNextStep !== (prospect.nextStep || "") && (
                  <button onClick={() => { commitNextStep(); toast.success("✅ Next step saved!"); }}
                    className="px-3 py-1.5 text-xs rounded-md bg-primary text-primary-foreground hover:bg-primary/90 inline-flex items-center gap-1 font-medium">
                    <Plus className="w-3 h-3" /> Save Next Step
                  </button>
                )}
                {prospect.nextStep && (
                  <button
                    onClick={markNextStepComplete}
                    className="text-xs text-primary hover:underline inline-flex items-center gap-1"
                  >
                    <Check className="w-3 h-3" /> Mark complete
                  </button>
                )}
              </div>
            </div>

            {/* Notes */}
            <div className="glass-card rounded-xl p-5 space-y-4 animate-fade-in-up" style={{ animationDelay: "100ms" }}>
              <h2 className="text-sm font-semibold text-foreground">Notes</h2>
              <div className="flex gap-2">
                <input
                  value={newNote}
                  onChange={(e) => setNewNote(e.target.value)}
                  placeholder="Add a note..."
                  className={cn(inputClass, "flex-1")}
                  onKeyDown={(e) => e.key === "Enter" && addNote()}
                />
                <Button size="sm" onClick={addNote} disabled={!newNote.trim()} className="glow-blue">Add</Button>
              </div>
              {(prospect.noteLog || []).length > 0 && (
                <div className="space-y-2 max-h-60 overflow-y-auto">
                  {[...(prospect.noteLog || [])].reverse().map((note) => (
                    <div key={note.id} className="p-3 rounded-lg bg-muted/50 border border-border">
                      <p className="text-xs text-foreground">{note.text}</p>
                      <div className="flex items-center gap-1 mt-1.5">
                        <Clock className="w-2.5 h-2.5 text-muted-foreground" />
                        <span className="text-[10px] text-muted-foreground">{relativeTime(note.timestamp)}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
              {prospect.notes && (
                <div className="pt-3 border-t border-border">
                  <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Legacy Notes</label>
                  <textarea
                    value={prospect.notes || ""}
                    onChange={(e) => update(prospect.id, { notes: e.target.value })}
                    rows={3}
                    className={cn(inputClass, "resize-y mt-1")}
                  />
                </div>
              )}
              <Field label="Location Source / Notes">
                <textarea
                  value={prospect.locationNotes || ""}
                  onChange={(e) => update(prospect.id, { locationNotes: e.target.value })}
                  rows={2}
                  className={cn(inputClass, "resize-y")}
                  placeholder="Where did the location data come from?"
                />
              </Field>
            </div>

            {/* Activity Timeline */}
            <div className="glass-card rounded-xl p-5 space-y-3 animate-fade-in-up" style={{ animationDelay: "200ms" }}>
              <h2 className="text-sm font-semibold text-foreground">Activity Timeline</h2>
              <div className="flex gap-3">
                <select value={interactionType} onChange={(e) => setInteractionType(e.target.value)} className={cn(selectClass, "w-40")}>
                  {INTERACTION_TYPES.filter((t) => t !== "Task Completed").map((t) => <option key={t} value={t}>{t}</option>)}
                </select>
                <input
                  value={interactionNotes}
                  onChange={(e) => setInteractionNotes(e.target.value)}
                  placeholder="What happened?"
                  className={cn(inputClass, "flex-1")}
                  onKeyDown={(e) => e.key === "Enter" && logInteraction()}
                />
                <Button onClick={logInteraction} size="sm" className="glow-blue">Log</Button>
              </div>
              {(prospect.interactions || []).length > 0 && (
                <div className="relative mt-4">
                  <div className="absolute left-[15px] top-0 bottom-0 w-px bg-primary/20" />
                  <div className="space-y-4">
                    {[...(prospect.interactions || [])].reverse().map((i, idx) => (
                      <div key={i.id} className="flex items-start gap-3 relative animate-slide-in-right" style={{ animationDelay: `${idx * 50}ms` }}>
                        <div className={cn(
                          "w-8 h-8 rounded-full flex items-center justify-center shrink-0 z-10",
                          i.type === "Email" ? "bg-primary/10 text-primary" :
                          i.type === "Call" ? "bg-[hsl(var(--success))]/10 text-[hsl(var(--success))]" :
                          i.type === "Task Completed" ? "bg-[hsl(var(--success))]/15 text-[hsl(var(--success))]" :
                          "bg-secondary text-secondary-foreground"
                        )}>
                          <InteractionIcon type={i.type} />
                        </div>
                        <div className="flex-1 pb-4">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-semibold text-foreground">{i.type}</span>
                            <span className="text-[10px] text-muted-foreground">{relativeTime(i.date)}</span>
                          </div>
                          <p className="text-xs text-muted-foreground mt-0.5">{i.notes}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {(prospect.interactions || []).length === 0 && (
                <p className="text-xs text-muted-foreground py-4 text-center">No interactions logged yet.</p>
              )}
            </div>
          </div>

          {/* Right: Contacts + Meta */}
          <div className="space-y-6">
            <div className="glass-card rounded-xl p-5 animate-fade-in-up" style={{ animationDelay: "50ms" }}>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-sm font-semibold text-foreground">Contacts</h2>
                <button onClick={() => setShowAddContact(true)} className="p-1 rounded-md hover:bg-primary/10 transition-colors">
                  <Plus className="w-4 h-4 text-primary" />
                </button>
              </div>

              {showAddContact && (
                <div className="space-y-2 mb-4 p-3 border border-border rounded-lg bg-muted/30 animate-fade-in-up">
                  <input value={newContact.name || ""} onChange={(e) => setNewContact({ ...newContact, name: e.target.value })} placeholder="Name *" className={cn(inputClass, "text-xs py-1.5")} />
                  <input value={newContact.title || ""} onChange={(e) => setNewContact({ ...newContact, title: e.target.value })} placeholder="Title" className={cn(inputClass, "text-xs py-1.5")} />
                  <input value={newContact.email || ""} onChange={(e) => setNewContact({ ...newContact, email: e.target.value })} placeholder="Email" className={cn(inputClass, "text-xs py-1.5")} />
                  <input value={newContact.phone || ""} onChange={(e) => setNewContact({ ...newContact, phone: e.target.value })} placeholder="Phone" className={cn(inputClass, "text-xs py-1.5")} />
                  <input value={newContact.notes || ""} onChange={(e) => setNewContact({ ...newContact, notes: e.target.value })} placeholder="Notes" className={cn(inputClass, "text-xs py-1.5")} />
                  <div className="flex gap-2">
                    <button onClick={addContact} className="px-3 py-1.5 bg-primary text-primary-foreground text-xs rounded-md hover:bg-primary/90">Add</button>
                    <button onClick={() => { setShowAddContact(false); setNewContact({}); }} className="px-3 py-1.5 bg-muted text-muted-foreground text-xs rounded-md hover:bg-accent">Cancel</button>
                  </div>
                </div>
              )}

              {(prospect.contacts || []).length === 0 && !showAddContact && (
                <p className="text-xs text-muted-foreground">No contacts yet.</p>
              )}

              <div className="space-y-3">
                {(prospect.contacts || []).map((c) => (
                  <EditableContact
                    key={c.id}
                    contact={c}
                    onSave={updateContact}
                    onRemove={() => removeContact(c.id)}
                  />
                ))}
              </div>
            </div>

            <div className="glass-card rounded-xl p-5 space-y-2 animate-fade-in-up" style={{ animationDelay: "150ms" }}>
              <h2 className="text-sm font-semibold text-foreground mb-3">Details</h2>
              <div className="text-xs text-muted-foreground">Modified: <span className="text-foreground">{prospect.lastModified || "—"}</span></div>
              {prospect.lastTouched && <div className="text-xs text-muted-foreground">Last Touched: <span className="text-foreground">{prospect.lastTouched}</span></div>}
              {prospect.createdAt && <div className="text-xs text-muted-foreground">Created: <span className="text-foreground">{relativeTime(prospect.createdAt)}</span></div>}
            </div>
          </div>
        </div>
      </div>

      {/* Delete Confirmation */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete "{prospect.name}"?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This prospect and all associated contacts, interactions, and notes will be permanently removed.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete Permanently
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

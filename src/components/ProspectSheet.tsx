import { useState, useMemo, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { format } from "date-fns";
import {
  INDUSTRIES, STAGES, STATUSES, PRIORITIES, TIERS, COMPETITORS, INTERACTION_TYPES,
  CONTACT_ROLES, RELATIONSHIP_STRENGTHS,
  scoreProspect, scoreBreakdown, getScoreLabel, getLogoUrl,
  type Prospect, type Contact, type InteractionLog, type NoteEntry, type Task,
} from "@/data/prospects";
import { RoleBadge, StrengthDot } from "@/components/ContactBadges";
import { SafeHTML } from "@/components/SafeHTML";
import { RichTextEditor } from "@/components/RichTextEditor";
import { AIReadinessCard } from "@/components/AIReadinessCard";
import { SignalsSection } from "@/components/SignalsSection";
import { ContactPickerDialog } from "@/components/ContactPickerDialog";
import { type Signal } from "@/hooks/useSignals";
import { cn, normalizeUrl } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import {
  ExternalLink, Plus, X, Mail, Phone, Building2, MessageSquare, PhoneCall,
  Linkedin, Clock, CalendarIcon, Target, ArrowRight, Check, CheckCircle, Trash2,
  Sparkles, Copy, Loader2, RefreshCw, FileText, Pencil, Star, Search, ThumbsUp, ThumbsDown,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { Drawer, DrawerContent } from "@/components/ui/drawer";
import { useIsMobile } from "@/hooks/use-mobile";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";

interface ProspectSheetProps {
  prospectId: any;
  onClose: () => void;
  data: Prospect[];
  update: (id: any, u: Partial<Prospect>) => void;
  remove: (id: any) => void;
  deleteNote?: (prospectId: any, noteId: string) => void;
  addContact?: (prospectId: string, contact: Omit<Contact, "id">) => Promise<void>;
  updateContact?: (contactId: string, fields: Partial<Contact>) => Promise<void>;
  removeContact?: (contactId: string) => Promise<void>;
  addInteraction?: (prospectId: string, interaction: Omit<InteractionLog, "id">) => Promise<void>;
  removeInteraction?: (interactionId: string) => Promise<void>;
  addNote?: (prospectId: string, text: string) => Promise<void>;
  addTaskDirect?: (prospectId: string, task: Omit<Task, "id">) => Promise<void>;
  removeTaskDirect?: (taskId: string) => Promise<void>;
  signals?: Signal[];
  addSignal?: (signal: Omit<Signal, "id" | "created_at" | "user_id">) => Promise<Signal | null>;
  removeSignal?: (id: string) => Promise<void>;
  territoryId?: string | null;
  /** Controlled tab value (one of: overview | activity | contacts | tasks). Falls back to internal state when undefined. */
  activeTab?: string;
  /** Controlled tab change handler. Required when activeTab is provided to make Tabs controlled. */
  onTabChange?: (tab: string) => void;
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

export function ProspectSheet({ prospectId, onClose, data, update, remove, deleteNote, addContact: addContactDirect, updateContact: updateContactDirect, removeContact: removeContactDirect, addInteraction: addInteractionDirect, removeInteraction: removeInteractionDirect, addNote: addNoteDirect, addTaskDirect, removeTaskDirect, signals = [], addSignal, removeSignal, territoryId, activeTab, onTabChange }: ProspectSheetProps) {
  const navigate = useNavigate();
  const isMobile = useIsMobile();

  // Tab state — controlled if activeTab/onTabChange are provided, internal otherwise (e.g. ProspectPage usage)
  const [internalTab, setInternalTab] = useState<string>("overview");
  const tab = activeTab ?? internalTab;
  const setTab = onTabChange ?? setInternalTab;

  const prospect = useMemo(() => data.find(p => p.id === prospectId), [data, prospectId]);
  const prospectSignals = useMemo(() => signals.filter(s => s.prospect_id === prospectId), [signals, prospectId]);

  const [newContact, setNewContact] = useState<Partial<Contact>>({});
  const [showAddContact, setShowAddContact] = useState(false);
  const [editingContactId, setEditingContactId] = useState<string | null>(null);
  const [editContact, setEditContact] = useState<Partial<Contact>>({});
  const [starOverrides, setStarOverrides] = useState<Map<string, boolean>>(new Map());

  // Direct DB update for star toggle — does NOT use the heavy update() which deletes + re-inserts all contacts
  const handleToggleStar = async (contactId: string, currentStarred: boolean) => {
    const newVal = !currentStarred;
    // Optimistic local update
    setStarOverrides(prev => new Map(prev).set(contactId, newVal));
    const { error } = await supabase
      .from("prospect_contacts")
      .update({ starred: newVal } as any)
      .eq("id", contactId);
    if (error) {
      // Revert on failure
      setStarOverrides(prev => { const m = new Map(prev); m.delete(contactId); return m; });
      toast.error("Failed to update star");
    }
  };

  // Reset local state when switching prospects
  useEffect(() => {
    setStarOverrides(new Map());
    setResearchFindings([]);
    setResearchRan(false);
    setResearchLoading(false);
  }, [prospectId]);
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
  const [showFollowUp, setShowFollowUp] = useState(false);
  // Outreach draft state
  const [outreachDraft, setOutreachDraft] = useState("");
  const [outreachLoading, setOutreachLoading] = useState(false);
  const [showDraftDialog, setShowDraftDialog] = useState(false);
  const [showDraftPicker, setShowDraftPicker] = useState(false);
  // Meeting prep state
  const [meetingPrepBrief, setMeetingPrepBrief] = useState("");
  const [meetingPrepLoading, setMeetingPrepLoading] = useState(false);
  const [showMeetingPrepDialog, setShowMeetingPrepDialog] = useState(false);
  // Research state
  interface ResearchFinding {
    title: string;
    description: string;
    signal_type: string;
    relevance: string;
    source: string;
    url?: string;
  }
  const [researchFindings, setResearchFindings] = useState<ResearchFinding[]>([]);
  const [researchLoading, setResearchLoading] = useState(false);
  const [researchRan, setResearchRan] = useState(false);

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

  const score = prospect ? scoreProspect(prospect) : 0;
  const scoreInfo = getScoreLabel(score);

  // "Why act" summary: chain applicable nudges
  const whyActParts: string[] = useMemo(() => {
    if (!prospect) return [];

    const parts: string[] = [];
    if (score >= 60) {
      const hasDecisionMaker = (prospect.contacts || []).some(c => c.role === "Decision Maker");
      if (!hasDecisionMaker) parts.push("Missing Decision Maker");
    }
    const interactions = prospect.interactions || [];
    if (interactions.length === 0) {
      parts.push("Never contacted");
    } else {
      const lastInteraction = interactions.slice().sort((a, b) => b.date.localeCompare(a.date))[0];
      const daysSince = Math.floor((Date.now() - new Date(lastInteraction.date).getTime()) / 86400000);
      if (daysSince > 30) parts.push(`${daysSince} days since last touch`);
    }
    const comp = prospect.competitor || "";
    if (comp === "SOCi" || comp === "Birdeye") parts.push(`On ${comp}`);
    return parts;
  }, [score, prospect]);

  if (!prospect) return null;

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

  const addTask = async () => {
    if (!newTaskText.trim()) return;
    await addTaskDirect?.(prospect.id, { text: newTaskText.trim(), dueDate: newTaskDate });
    setNewTaskText("");
    setNewTaskDate("");
    toast.success("✅ Task added!");
  };

  const completeTask = async (task: Task) => {
    await removeTaskDirect?.(task.id);
    await addInteractionDirect?.(prospect.id, {
      type: "Task Completed",
      date: new Date().toISOString().split("T")[0],
      notes: task.text,
    });
    toast.success("✅ Task completed!");
  };

  const removeTask = async (taskId: string) => {
    await removeTaskDirect?.(taskId);
    toast("🗑️ Task removed");
  };

  // Determine displayed competitor value for select
  const competitorSelectValue = prospect.competitor && !COMPETITORS.includes(prospect.competitor) && prospect.competitor.startsWith("Other: ")
    ? "Other" : prospect.competitor;
  const showCustomCompetitorInput = competitorSelectValue === "Other" || (prospect.competitor && prospect.competitor.startsWith("Other: "));

  const addContact = async () => {
    if (!newContact.name || !addContactDirect) return;
    await addContactDirect(prospect.id, {
      name: newContact.name || "", email: newContact.email || "",
      phone: newContact.phone || "", title: newContact.title || "", notes: newContact.notes || "",
      role: (newContact as any).role || "Unknown", relationshipStrength: (newContact as any).relationshipStrength || "Unknown",
      linkedinUrl: newContact.linkedinUrl || "",
    });
    setNewContact({}); setShowAddContact(false);
    toast.success("👤 Contact added!");
  };

  const removeContact = async (contactId: string) => {
    if (!removeContactDirect) return;
    await removeContactDirect(contactId);
    toast("👤 Contact removed");
  };

  const startEditContact = (c: Contact) => {
    setEditingContactId(c.id);
    setEditContact({ name: c.name, title: c.title, email: c.email, phone: c.phone, notes: c.notes, role: c.role, relationshipStrength: c.relationshipStrength, linkedinUrl: c.linkedinUrl } as any);
  };

  const saveEditContact = async () => {
    if (!editingContactId || !editContact.name || !updateContactDirect) return;
    await updateContactDirect(editingContactId, editContact);
    setEditingContactId(null);
    setEditContact({});
    toast.success("✅ Contact updated!");
  };

  const logInteraction = async () => {
    await addInteractionDirect?.(prospect.id, {
      type: interactionType,
      date: new Date().toISOString().split("T")[0],
      notes: interactionNotes || `${interactionType} logged`,
    });
    setInteractionNotes("");
    toast.success("📝 Activity logged!");
  };

  const logActivity = async () => {
    if (!interactionNotes.trim() && !showFollowUp) {
      toast.error("Add notes or a follow-up task");
      return;
    }
    // Log the interaction
    await addInteractionDirect?.(prospect.id, {
      type: interactionType,
      date: new Date().toISOString().split("T")[0],
      notes: interactionNotes || `${interactionType} logged`,
    });
    // Optionally create follow-up task
    if (showFollowUp && newTaskText.trim()) {
      await addTaskDirect?.(prospect.id, { text: newTaskText.trim(), dueDate: newTaskDate });
    }
    setInteractionNotes("");
    setNewTaskText("");
    setNewTaskDate("");
    setShowFollowUp(false);
    toast.success(showFollowUp && newTaskText.trim() ? "📝 Activity logged + task created!" : "📝 Activity logged!");
  };

  const submitNote = async () => {
    // Strip HTML tags to check if there's actual text content
    const textOnly = newNote.replace(/<[^>]*>/g, "").trim();
    if (!textOnly) return;
    await addNoteDirect?.(prospect.id, newNote);
    setNewNote("");
    toast.success("📌 Note saved!");
  };

  const generateOutreach = async () => {
    setOutreachLoading(true);
    setShowDraftDialog(true);
    setOutreachDraft("");
    try {
      const { data: result, error: fnError } = await supabase.functions.invoke("draft-outreach", {
        body: {
          name: prospect.name,
          industry: prospect.industry,
          locationCount: prospect.locationCount,
          competitor: prospect.competitor,
          tier: prospect.tier,
          contacts: prospect.contacts,
          recentInteraction: prospect.interactions?.slice(-1)[0],
        },
      });

      if (fnError) throw fnError;
      if (result?.error) throw new Error(result.error);
      if (!result?.draft) throw new Error("Empty response from API");
      setOutreachDraft(result.draft);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to generate draft";
      toast.error(msg);
      setOutreachDraft("");
      setShowDraftDialog(false);
    } finally {
      setOutreachLoading(false);
    }
  };

  const copyOutreach = () => {
    if (outreachDraft) {
      navigator.clipboard.writeText(outreachDraft);
      toast.success("Email draft copied to clipboard!");
    }
  };

  const generateMeetingPrep = async () => {
    setMeetingPrepLoading(true);
    setShowMeetingPrepDialog(true);
    setMeetingPrepBrief("");
    try {
      const { data: result, error } = await supabase.functions.invoke("meeting-prep", {
        body: {
          name: prospect.name,
          website: prospect.website,
          industry: prospect.industry,
          locationCount: prospect.locationCount,
          tier: prospect.tier,
          priority: prospect.priority,
          competitor: prospect.competitor,
          score,
          contacts: prospect.contacts,
          interactions: prospect.interactions,
          tasks: prospect.tasks,
          notes: prospect.noteLog,
        },
      });
      if (error) throw error;
      if (result?.error) throw new Error(result.error);
      const text = result?.brief;
      if (!text) throw new Error("Empty response from meeting prep");
      setMeetingPrepBrief(text);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to generate meeting prep";
      toast.error(msg);
      setMeetingPrepBrief("");
      setShowMeetingPrepDialog(false);
    } finally {
      setMeetingPrepLoading(false);
    }
  };

  const copyMeetingPrep = () => {
    if (meetingPrepBrief) {
      navigator.clipboard.writeText(meetingPrepBrief);
      toast.success("Meeting prep copied to clipboard!");
    }
  };

  const exportMeetingPrepPdf = () => {
    if (!meetingPrepBrief) return;
    const today = new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });
    const printWindow = window.open("", "_blank");
    if (!printWindow) {
      toast.error("Pop-up blocked — please allow pop-ups for PDF export.");
      return;
    }
    printWindow.document.write(`<!DOCTYPE html><html><head><title>Meeting Prep — ${prospect.name}</title>
<style>
  @media print { body { margin: 0; } @page { margin: 0.75in; } }
  body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; color: #1a1a1a; max-width: 700px; margin: 0 auto; padding: 40px 24px; line-height: 1.6; }
  .header { border-bottom: 2px solid #2563eb; padding-bottom: 12px; margin-bottom: 24px; }
  .header h1 { font-size: 20px; font-weight: 700; margin: 0 0 4px 0; color: #111; }
  .header .meta { font-size: 13px; color: #666; }
  .content { font-size: 14px; white-space: pre-wrap; }
  .content strong { color: #111; }
  .footer { margin-top: 32px; padding-top: 12px; border-top: 1px solid #e5e7eb; font-size: 11px; color: #999; }
</style></head><body>
<div class="header">
  <h1>Meeting Prep — ${prospect.name}</h1>
  <div class="meta">${today} · Prepared by Territory Plan Buddy</div>
</div>
<div class="content">${meetingPrepBrief.replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")}</div>
<div class="footer">${prospect.industry || ""}${prospect.industry && prospect.locationCount ? " · " : ""}${prospect.locationCount ? prospect.locationCount + " locations" : ""}</div>
</body></html>`);
    printWindow.document.close();
    setTimeout(() => { printWindow.print(); }, 300);
  };

  const runResearch = async () => {
    if (!prospect) return;
    setResearchLoading(true);
    setResearchFindings([]);
    setResearchRan(true);
    try {
      const { data: result, error } = await supabase.functions.invoke("chat", {
        body: {
          mode: "research",
          name: prospect.name,
          website: prospect.website,
          industry: prospect.industry,
          locationCount: prospect.locationCount,
          contacts: (prospect.contacts || []).slice(0, 5).map(c => ({ name: c.name, title: c.title, role: c.role })),
          competitor: prospect.competitor,
        },
      });
      if (error) throw error;
      if (result?.error) throw new Error(result.error);
      const findings = result?.findings || [];
      setResearchFindings(findings);
      if (findings.length === 0) {
        toast("No new findings for this account", { description: "Try again later or research manually." });
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Research failed";
      toast.error(msg);
    } finally {
      setResearchLoading(false);
    }
  };

  const keepFinding = async (finding: ResearchFinding) => {
    if (!addSignal || !prospect) return;
    const result = await addSignal({
      prospect_id: prospect.id,
      territory_id: territoryId || null,
      signal_type: finding.signal_type,
      opportunity_type: "Other",
      title: finding.title,
      description: finding.description,
      relevance: finding.relevance,
      source: finding.source,
    });
    if (result) {
      setResearchFindings(prev => prev.filter(f => f.title !== finding.title));
      toast.success("Signal saved");
    }
  };

  const discardFinding = (finding: ResearchFinding) => {
    setResearchFindings(prev => prev.filter(f => f.title !== finding.title));
  };

  const keepAllFindings = async () => {
    for (const f of researchFindings) {
      await keepFinding(f);
    }
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
                <span className={cn("px-2 py-0.5 text-xs font-bold rounded-md uppercase",
                  prospect.status === "Churned" ? "bg-destructive/15 text-destructive" :
                  prospect.status === "Closed Lost Prospect" ? "bg-amber-500/15 text-amber-700 dark:text-amber-400" :
                  prospect.status === "Customer" ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400" :
                  "bg-[hsl(var(--success))]/15 text-[hsl(var(--success))]"
                )}>{prospect.status === "Churned" ? "💀 Churned" :
                   prospect.status === "Closed Lost Prospect" ? "❌ Closed Lost" :
                   prospect.status === "Customer" ? "✅ Customer" :
                   "🎯 Prospect"}</span>
                {prospect.tier && <span className={cn("px-2 py-0.5 text-xs font-bold rounded-md",
                  prospect.tier === "Tier 1" ? "bg-primary/15 text-primary" : "bg-muted text-muted-foreground"
                )}>{prospect.tier === "Tier 1" ? "⭐" : prospect.tier === "Tier 2" ? "🥈" : "🥉"} {prospect.tier}</span>}
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">
                {prospect.website && <a href={normalizeUrl(prospect.website)} target="_blank" rel="noreferrer" className="text-primary hover:underline inline-flex items-center gap-1">{prospect.website} <ExternalLink className="w-3 h-3" /></a>}
              </p>
            </div>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="text-center px-3 cursor-help">
                    <div className="text-2xl font-black animate-count-up" style={{ color: scoreInfo.color }}>{score}</div>
                    <div className="text-xs font-bold" style={{ color: scoreInfo.color }}>{scoreInfo.label}</div>
                    {whyActParts.length > 0 && (
                      <div className="text-[10px] text-amber-600 dark:text-amber-400 font-medium mt-0.5 max-w-[180px] leading-tight">
                        {whyActParts.join(" · ")}
                      </div>
                    )}
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
          <div className="flex items-center gap-3 mt-2">
            <button onClick={() => { onClose(); navigate(`/prospect/${prospect.id}`); }}
              className="text-xs font-medium text-primary hover:underline inline-flex items-center gap-1">
              Open full page <ArrowRight className="w-3 h-3" />
            </button>
            <button onClick={() => setShowDraftPicker(true)} className="text-xs font-medium text-primary hover:underline inline-flex items-center gap-1 ml-4">
              <Mail className="w-3 h-3" /> Draft Email
            </button>
            <button onClick={generateMeetingPrep} className="text-xs font-medium text-primary hover:underline inline-flex items-center gap-1 ml-3">
              <FileText className="w-3 h-3" /> Meeting Prep
            </button>
          </div>
        </div>

        {/* Content — Tabbed IA (Overview / Activity / Contacts / Tasks) */}
        <Tabs value={tab} onValueChange={setTab} className="px-6 py-5">
          <TabsList className="grid grid-cols-4 w-full mb-4">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="activity">Activity</TabsTrigger>
            <TabsTrigger value="contacts">Contacts</TabsTrigger>
            <TabsTrigger value="tasks">Tasks</TabsTrigger>
          </TabsList>

          {/* OVERVIEW TAB: Account Details, Research, Signals, AI Readiness, Location Notes */}
          <TabsContent value="overview" className="space-y-5 mt-0 animate-fade-in-up">
          {/* Account Details */}
          <div className="space-y-3">
            <h3 className="text-sm font-bold text-foreground uppercase tracking-wider">Account Details</h3>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-muted-foreground uppercase">Locations</label>
                <input type="number" value={localLocCount} onChange={e => setLocalLocCount(e.target.value)} onBlur={commitLocCount} className={inputClass} placeholder="# of locations" />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-semibold text-muted-foreground uppercase">Industry</label>
                <select value={prospect.industry} onChange={e => handleUpdate("industry", e.target.value)} className={selectClass}>
                  <option value="">Select</option>
                  {INDUSTRIES.map(i => <option key={i} value={i}>{i}</option>)}
                </select>
              </div>
              <div className="space-y-1">
                <label className="text-xs font-semibold text-muted-foreground uppercase">Outreach</label>
                <select value={prospect.outreach} onChange={e => handleUpdate("outreach", e.target.value)} className={selectClass}>
                  {STAGES.map(s => <option key={s} value={s}>{STAGE_EMOJI[s] || ""} {s}</option>)}
                </select>
              </div>
              <div className="space-y-1">
                <label className="text-xs font-semibold text-muted-foreground uppercase">Priority</label>
                <select value={prospect.priority} onChange={e => handleUpdate("priority", e.target.value)} className={selectClass}>
                  <option value="">None</option>
                  <option value="Hot">🔥 Hot</option>
                  <option value="Warm">☀️ Warm</option>
                  <option value="Cold">🧊 Cold</option>
                  <option value="Dead">💀 Dead</option>
                </select>
              </div>
              <div className="space-y-1">
                <label className="text-xs font-semibold text-muted-foreground uppercase">Tier</label>
                <select value={prospect.tier} onChange={e => handleUpdate("tier", e.target.value)} className={selectClass}>
                  <option value="">None</option>
                  <option value="Tier 1">⭐ Tier 1</option>
                  <option value="Tier 2">🥈 Tier 2</option>
                  <option value="Tier 3">🥉 Tier 3</option>
                  <option value="Tier 4">Tier 4</option>
                </select>
              </div>
              <div className="space-y-1">
                <label className="text-xs font-semibold text-muted-foreground uppercase">Competitor</label>
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
                <label className="text-xs font-semibold text-muted-foreground uppercase">Status</label>
                <select value={prospect.status} onChange={e => handleUpdate("status", e.target.value)} className={selectClass}>
                  {STATUSES.map(s => (
                    <option key={s} value={s}>
                      {s === "Prospect" ? "🎯" : s === "Closed Lost Prospect" ? "❌" : s === "Churned" ? "💀" : "✅"} {s}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-1">
                <label className="text-xs font-semibold text-muted-foreground uppercase">Active ACV ($)</label>
                <input
                  type="number"
                  value={(prospect as any).activeAcv || ""}
                  onChange={e => {
                    const val = e.target.value ? parseInt(e.target.value) : null;
                    handleUpdate("activeAcv", val);
                  }}
                  className={inputClass}
                  placeholder="Current ACV"
                />
              </div>
            </div>
          </div>

          {/* Account Research — top of sheet, compact until clicked */}
          {addSignal && (
            <div>
              {!researchRan && !researchLoading ? (
                <button
                  onClick={runResearch}
                  className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-lg border border-dashed border-primary/30 text-primary hover:bg-primary/5 hover:border-primary/50 transition-all text-sm font-medium"
                >
                  <Search className="w-4 h-4" />
                  Research {prospect.name} — find news, hires, and signals
                </button>
              ) : (
                <div className="space-y-3">
                  {researchLoading && (
                    <div className="flex items-center justify-center py-6 rounded-lg border border-border bg-muted/20">
                      <div className="flex items-center gap-3">
                        <Loader2 className="w-5 h-5 animate-spin text-primary" />
                        <span className="text-sm text-muted-foreground">Researching {prospect.name}...</span>
                      </div>
                    </div>
                  )}

                  {!researchLoading && researchFindings.length > 0 && (
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold text-foreground">{researchFindings.length} finding{researchFindings.length !== 1 ? "s" : ""}</span>
                        <div className="flex items-center gap-3">
                          <button onClick={keepAllFindings} className="text-[10px] font-semibold text-primary hover:underline">Keep All</button>
                          <button onClick={runResearch} className="text-[10px] font-semibold text-muted-foreground hover:text-foreground">
                            <RefreshCw className="w-3 h-3" />
                          </button>
                        </div>
                      </div>
                      {researchFindings.map((finding, idx) => (
                        <div key={idx} className="p-3 rounded-lg border border-border bg-muted/30 space-y-2 animate-fade-in-up" style={{ animationDelay: `${idx * 60}ms` }}>
                          <div className="flex items-center gap-2 mb-1">
                            <span className={cn(
                              "text-[9px] font-bold uppercase px-1.5 py-0.5 rounded",
                              finding.relevance === "Hot" ? "bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400" :
                              finding.relevance === "Warm" ? "bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400" :
                              "bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400"
                            )}>
                              {finding.relevance}
                            </span>
                            <span className="text-[9px] text-muted-foreground">{finding.signal_type}</span>
                            <span className="text-[9px] text-muted-foreground/50 ml-auto">{finding.source}</span>
                          </div>
                          <p className="text-xs font-semibold text-foreground leading-snug">{finding.title}</p>
                          <p className="text-[11px] text-muted-foreground leading-relaxed">{finding.description}</p>
                          <div className="flex items-center gap-2 pt-1.5">
                            <button
                              onClick={() => keepFinding(finding)}
                              className="inline-flex items-center gap-1 px-2.5 py-1 text-[10px] font-semibold rounded-md bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-200 dark:hover:bg-emerald-900/50 transition-colors"
                            >
                              <Check className="w-3 h-3" /> Keep
                            </button>
                            <button
                              onClick={() => discardFinding(finding)}
                              className="inline-flex items-center gap-1 px-2.5 py-1 text-[10px] font-semibold rounded-md text-muted-foreground hover:bg-muted transition-colors"
                            >
                              <X className="w-3 h-3" /> Discard
                            </button>
                            <a
                              href={`https://www.google.com/search?q=${encodeURIComponent(prospect.name + " " + finding.title)}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 px-2.5 py-1 text-[10px] font-semibold rounded-md text-muted-foreground hover:bg-muted transition-colors ml-auto"
                            >
                              <Search className="w-3 h-3" /> Verify
                            </a>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {!researchLoading && researchRan && researchFindings.length === 0 && (
                    <div className="flex items-center justify-between py-3 px-4 rounded-lg border border-border bg-muted/20">
                      <span className="text-xs text-muted-foreground">No findings this time.</span>
                      <button onClick={runResearch} className="text-xs font-medium text-primary hover:underline inline-flex items-center gap-1">
                        <RefreshCw className="w-3 h-3" /> Try again
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Signals — moved here from below for Overview tab */}
          {addSignal && removeSignal && (
            <div>
              <SignalsSection
                prospect={prospect}
                signals={prospectSignals}
                onAdd={addSignal}
                onRemove={removeSignal}
                territoryId={territoryId}
                compact
              />
            </div>
          )}

          {/* AI Readiness */}
          <div>
            <AIReadinessCard prospect={prospect} onUpdate={update} compact />
          </div>

          {/* Location Notes */}
          {prospect.locationNotes && (
            <div className="space-y-2">
              <h3 className="text-sm font-bold text-foreground uppercase tracking-wider">Location Notes</h3>
              <p className="text-sm text-foreground/80 bg-muted/50 p-3 rounded-lg border border-border">{prospect.locationNotes}</p>
            </div>
          )}
          </TabsContent>

          {/* ACTIVITY TAB: Log Activity widget, Notes, Activity Timeline */}
          <TabsContent value="activity" className="space-y-5 mt-0 animate-fade-in-up">
          {/* Log Activity — unified widget */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Target className="w-4 h-4 text-primary" />
              <h3 className="text-sm font-bold text-foreground uppercase tracking-wider">Log Activity</h3>
            </div>
            <div className="p-3 border border-border rounded-lg bg-muted/30 space-y-3">
              <div className="flex gap-2">
                <select value={interactionType} onChange={e => setInteractionType(e.target.value)} className={cn(selectClass, "w-36 text-xs")}>
                  {INTERACTION_TYPES.filter(t => t !== "Task Completed").map(t => <option key={t} value={t}>{t}</option>)}
                </select>
                <input value={interactionNotes} onChange={e => setInteractionNotes(e.target.value)} placeholder="What happened?" className={cn(inputClass, "flex-1 text-xs")} onKeyDown={e => e.key === "Enter" && !showFollowUp && logActivity()} />
              </div>
              {/* Follow-up toggle */}
              <button
                type="button"
                onClick={() => setShowFollowUp(!showFollowUp)}
                className={cn("text-xs font-medium inline-flex items-center gap-1 transition-colors",
                  showFollowUp ? "text-primary" : "text-muted-foreground hover:text-foreground"
                )}
              >
                {showFollowUp ? <Check className="w-3 h-3" /> : <Plus className="w-3 h-3" />}
                {showFollowUp ? "Follow-up task added" : "Add follow-up task"}
              </button>
              {showFollowUp && (
                <div className="grid grid-cols-2 gap-3 animate-fade-in-up">
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-muted-foreground uppercase">Follow-up</label>
                    <input value={newTaskText} onChange={e => setNewTaskText(e.target.value)} placeholder="e.g. Send proposal" className={cn(inputClass, "text-xs")} />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-muted-foreground uppercase">Due Date</label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <button className={cn(inputClass, "flex items-center gap-2 text-left text-xs", !newTaskDate && "text-muted-foreground")}>
                          <CalendarIcon className="w-3.5 h-3.5 shrink-0" />
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
              )}
              <Button onClick={logActivity} size="sm" className="w-full text-xs font-semibold">
                Log Activity{showFollowUp && newTaskText.trim() ? " + Create Task" : ""}
              </Button>
            </div>
          </div>

          {/* Notes */}
          <div className="space-y-3">
            <h3 className="text-sm font-bold text-foreground uppercase tracking-wider">Notes</h3>
            <RichTextEditor
              content={newNote}
              onChange={setNewNote}
              placeholder="Add a note..."
              minHeight="60px"
            />
            <Button size="sm" onClick={submitNote} disabled={!newNote.replace(/<[^>]*>/g, "").trim()}>Add Note</Button>
            {(prospect.noteLog || []).length > 0 && (
              <div className="space-y-2 max-h-40 overflow-y-auto">
                {[...(prospect.noteLog || [])].reverse().map(note => (
                  <div key={note.id} className="group p-2.5 rounded-lg bg-muted/50 border border-border relative">
                     <SafeHTML html={note.text} className="text-sm text-foreground pr-6 prose prose-sm dark:prose-invert max-w-none [&_p]:my-0.5" />
                     <span className="text-xs text-muted-foreground flex items-center gap-1 mt-1"><Clock className="w-3 h-3" />{relativeTime(note.timestamp)}</span>
                    {deleteNote && (
                      <button
                        onClick={() => { deleteNote(prospect.id, note.id); toast.success("Note deleted"); }}
                        className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-all"
                        title="Delete note"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Activity Timeline */}
          <div className="space-y-3">
            <h3 className="text-sm font-bold text-foreground uppercase tracking-wider">Activity Timeline</h3>
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
                         <div className="flex items-center gap-2"><span className="text-sm font-semibold text-foreground">{i.type}</span><span className="text-xs text-muted-foreground">{relativeTime(i.date)}</span></div>
                        {i.notes && <p className="text-sm text-foreground/80 mt-0.5">{i.notes}</p>}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
            {(prospect.interactions || []).length === 0 && <p className="text-sm text-muted-foreground text-center py-3">No interactions logged yet.</p>}
          </div>
          </TabsContent>

          {/* CONTACTS TAB: Contacts list + add/edit form */}
          <TabsContent value="contacts" className="space-y-5 mt-0 animate-fade-in-up">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-foreground uppercase tracking-wider">Contacts</h3>
              <button onClick={() => setShowAddContact(!showAddContact)} className="p-1 rounded-md hover:bg-primary/10"><Plus className="w-3.5 h-3.5 text-primary" /></button>
            </div>
            {showAddContact && (
              <div className="space-y-2 p-3 border border-border rounded-lg bg-muted/30 animate-fade-in-up">
                <input value={newContact.name || ""} onChange={e => setNewContact({...newContact, name: e.target.value})} placeholder="Name *" className={cn(inputClass, "text-xs py-1.5")} />
                <input value={newContact.title || ""} onChange={e => setNewContact({...newContact, title: e.target.value})} placeholder="Title" className={cn(inputClass, "text-xs py-1.5")} />
                <input value={newContact.email || ""} onChange={e => setNewContact({...newContact, email: e.target.value})} placeholder="Email" className={cn(inputClass, "text-xs py-1.5")} />
                <input value={newContact.phone || ""} onChange={e => setNewContact({...newContact, phone: e.target.value})} placeholder="Phone" className={cn(inputClass, "text-xs py-1.5")} />
                <input value={newContact.linkedinUrl || ""} onChange={e => setNewContact({...newContact, linkedinUrl: e.target.value})} placeholder="LinkedIn URL (e.g. linkedin.com/in/...)" className={cn(inputClass, "text-xs py-1.5")} />
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-0.5">
              <label className="text-xs font-semibold text-muted-foreground uppercase">Role</label>
                    <select value={(newContact as any).role || "Unknown"} onChange={e => setNewContact({...newContact, role: e.target.value} as any)} className={cn(selectClass, "text-xs py-1.5")}>
                      {CONTACT_ROLES.map(r => <option key={r} value={r}>{r}</option>)}
                    </select>
                  </div>
                  <div className="space-y-0.5">
                    <label className="text-xs font-semibold text-muted-foreground uppercase">Relationship</label>
                    <select value={(newContact as any).relationshipStrength || "Unknown"} onChange={e => setNewContact({...newContact, relationshipStrength: e.target.value} as any)} className={cn(selectClass, "text-xs py-1.5")}>
                      {RELATIONSHIP_STRENGTHS.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </div>
                </div>
                <RichTextEditor
                  content={newContact.notes || ""}
                  onChange={(html) => setNewContact({ ...newContact, notes: html })}
                  placeholder="Notes (e.g. CMO previously at a customer account)"
                  minHeight="80px"
                />
                <div className="flex gap-2">
                  <button onClick={addContact} className="px-3 py-1.5 bg-primary text-primary-foreground text-xs rounded-md hover:bg-primary/90">Add</button>
                  <button onClick={() => { setShowAddContact(false); setNewContact({}); }} className="px-3 py-1.5 bg-muted text-muted-foreground text-xs rounded-md">Cancel</button>
                </div>
              </div>
            )}
            {[...(prospect.contacts || [])].sort((a, b) => {
              const aStarred = starOverrides.has(a.id) ? starOverrides.get(a.id)! : !!a.starred;
              const bStarred = starOverrides.has(b.id) ? starOverrides.get(b.id)! : !!b.starred;
              return (bStarred ? 1 : 0) - (aStarred ? 1 : 0);
            }).map(c => {
              const isStarred = starOverrides.has(c.id) ? starOverrides.get(c.id)! : !!c.starred;
              return (
              <div key={c.id} className="p-2.5 border border-border rounded-lg group relative hover:border-primary/20 transition-colors">
                {editingContactId === c.id ? (
                  <div className="space-y-2.5 p-3 -m-2.5 bg-muted/30 rounded-lg border border-primary/20">
                    <div className="text-xs font-bold text-foreground uppercase tracking-wider mb-1">Edit Contact</div>
                    <input value={editContact.name || ""} onChange={e => setEditContact({...editContact, name: e.target.value})} placeholder="Name *" className={cn(inputClass, "text-sm py-2")} />
                    <input value={editContact.title || ""} onChange={e => setEditContact({...editContact, title: e.target.value})} placeholder="Title" className={cn(inputClass, "text-sm py-2")} />
                    <div className="grid grid-cols-2 gap-2">
                      <input value={editContact.email || ""} onChange={e => setEditContact({...editContact, email: e.target.value})} placeholder="Email" className={cn(inputClass, "text-sm py-2")} />
                      <input value={editContact.phone || ""} onChange={e => setEditContact({...editContact, phone: e.target.value})} placeholder="Phone" className={cn(inputClass, "text-sm py-2")} />
                    </div>
                    <input value={editContact.linkedinUrl || ""} onChange={e => setEditContact({...editContact, linkedinUrl: e.target.value})} placeholder="LinkedIn URL (e.g. linkedin.com/in/...)" className={cn(inputClass, "text-sm py-2")} />
                    <div className="grid grid-cols-2 gap-2">
                      <div className="space-y-1">
                        <label className="text-xs font-semibold text-muted-foreground uppercase">Role</label>
                        <select value={(editContact as any).role || "Unknown"} onChange={e => setEditContact({...editContact, role: e.target.value} as any)} className={cn(selectClass, "text-sm py-2")}>
                          {CONTACT_ROLES.map(r => <option key={r} value={r}>{r}</option>)}
                        </select>
                      </div>
                      <div className="space-y-1">
                        <label className="text-xs font-semibold text-muted-foreground uppercase">Relationship</label>
                        <select value={(editContact as any).relationshipStrength || "Unknown"} onChange={e => setEditContact({...editContact, relationshipStrength: e.target.value} as any)} className={cn(selectClass, "text-sm py-2")}>
                          {RELATIONSHIP_STRENGTHS.map(s => <option key={s} value={s}>{s}</option>)}
                        </select>
                      </div>
                    </div>
                    <RichTextEditor
                      content={editContact.notes || ""}
                      onChange={(html) => setEditContact({ ...editContact, notes: html })}
                      placeholder="Notes (e.g. met at conference, reports to VP)"
                      minHeight="110px"
                    />
                    <div className="flex gap-2 pt-1">
                      <button onClick={saveEditContact} className="px-4 py-2 bg-primary text-primary-foreground text-sm font-medium rounded-md hover:bg-primary/90">Save</button>
                      <button onClick={() => { setEditingContactId(null); setEditContact({}); }} className="px-4 py-2 bg-muted text-muted-foreground text-sm rounded-md hover:bg-muted/80">Cancel</button>
                    </div>
                  </div>
                ) : (
                  <div>
                    {/* Action buttons: star (always visible), edit + delete (hover) */}
                    <div className="absolute top-2 right-2 flex items-center gap-0.5">
                      <button
                        onClick={() => handleToggleStar(c.id, isStarred)}
                        className="p-0.5 rounded hover:bg-amber-100 dark:hover:bg-amber-900/30 transition-colors"
                        title={isStarred ? "Unstar" : "Star"}
                      >
                        <Star className={cn("w-3.5 h-3.5", isStarred ? "fill-amber-400 text-amber-400" : "text-muted-foreground")} />
                      </button>
                      <button
                        onClick={() => startEditContact(c)}
                        className="p-0.5 rounded hover:bg-primary/10 opacity-0 group-hover:opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity"
                        title="Edit contact"
                      >
                        <Pencil className="w-3 h-3 text-muted-foreground" />
                      </button>
                      <button
                        onClick={() => removeContact(c.id)}
                        className="p-0.5 rounded hover:bg-destructive/10 opacity-0 group-hover:opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity"
                        title="Delete contact"
                      >
                        <X className="w-3 h-3 text-destructive" />
                      </button>
                    </div>
                    <div className="flex items-center gap-1.5 flex-wrap pr-20">
                     <span className="font-semibold text-sm text-foreground select-text">{c.name}</span>
                      <RoleBadge role={c.role} />
                    </div>
                    {c.title && <div className="text-xs text-muted-foreground mt-0.5 select-text">{c.title}</div>}
                     <div className="mt-1"><StrengthDot strength={c.relationshipStrength} /></div>
                    {c.email && <a href={`mailto:${c.email}`} className="text-xs text-primary hover:underline flex items-center gap-1 mt-1 select-text"><Mail className="w-3 h-3" /> {c.email}</a>}
                    {c.phone && <div className="text-xs text-foreground/70 flex items-center gap-1 mt-0.5 select-text"><Phone className="w-3 h-3" /> {c.phone}</div>}
                    {c.linkedinUrl && <a href={c.linkedinUrl.startsWith("http") ? c.linkedinUrl : `https://${c.linkedinUrl}`} target="_blank" rel="noreferrer" className="text-xs text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1 mt-0.5 select-text"><Linkedin className="w-3 h-3" /> LinkedIn</a>}
                    {c.notes && (
                      <div className="mt-2 pt-2 border-t border-border flex gap-1.5 items-start">
                        <span className="text-xs leading-5 shrink-0">📝</span>
                        <SafeHTML
                          html={c.notes}
                          className="prose prose-sm dark:prose-invert max-w-none text-xs text-foreground/80 select-text [&_p]:my-1 [&_ul]:my-1 [&_ol]:my-1 [&_li]:my-0.5 [&_p:first-child]:mt-0 [&_p:last-child]:mb-0"
                        />
                      </div>
                    )}
                  </div>
                )}
              </div>
            ); })}
            {(prospect.contacts || []).length === 0 && !showAddContact && <p className="text-sm text-muted-foreground">No contacts yet.</p>}
          </div>
          </TabsContent>

          {/* TASKS TAB: Open tasks list (extracted from Log Activity) */}
          <TabsContent value="tasks" className="space-y-5 mt-0 animate-fade-in-up">
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Target className="w-4 h-4 text-primary" />
              <h3 className="text-sm font-bold text-foreground uppercase tracking-wider">Open Tasks</h3>
            </div>
            {(prospect.tasks || []).length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-6">No open tasks. Add one from the Activity tab.</p>
            ) : (
              <div className="space-y-1.5">
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
                          <span className="text-sm text-foreground">{task.text}</span>
                        </div>
                        {task.dueDate && (
                          <span className={cn("text-xs shrink-0", isOverdue ? "text-destructive font-semibold" : "text-muted-foreground")}>
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
          </TabsContent>
        </Tabs>

      {/* Account-level Email Draft Picker */}
      <ContactPickerDialog
        open={showDraftPicker}
        onOpenChange={setShowDraftPicker}
        prospects={[prospect]}
        signals={signals || []}
        onPromptGenerated={() => {
          setShowDraftPicker(false);
          onClose();
        }}
      />

      {/* Outreach Draft Dialog */}
      <Dialog open={showDraftDialog} onOpenChange={setShowDraftDialog}>
        <DialogContent className="sm:max-w-[520px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-primary" />
              Draft Outreach — {prospect.name}
            </DialogTitle>
          </DialogHeader>
          {outreachLoading ? (
            <div className="flex items-center justify-center gap-2 py-8">
              <Loader2 className="w-5 h-5 animate-spin text-primary" />
              <span className="text-sm text-muted-foreground">Generating draft...</span>
            </div>
          ) : outreachDraft ? (
            <div className="space-y-4">
              <div className="bg-muted/50 border border-border rounded-lg p-4 max-h-[400px] overflow-y-auto">
                <p className="text-sm text-foreground leading-relaxed whitespace-pre-wrap">{outreachDraft}</p>
              </div>
              <div className="flex items-center gap-2">
                <Button onClick={copyOutreach} size="sm" className="gap-1.5">
                  <Copy className="w-3.5 h-3.5" /> Copy to Clipboard
                </Button>
                <Button onClick={generateOutreach} size="sm" variant="outline" className="gap-1.5">
                  <RefreshCw className="w-3.5 h-3.5" /> Regenerate
                </Button>
              </div>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>

      {/* Meeting Prep Dialog */}
      <Dialog open={showMeetingPrepDialog} onOpenChange={setShowMeetingPrepDialog}>
        <DialogContent className="sm:max-w-[600px] max-h-[85vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="w-4 h-4 text-primary" />
              Meeting Prep — {prospect.name}
            </DialogTitle>
          </DialogHeader>
          {meetingPrepLoading ? (
            <div className="flex items-center justify-center gap-2 py-8">
              <Loader2 className="w-5 h-5 animate-spin text-primary" />
              <span className="text-sm text-muted-foreground">Generating meeting prep...</span>
            </div>
          ) : meetingPrepBrief ? (
            <div className="space-y-4 flex-1 min-h-0">
              <div className="bg-muted/50 border border-border rounded-lg p-4 overflow-y-auto max-h-[55vh]">
                <div className="text-sm text-foreground leading-relaxed whitespace-pre-wrap prose prose-sm dark:prose-invert max-w-none">{meetingPrepBrief}</div>
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                <Button onClick={copyMeetingPrep} size="sm" className="gap-1.5">
                  <Copy className="w-3.5 h-3.5" /> Copy to Clipboard
                </Button>
                <Button onClick={exportMeetingPrepPdf} size="sm" variant="outline" className="gap-1.5">
                  <FileText className="w-3.5 h-3.5" /> Export PDF
                </Button>
                <Button onClick={generateMeetingPrep} size="sm" variant="outline" className="gap-1.5">
                  <RefreshCw className="w-3.5 h-3.5" /> Regenerate
                </Button>
              </div>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>
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

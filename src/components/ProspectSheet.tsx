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
  CONTACT_ROLES, RELATIONSHIP_STRENGTHS,
  scoreProspect, scoreBreakdown, getScoreLabel, getLogoUrl,
  type Prospect, type Contact, type InteractionLog, type NoteEntry, type Task,
} from "@/data/prospects";
import { RoleBadge, StrengthDot } from "@/components/ContactBadges";
import { RichTextEditor } from "@/components/RichTextEditor";
import { AIReadinessCard } from "@/components/AIReadinessCard";
import { SignalsSection } from "@/components/SignalsSection";
import { type Signal } from "@/hooks/useSignals";
import { cn, normalizeUrl } from "@/lib/utils";
import {
  ExternalLink, Plus, X, Mail, Phone, Building2, MessageSquare, PhoneCall,
  Linkedin, Clock, CalendarIcon, Target, ArrowRight, Check, CheckCircle, Trash2,
  Sparkles, Copy, Loader2, RefreshCw, FileText,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { supabase } from "@/integrations/supabase/client";

interface ProspectSheetProps {
  prospectId: any;
  onClose: () => void;
  data: Prospect[];
  update: (id: any, u: Partial<Prospect>) => void;
  remove: (id: any) => void;
  deleteNote?: (prospectId: any, noteId: string) => void;
  signals?: Signal[];
  addSignal?: (signal: Omit<Signal, "id" | "created_at" | "user_id">) => Promise<Signal | null>;
  removeSignal?: (id: string) => Promise<void>;
  territoryId?: string | null;
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

export function ProspectSheet({ prospectId, onClose, data, update, remove, deleteNote, signals = [], addSignal, removeSignal, territoryId }: ProspectSheetProps) {
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const prospect = useMemo(() => data.find(p => p.id === prospectId), [data, prospectId]);
  const prospectSignals = useMemo(() => signals.filter(s => s.prospect_id === prospectId), [signals, prospectId]);

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
  const [showFollowUp, setShowFollowUp] = useState(false);
  // Outreach draft state
  const [outreachDraft, setOutreachDraft] = useState("");
  const [outreachLoading, setOutreachLoading] = useState(false);
  const [showDraftDialog, setShowDraftDialog] = useState(false);
  // Meeting prep state
  const [meetingPrepBrief, setMeetingPrepBrief] = useState("");
  const [meetingPrepLoading, setMeetingPrepLoading] = useState(false);
  const [showMeetingPrepDialog, setShowMeetingPrepDialog] = useState(false);

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
      role: (newContact as any).role || "Unknown", relationshipStrength: (newContact as any).relationshipStrength || "Unknown",
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
    setEditContact({ name: c.name, title: c.title, email: c.email, phone: c.phone, notes: c.notes, role: c.role, relationshipStrength: c.relationshipStrength } as any);
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

  const logActivity = () => {
    if (!interactionNotes.trim() && !showFollowUp) {
      toast.error("Add notes or a follow-up task");
      return;
    }
    const updates: Partial<Prospect> = {};
    // Log the interaction
    const interaction: InteractionLog = {
      id: Date.now().toString(), type: interactionType,
      date: new Date().toISOString().split("T")[0], notes: interactionNotes || `${interactionType} logged`,
    };
    updates.interactions = [...(prospect.interactions || []), interaction];
    // Optionally create follow-up task
    if (showFollowUp && newTaskText.trim()) {
      const task: Task = { id: (Date.now() + 1).toString(), text: newTaskText.trim(), dueDate: newTaskDate };
      updates.tasks = [...(prospect.tasks || []), task];
    }
    update(prospect.id, updates);
    setInteractionNotes("");
    setNewTaskText("");
    setNewTaskDate("");
    setShowFollowUp(false);
    toast.success(showFollowUp && newTaskText.trim() ? "📝 Activity logged + task created!" : "📝 Activity logged!");
  };

  const addNote = () => {
    // Strip HTML tags to check if there's actual text content
    const textOnly = newNote.replace(/<[^>]*>/g, "").trim();
    if (!textOnly) return;
    const entry: NoteEntry = { id: Date.now().toString(), text: newNote, timestamp: new Date().toISOString() };
    update(prospect.id, { noteLog: [...(prospect.noteLog || []), entry] });
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
      const apiKey = import.meta.env.VITE_ANTHROPIC_API_KEY;
      if (!apiKey) throw new Error("VITE_ANTHROPIC_API_KEY is not set. Add it to your .env file.");

      const contactLines = (prospect.contacts || [])
        .map(c => `- ${c.name}${c.title ? ` (${c.title})` : ""}${c.role && c.role !== "Unknown" ? ` — Role: ${c.role}` : ""}${c.relationshipStrength && c.relationshipStrength !== "Unknown" ? `, Relationship: ${c.relationshipStrength}` : ""}${c.notes ? ` | Notes: ${c.notes}` : ""}`)
        .join("\n") || "No contacts on file";

      const interactionLines = (prospect.interactions || [])
        .slice(-10).reverse()
        .map(i => `- ${i.date}: ${i.type}${i.notes ? ` — "${i.notes}"` : ""}`)
        .join("\n") || "No interactions logged";

      const taskLines = (prospect.tasks || [])
        .map(t => `- ${t.text}${t.dueDate ? ` (due: ${t.dueDate})` : ""}`)
        .join("\n") || "No open tasks";

      const noteLines = (prospect.noteLog || [])
        .slice(-5).reverse()
        .map(n => `- ${n.text}`)
        .join("\n") || "No notes";

      const userPrompt = `You are helping a Senior AE at Yext prepare for a meeting with a multi-location brand prospect. Generate a one-page meeting prep brief.

ACCOUNT DATA:
- Company: ${prospect.name}
- Website: ${prospect.website || "unknown"}
- Industry: ${prospect.industry || "unknown"}
- Location count: ${prospect.locationCount ?? "unknown"}
- Tier: ${prospect.tier || "untiered"}
- Priority: ${prospect.priority || "none"}
- Current competitor/solution: ${prospect.competitor || "none known"}
- Account score: ${score ?? "N/A"}/100

CONTACTS:
${contactLines}

RECENT INTERACTIONS (newest first):
${interactionLines}

OPEN TASKS:
${taskLines}

NOTES:
${noteLines}

Generate the brief with these sections:
1. **Situation Summary** — 2-3 sentences on who they are, where they stand, and why we're meeting
2. **Key Contacts & Roles** — Who matters, their role in the deal, relationship status
3. **Open Items & Risks** — Overdue tasks, gaps (missing decision maker?), competitive threats
4. **Recommended Talking Points** — 3-5 specific, insight-led points to drive the conversation. Position Yext around AI search visibility, multi-location brand consistency, and local SEO at scale.
5. **Suggested Ask** — The one thing to close on in this meeting (next step, intro, demo, etc.)

Keep it concise and actionable. Use bullet points. No fluff.`;

      const response = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": apiKey,
          "anthropic-version": "2023-06-01",
          "anthropic-dangerous-direct-browser-access": "true",
        },
        body: JSON.stringify({
          model: "claude-sonnet-4-20250514",
          max_tokens: 1024,
          system: "You are an elite B2B enterprise sales strategist. Generate concise, actionable meeting prep briefs that help AEs walk into meetings prepared and confident.",
          messages: [{ role: "user", content: userPrompt }],
        }),
      });

      if (!response.ok) {
        const errText = await response.text();
        console.error("[MeetingPrep] API error:", response.status, errText);
        throw new Error(`Anthropic API error: ${response.status}`);
      }

      const data = await response.json();
      const text = data.content?.[0]?.text?.trim();
      if (!text) throw new Error("Empty response from Anthropic API");
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
<div class="footer">Generated for Yext · ${prospect.industry || ""} · ${prospect.locationCount ? prospect.locationCount + " locations" : ""}</div>
</body></html>`);
    printWindow.document.close();
    setTimeout(() => { printWindow.print(); }, 300);
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
                  prospect.status === "Churned" ? "bg-destructive/15 text-destructive" : "bg-[hsl(var(--success))]/15 text-[hsl(var(--success))]"
                )}>{prospect.status === "Churned" ? "💀 Churned" : "🎯 Prospect"}</span>
                {prospect.tier && <span className={cn("px-2 py-0.5 text-xs font-bold rounded-md",
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
            <button onClick={generateOutreach} className="text-xs font-medium text-primary hover:underline inline-flex items-center gap-1 ml-4">
              <Sparkles className="w-3 h-3" /> Draft Outreach
            </button>
            <button onClick={generateMeetingPrep} className="text-xs font-medium text-primary hover:underline inline-flex items-center gap-1 ml-3">
              <FileText className="w-3 h-3" /> Meeting Prep
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="px-6 py-5 space-y-5">
          {/* Account Details */}
          <div className="space-y-3 animate-fade-in-up">
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
                  <option value="Prospect">🎯 Prospect</option>
                  <option value="Churned">💀 Churned</option>
                </select>
              </div>
            </div>
          </div>

          {/* Log Activity — unified widget */}
          <div className="space-y-3 animate-fade-in-up" style={{ animationDelay: "50ms" }}>
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

            {/* Open tasks list */}
            {(prospect.tasks || []).length > 0 && (
              <div className="space-y-1.5 pt-2 border-t border-border">
                <label className="text-xs font-semibold text-muted-foreground uppercase">Open Tasks</label>
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
          <div className="space-y-3 animate-fade-in-up" style={{ animationDelay: "100ms" }}>
            <h3 className="text-sm font-bold text-foreground uppercase tracking-wider">Notes</h3>
            <RichTextEditor
              content={newNote}
              onChange={setNewNote}
              placeholder="Add a note..."
              minHeight="60px"
            />
            <Button size="sm" onClick={addNote} disabled={!newNote.replace(/<[^>]*>/g, "").trim()}>Add Note</Button>
            {(prospect.noteLog || []).length > 0 && (
              <div className="space-y-2 max-h-40 overflow-y-auto">
                {[...(prospect.noteLog || [])].reverse().map(note => (
                  <div key={note.id} className="group p-2.5 rounded-lg bg-muted/50 border border-border relative">
                     <div className="text-sm text-foreground pr-6 prose prose-sm dark:prose-invert max-w-none [&_p]:my-0.5" dangerouslySetInnerHTML={{ __html: note.text }} />
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

          {/* Contacts */}
          <div className="space-y-3 animate-fade-in-up" style={{ animationDelay: "150ms" }}>
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
                    <div className="grid grid-cols-2 gap-2">
                      <div className="space-y-0.5">
                        <label className="text-xs font-semibold text-muted-foreground uppercase">Role</label>
                        <select value={(editContact as any).role || "Unknown"} onChange={e => setEditContact({...editContact, role: e.target.value} as any)} className={cn(selectClass, "text-xs py-1.5")}>
                          {CONTACT_ROLES.map(r => <option key={r} value={r}>{r}</option>)}
                        </select>
                      </div>
                      <div className="space-y-0.5">
                        <label className="text-xs font-semibold text-muted-foreground uppercase">Relationship</label>
                        <select value={(editContact as any).relationshipStrength || "Unknown"} onChange={e => setEditContact({...editContact, relationshipStrength: e.target.value} as any)} className={cn(selectClass, "text-xs py-1.5")}>
                          {RELATIONSHIP_STRENGTHS.map(s => <option key={s} value={s}>{s}</option>)}
                        </select>
                      </div>
                    </div>
                    <textarea value={editContact.notes || ""} onChange={e => setEditContact({...editContact, notes: e.target.value})} placeholder="Notes" className={cn(inputClass, "text-xs py-1.5 resize-none")} rows={2} />
                    <div className="flex gap-2">
                      <button onClick={saveEditContact} className="px-3 py-1.5 bg-primary text-primary-foreground text-xs rounded-md hover:bg-primary/90">Save</button>
                      <button onClick={() => { setEditingContactId(null); setEditContact({}); }} className="px-3 py-1.5 bg-muted text-muted-foreground text-xs rounded-md">Cancel</button>
                    </div>
                  </div>
                ) : (
                  <div onClick={() => startEditContact(c)} className="cursor-pointer">
                    <div className="flex items-center gap-1.5 flex-wrap">
                     <span className="font-semibold text-sm text-foreground">{c.name}</span>
                      <RoleBadge role={c.role} />
                    </div>
                    {c.title && <div className="text-xs text-muted-foreground mt-0.5">{c.title}</div>}
                     <div className="mt-1"><StrengthDot strength={c.relationshipStrength} /></div>
                    {c.email && <a href={`mailto:${c.email}`} onClick={e => e.stopPropagation()} className="text-xs text-primary hover:underline flex items-center gap-1 mt-1"><Mail className="w-3 h-3" /> {c.email}</a>}
                    {c.phone && <div className="text-xs text-foreground/70 flex items-center gap-1 mt-0.5"><Phone className="w-3 h-3" /> {c.phone}</div>}
                    {c.notes && <div className="text-xs text-foreground/70 mt-1.5 pt-1.5 border-t border-border italic">📝 {c.notes}</div>}
                  </div>
                )}
              </div>
            ))}
            {(prospect.contacts || []).length === 0 && !showAddContact && <p className="text-sm text-muted-foreground">No contacts yet.</p>}
          </div>

          {/* Signals */}
          {addSignal && removeSignal && (
            <div className="animate-fade-in-up" style={{ animationDelay: "170ms" }}>
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
          <div className="animate-fade-in-up" style={{ animationDelay: "180ms" }}>
            <AIReadinessCard prospect={prospect} onUpdate={update} compact />
          </div>

          {/* Activity Timeline */}
          <div className="space-y-3 animate-fade-in-up" style={{ animationDelay: "200ms" }}>
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

          {/* Location Notes */}
          {prospect.locationNotes && (
            <div className="space-y-2 animate-fade-in-up" style={{ animationDelay: "250ms" }}>
               <h3 className="text-sm font-bold text-foreground uppercase tracking-wider">Location Notes</h3>
              <p className="text-sm text-foreground/80 bg-muted/50 p-3 rounded-lg border border-border">{prospect.locationNotes}</p>
            </div>
          )}
        </div>

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
      <SheetContent side="right" className="w-full sm:w-[700px] sm:max-w-[50vw] overflow-y-auto p-0">
        {sheetContent}
      </SheetContent>
    </Sheet>
  );
}

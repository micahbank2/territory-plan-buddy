import { useState, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useProspects } from "@/hooks/useProspects";
import {
  INDUSTRIES,
  STAGES,
  PRIORITIES,
  TIERS,
  COMPETITORS,
  INTERACTION_TYPES,
  scoreProspect,
  type Contact,
  type InteractionLog,
} from "@/data/prospects";
import { cn } from "@/lib/utils";
import {
  ArrowLeft,
  ExternalLink,
  Trash2,
  Plus,
  X,
  User,
  Mail,
  Phone,
  Building2,
  MapPin,
  Star,
  MessageSquare,
} from "lucide-react";

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

  if (!ok) return <div className="flex items-center justify-center h-screen text-muted-foreground">Loading...</div>;
  if (!prospect) return <div className="flex items-center justify-center h-screen text-muted-foreground">Prospect not found</div>;

  const score = scoreProspect(prospect);

  const handleUpdate = (field: string, value: any) => {
    update(prospect.id, { [field]: value });
  };

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
  };

  const removeContact = (contactId: string) => {
    update(prospect.id, { contacts: (prospect.contacts || []).filter((c) => c.id !== contactId) });
  };

  const logInteraction = () => {
    if (!interactionNotes.trim()) return;
    const interaction: InteractionLog = {
      id: Date.now().toString(),
      type: interactionType,
      date: new Date().toISOString().split("T")[0],
      notes: interactionNotes,
    };
    update(prospect.id, { interactions: [...(prospect.interactions || []), interaction] });
    setInteractionNotes("");
  };

  const handleDelete = () => {
    if (confirm(`Delete "${prospect.name}" permanently?`)) {
      remove(prospect.id);
      navigate("/");
    }
  };

  const Field = ({ label, children }: { label: string; children: React.ReactNode }) => (
    <div className="space-y-1">
      <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">{label}</label>
      {children}
    </div>
  );

  const inputClass = "w-full px-3 py-2 text-sm rounded-lg border border-border bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-ring placeholder:text-muted-foreground";
  const selectClass = "w-full px-3 py-2 text-sm rounded-lg border border-border bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-ring appearance-none cursor-pointer";

  return (
    <div className="bg-background min-h-screen">
      {/* Header */}
      <header className="border-b border-border px-6 py-3 bg-card flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button onClick={() => navigate("/")} className="p-1.5 rounded-md hover:bg-accent transition-colors">
            <ArrowLeft className="w-4 h-4 text-muted-foreground" />
          </button>
          <div>
            <div className="flex items-center gap-2.5">
              <h1 className="text-lg font-bold text-foreground">{prospect.name}</h1>
              {prospect.status === "Churned" && (
                <span className="px-2 py-0.5 text-xs font-bold rounded-md bg-red-100 text-red-700 uppercase">
                  Churned
                </span>
              )}
              {prospect.status === "Prospect" && (
                <span className="px-2 py-0.5 text-xs font-bold rounded-md bg-emerald-100 text-emerald-700 uppercase">
                  Prospect
                </span>
              )}
              {prospect.competitor && (
                <span className="px-2 py-0.5 text-xs font-bold rounded-md bg-amber-100 text-amber-800">
                  Now w/ {prospect.competitor}
                </span>
              )}
              {prospect.tier && (
                <span className={cn(
                  "px-2 py-0.5 text-xs font-semibold rounded-md",
                  prospect.tier === "Tier 1" ? "bg-primary/10 text-primary" :
                  prospect.tier === "Tier 2" ? "bg-violet-100 text-violet-700" :
                  "bg-muted text-muted-foreground"
                )}>
                  {prospect.tier}
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
          <div className="text-center px-4">
            <div className="text-[10px] text-muted-foreground uppercase">Score</div>
            <div className={cn(
              "text-2xl font-black",
              score >= 40 ? "text-emerald-600" : score >= 20 ? "text-primary" : "text-muted-foreground"
            )}>
              {score}
            </div>
          </div>
          <button onClick={handleDelete} className="p-2 rounded-md text-red-500 hover:bg-red-50 transition-colors" title="Delete prospect">
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </header>

      <div className="max-w-5xl mx-auto p-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left: Details */}
          <div className="lg:col-span-2 space-y-6">
            {/* Account Info */}
            <div className="bg-card rounded-xl border border-border p-5 space-y-4">
              <h2 className="text-sm font-semibold text-foreground">Account Details</h2>
              <div className="grid grid-cols-2 gap-4">
                <Field label="Locations">
                  <input type="number" value={prospect.locationCount || ""} onChange={(e) => handleUpdate("locationCount", e.target.value ? parseInt(e.target.value) : null)} className={inputClass} placeholder="# of locations" />
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
                  <select value={prospect.competitor} onChange={(e) => handleUpdate("competitor", e.target.value)} className={selectClass}>
                    {COMPETITORS.map((c) => <option key={c} value={c}>{c || "None"}</option>)}
                  </select>
                </Field>
                <Field label="Est. Revenue ($)">
                  <input type="number" value={prospect.estimatedRevenue || ""} onChange={(e) => handleUpdate("estimatedRevenue", e.target.value ? parseInt(e.target.value) : null)} className={inputClass} placeholder="Revenue estimate" />
                </Field>
                <Field label="Status">
                  <select value={prospect.status} onChange={(e) => handleUpdate("status", e.target.value)} className={selectClass}>
                    <option value="Prospect">Prospect</option>
                    <option value="Churned">Churned</option>
                  </select>
                </Field>
              </div>
            </div>

            {/* Notes */}
            <div className="bg-card rounded-xl border border-border p-5 space-y-4">
              <h2 className="text-sm font-semibold text-foreground">Notes</h2>
              <textarea
                value={prospect.notes || ""}
                onChange={(e) => handleUpdate("notes", e.target.value)}
                rows={4}
                className={cn(inputClass, "resize-y")}
                placeholder="Add notes about this prospect..."
              />
              <Field label="Location Source / Notes">
                <textarea
                  value={prospect.locationNotes || ""}
                  onChange={(e) => handleUpdate("locationNotes", e.target.value)}
                  rows={2}
                  className={cn(inputClass, "resize-y")}
                  placeholder="Where did the location data come from?"
                />
              </Field>
            </div>

            {/* Log Interaction */}
            <div className="bg-card rounded-xl border border-border p-5 space-y-3">
              <h2 className="text-sm font-semibold text-foreground">Log Interaction</h2>
              <div className="flex gap-3">
                <select value={interactionType} onChange={(e) => setInteractionType(e.target.value)} className={cn(selectClass, "w-40")}>
                  {INTERACTION_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
                </select>
                <input
                  value={interactionNotes}
                  onChange={(e) => setInteractionNotes(e.target.value)}
                  placeholder="What happened?"
                  className={cn(inputClass, "flex-1")}
                  onKeyDown={(e) => e.key === "Enter" && logInteraction()}
                />
                <button onClick={logInteraction} className="px-4 py-2 bg-primary text-primary-foreground text-xs font-medium rounded-lg hover:bg-primary/90 transition-colors">
                  Log
                </button>
              </div>
              {(prospect.interactions || []).length > 0 && (
                <div className="space-y-2 mt-3">
                  {[...(prospect.interactions || [])].reverse().map((i) => (
                    <div key={i.id} className="flex items-start gap-3 py-2 border-b border-border last:border-0">
                      <div className={cn(
                        "px-2 py-0.5 rounded text-[10px] font-semibold shrink-0 mt-0.5",
                        i.type === "Email" ? "bg-blue-100 text-blue-700" :
                        i.type === "Call" ? "bg-emerald-100 text-emerald-700" :
                        "bg-violet-100 text-violet-700"
                      )}>
                        {i.type}
                      </div>
                      <div className="flex-1">
                        <div className="text-xs text-foreground">{i.notes}</div>
                        <div className="text-[10px] text-muted-foreground mt-0.5">{i.date}</div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Right: Contacts + Meta */}
          <div className="space-y-6">
            {/* Contacts */}
            <div className="bg-card rounded-xl border border-border p-5">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-sm font-semibold text-foreground">Contacts</h2>
                <button onClick={() => setShowAddContact(true)} className="p-1 rounded-md hover:bg-accent transition-colors">
                  <Plus className="w-4 h-4 text-primary" />
                </button>
              </div>

              {showAddContact && (
                <div className="space-y-2 mb-4 p-3 border border-border rounded-lg bg-muted/30">
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
                  <div key={c.id} className="p-3 border border-border rounded-lg group relative">
                    <button onClick={() => removeContact(c.id)} className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity p-0.5 rounded hover:bg-destructive/10">
                      <X className="w-3 h-3 text-destructive" />
                    </button>
                    <div className="font-medium text-xs text-foreground">{c.name}</div>
                    {c.title && <div className="text-[10px] text-muted-foreground">{c.title}</div>}
                    {c.email && (
                      <a href={`mailto:${c.email}`} className="text-[10px] text-primary hover:underline flex items-center gap-1 mt-1">
                        <Mail className="w-2.5 h-2.5" /> {c.email}
                      </a>
                    )}
                    {c.phone && (
                      <div className="text-[10px] text-muted-foreground flex items-center gap-1 mt-0.5">
                        <Phone className="w-2.5 h-2.5" /> {c.phone}
                      </div>
                    )}
                    {c.notes && <div className="text-[10px] text-muted-foreground mt-1 italic">{c.notes}</div>}
                  </div>
                ))}
              </div>
            </div>

            {/* Metadata */}
            <div className="bg-card rounded-xl border border-border p-5 space-y-2">
              <h2 className="text-sm font-semibold text-foreground mb-3">Details</h2>
              <div className="text-xs text-muted-foreground">Owner: <span className="text-foreground">{prospect.transitionOwner || "—"}</span></div>
              <div className="text-xs text-muted-foreground">Modified: <span className="text-foreground">{prospect.lastModified || "—"}</span></div>
              {prospect.lastTouched && <div className="text-xs text-muted-foreground">Last Touched: <span className="text-foreground">{prospect.lastTouched}</span></div>}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

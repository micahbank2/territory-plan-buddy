import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import {
  INDUSTRIES, COMPETITORS, TIERS,
  getLogoUrl, type Prospect, type Contact,
} from "@/data/prospects";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Card, CardContent } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import {
  X, ChevronLeft, ChevronRight, ExternalLink, Linkedin,
  Search as SearchIcon, Globe, UserPlus, ChevronDown, PartyPopper, Sparkles,
} from "lucide-react";

const PRIORITIES = ["Hot", "Warm", "Cold", "Dead"];

interface Props {
  prospects: Prospect[];
  onUpdate: (id: any, changes: Partial<Prospect>) => Promise<void>;
  onClose: () => void;
}

function completenessScore(p: Prospect): number {
  const fields = [
    !!p.industry,
    p.locationCount != null && p.locationCount > 0,
    !!p.priority,
    !!p.tier,
    !!p.competitor,
    p.contacts && p.contacts.length > 0,
  ];
  return fields.filter(Boolean).length / fields.length;
}

function missingFields(p: Prospect) {
  return {
    industry: !p.industry,
    locationCount: p.locationCount == null || p.locationCount === 0,
    priority: !p.priority,
    tier: !p.tier,
    competitor: !p.competitor,
    contacts: !p.contacts || p.contacts.length === 0,
  };
}

export function EnrichmentQueue({ prospects, onUpdate, onClose }: Props) {
  const [showAll, setShowAll] = useState(false);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [sessionCount, setSessionCount] = useState(0);
  const [sessionStart] = useState(Date.now());
  const [elapsed, setElapsed] = useState(0);
  const [celebrated, setCelebrated] = useState<Set<number>>(new Set());

  // Form state
  const [industry, setIndustry] = useState("");
  const [locationCount, setLocationCount] = useState("");
  const [priority, setPriority] = useState("");
  const [tier, setTier] = useState("");
  const [competitor, setCompetitor] = useState("");
  const [notes, setNotes] = useState("");
  const [showContact, setShowContact] = useState(false);
  const [contactName, setContactName] = useState("");
  const [contactTitle, setContactTitle] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [contactPhone, setContactPhone] = useState("");
  const [saving, setSaving] = useState(false);

  const formRef = useRef<HTMLDivElement>(null);

  // Timer
  useEffect(() => {
    const iv = setInterval(() => setElapsed(Math.floor((Date.now() - sessionStart) / 1000)), 1000);
    return () => clearInterval(iv);
  }, [sessionStart]);

  // Build queue
  const queue = useMemo(() => {
    const sorted = [...prospects].sort((a, b) => {
      const sa = completenessScore(a);
      const sb = completenessScore(b);
      if (sa !== sb) return sa - sb;
      return (b.locationCount || 0) - (a.locationCount || 0);
    });
    if (showAll) return sorted;
    return sorted.filter((p) => completenessScore(p) < 1);
  }, [prospects, showAll]);

  const enrichedCount = useMemo(() => prospects.filter((p) => completenessScore(p) >= 1).length, [prospects]);
  const completenessPercent = prospects.length > 0 ? Math.round((enrichedCount / prospects.length) * 100) : 0;

  const current = queue[currentIdx] || null;

  // Reset form when prospect changes
  useEffect(() => {
    setIndustry("");
    setLocationCount("");
    setPriority("");
    setTier("");
    setCompetitor("");
    setNotes("");
    setShowContact(false);
    setContactName("");
    setContactTitle("");
    setContactEmail("");
    setContactPhone("");
    formRef.current?.scrollTo(0, 0);
  }, [current?.id]);

  // Celebrate milestones
  useEffect(() => {
    const pct = completenessPercent;
    [50, 75, 100].forEach((milestone) => {
      if (pct >= milestone && !celebrated.has(milestone)) {
        setCelebrated((prev) => new Set([...prev, milestone]));
        if (milestone === 100) {
          toast.success("🎉 All accounts enriched! Your territory is fully complete.", { duration: 5000 });
        } else {
          toast.success(`🎉 ${milestone}% territory completeness reached!`, { duration: 3000 });
        }
      }
    });
  }, [completenessPercent, celebrated]);

  // Keyboard shortcuts
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey) {
        if (e.key === "Enter") { e.preventDefault(); handleSaveNext(); }
        else if (e.key === "ArrowRight") { e.preventDefault(); handleSkip(); }
        else if (e.key === "ArrowLeft") { e.preventDefault(); handleBack(); }
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [currentIdx, current]);

  const handleSaveNext = useCallback(async () => {
    if (!current || saving) return;
    setSaving(true);

    const changes: Partial<Prospect> = {};
    if (industry) changes.industry = industry;
    if (locationCount) changes.locationCount = parseInt(locationCount, 10) || null;
    if (priority) changes.priority = priority;
    if (tier) changes.tier = tier;
    if (competitor) changes.competitor = competitor;
    if (notes) {
      const existingNotes = current.notes || "";
      changes.notes = existingNotes ? `${existingNotes}\n${notes}` : notes;
    }

    // Add contact if filled
    if (contactName || contactEmail) {
      const newContact: Contact = {
        id: crypto.randomUUID(),
        name: contactName,
        title: contactTitle,
        email: contactEmail,
        phone: contactPhone,
        notes: "",
      };
      changes.contacts = [...(current.contacts || []), newContact];
    }

    if (Object.keys(changes).length > 0) {
      await onUpdate(current.id, changes);
      setSessionCount((c) => c + 1);
      toast.success(`Enriched "${current.name}"`);
    }

    setSaving(false);

    if (currentIdx < queue.length - 1) {
      setCurrentIdx((i) => i + 1);
    } else {
      toast.success("🏁 You've reached the end of the queue!", { duration: 4000 });
    }
  }, [current, saving, industry, locationCount, priority, tier, competitor, notes, contactName, contactTitle, contactEmail, contactPhone, currentIdx, queue.length, onUpdate]);

  const handleSkip = useCallback(() => {
    if (currentIdx < queue.length - 1) setCurrentIdx((i) => i + 1);
  }, [currentIdx, queue.length]);

  const handleBack = useCallback(() => {
    if (currentIdx > 0) setCurrentIdx((i) => i - 1);
  }, [currentIdx]);

  const formatTime = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m}:${sec.toString().padStart(2, "0")}`;
  };

  if (queue.length === 0 && !showAll) {
    return (
      <div className="fixed inset-0 z-50 bg-background flex flex-col items-center justify-center gap-6">
        <PartyPopper className="w-16 h-16 text-primary" />
        <h2 className="text-2xl font-bold text-foreground">All accounts are fully enriched!</h2>
        <p className="text-muted-foreground">Your territory data quality is at 100%.</p>
        <div className="flex gap-3">
          <Button variant="outline" onClick={() => setShowAll(true)}>Review All</Button>
          <Button onClick={onClose}>Exit</Button>
        </div>
      </div>
    );
  }

  const missing = current ? missingFields(current) : null;

  return (
    <div className="fixed inset-0 z-50 bg-background flex flex-col overflow-hidden">
      {/* Stats Bar */}
      <div className="border-b border-border bg-card px-4 py-3 shrink-0">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-start sm:items-center gap-3">
          <div className="flex items-center gap-3 w-full sm:w-auto">
            <Sparkles className="w-5 h-5 text-primary shrink-0" />
            <h1 className="text-lg font-bold text-foreground">Enrichment Queue</h1>
          </div>
          <div className="flex-1 flex flex-col sm:flex-row items-start sm:items-center gap-3 w-full">
            <div className="flex items-center gap-4 text-sm text-muted-foreground">
              <span><strong className="text-foreground">{prospects.length}</strong> total</span>
              <span><strong className="text-[hsl(var(--success))]">{enrichedCount}</strong> enriched</span>
              <span><strong className="text-foreground">{prospects.length - enrichedCount}</strong> remaining</span>
            </div>
            <div className="flex-1 min-w-[120px]">
              <div className="flex items-center gap-2">
                <Progress value={completenessPercent} className="h-2 flex-1" />
                <span className="text-xs font-semibold text-foreground w-10 text-right">{completenessPercent}%</span>
              </div>
            </div>
            <div className="flex items-center gap-4 text-xs text-muted-foreground">
              <span>Session: <strong className="text-foreground">{sessionCount}</strong> enriched</span>
              <span>{formatTime(elapsed)}</span>
            </div>
          </div>
          <div className="flex items-center gap-3 shrink-0">
            <div className="flex items-center gap-2">
              <Switch id="show-all" checked={showAll} onCheckedChange={setShowAll} />
              <Label htmlFor="show-all" className="text-xs text-muted-foreground cursor-pointer">Show all</Label>
            </div>
            <Button variant="ghost" size="sm" onClick={onClose} className="gap-1">
              <X className="w-4 h-4" /> Exit
            </Button>
          </div>
        </div>
      </div>

      {/* Main content */}
      {current ? (
        <div className="flex-1 overflow-auto">
          <div className="max-w-6xl mx-auto p-4 sm:p-6">
            {/* Position indicator */}
            <div className="flex items-center justify-between mb-4">
              <span className="text-sm text-muted-foreground">
                Account {currentIdx + 1} of {queue.length}
              </span>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" onClick={handleBack} disabled={currentIdx === 0}>
                  <ChevronLeft className="w-4 h-4" />
                </Button>
                <Button variant="outline" size="sm" onClick={handleSkip} disabled={currentIdx >= queue.length - 1}>
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
              {/* Left: Company info (40%) */}
              <div className="lg:col-span-2 space-y-4">
                <Card className="border-border">
                  <CardContent className="p-5 space-y-4">
                    {/* Company header */}
                    <div className="flex items-center gap-3">
                      {current.website && (
                        <img
                          src={current.customLogo || getLogoUrl(current.website)}
                          alt=""
                          className="w-10 h-10 rounded-md bg-muted object-contain"
                          onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
                        />
                      )}
                      <div>
                        <h2 className="text-xl font-bold text-foreground">{current.name}</h2>
                        {current.website && (
                          <a
                            href={current.website.startsWith("http") ? current.website : `https://${current.website}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-sm text-primary hover:underline flex items-center gap-1"
                          >
                            {current.website} <ExternalLink className="w-3 h-3" />
                          </a>
                        )}
                      </div>
                    </div>

                    {/* Existing data badges */}
                    <div className="flex flex-wrap gap-2">
                      {current.industry && (
                        <Badge variant="secondary" className="text-xs">{current.industry}</Badge>
                      )}
                      {current.locationCount != null && current.locationCount > 0 && (
                        <Badge variant="secondary" className="text-xs">{current.locationCount} locations</Badge>
                      )}
                      {current.priority && (
                        <Badge variant="secondary" className="text-xs">{current.priority}</Badge>
                      )}
                      {current.tier && (
                        <Badge variant="secondary" className="text-xs">{current.tier}</Badge>
                      )}
                      {current.competitor && (
                        <Badge variant="secondary" className="text-xs">vs {current.competitor}</Badge>
                      )}
                      {current.contacts && current.contacts.length > 0 && (
                        <Badge variant="secondary" className="text-xs">{current.contacts.length} contact{current.contacts.length > 1 ? "s" : ""}</Badge>
                      )}
                      {current.status && current.status !== "Prospect" && (
                        <Badge variant="outline" className="text-xs">{current.status}</Badge>
                      )}
                      {current.outreach && current.outreach !== "Not Started" && (
                        <Badge variant="outline" className="text-xs">{current.outreach}</Badge>
                      )}
                    </div>

                    {/* Completeness */}
                    <div className="space-y-1">
                      <div className="flex justify-between text-xs text-muted-foreground">
                        <span>Completeness</span>
                        <span>{Math.round(completenessScore(current) * 100)}%</span>
                      </div>
                      <Progress value={completenessScore(current) * 100} className="h-1.5" />
                    </div>

                    {/* Research Links */}
                    <div className="space-y-2 pt-2 border-t border-border">
                      <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Research Links</span>
                      <div className="flex flex-wrap gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          className="gap-1.5 text-xs"
                          onClick={() => window.open(`https://www.linkedin.com/search/results/companies/?keywords=${encodeURIComponent(current.name)}`, "_blank")}
                        >
                          <Linkedin className="w-3.5 h-3.5" /> LinkedIn
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          className="gap-1.5 text-xs"
                          onClick={() => window.open(`https://www.google.com/search?q=${encodeURIComponent(current.name)}`, "_blank")}
                        >
                          <SearchIcon className="w-3.5 h-3.5" /> Google
                        </Button>
                        {current.website && (
                          <Button
                            variant="outline"
                            size="sm"
                            className="gap-1.5 text-xs"
                            onClick={() => window.open(current.website.startsWith("http") ? current.website : `https://${current.website}`, "_blank")}
                          >
                            <Globe className="w-3.5 h-3.5" /> Website
                          </Button>
                        )}
                      </div>
                    </div>

                    {/* Existing notes */}
                    {current.notes && (
                      <div className="space-y-1 pt-2 border-t border-border">
                        <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Existing Notes</span>
                        <p className="text-sm text-foreground whitespace-pre-wrap">{current.notes}</p>
                      </div>
                    )}

                    {/* Existing contacts */}
                    {current.contacts && current.contacts.length > 0 && (
                      <div className="space-y-2 pt-2 border-t border-border">
                        <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Contacts</span>
                        {current.contacts.map((c) => (
                          <div key={c.id} className="text-sm bg-muted/50 rounded-md p-2">
                            <div className="font-medium text-foreground">{c.name}</div>
                            {c.title && <div className="text-muted-foreground text-xs">{c.title}</div>}
                            {c.email && <div className="text-muted-foreground text-xs">{c.email}</div>}
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>

              {/* Right: Edit form (60%) */}
              <div className="lg:col-span-3" ref={formRef}>
                <Card className="border-border">
                  <CardContent className="p-5 space-y-4">
                    <h3 className="text-sm font-semibold text-foreground">Fill Missing Fields</h3>

                    {missing && !missing.industry && !missing.locationCount && !missing.priority && !missing.tier && !missing.competitor && !missing.contacts ? (
                      <p className="text-sm text-muted-foreground">All fields are filled! You can still add notes or contacts below.</p>
                    ) : null}

                    {missing?.industry && (
                      <div className="space-y-1.5">
                        <Label className="text-xs text-muted-foreground">Industry</Label>
                        <Select value={industry} onValueChange={setIndustry}>
                          <SelectTrigger className="bg-background">
                            <SelectValue placeholder="Select industry..." />
                          </SelectTrigger>
                          <SelectContent className="max-h-64">
                            {INDUSTRIES.map((i) => (
                              <SelectItem key={i} value={i}>{i}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    )}

                    {missing?.locationCount && (
                      <div className="space-y-1.5">
                        <Label className="text-xs text-muted-foreground">Location Count</Label>
                        <Input
                          type="number"
                          placeholder="Number of locations..."
                          value={locationCount}
                          onChange={(e) => setLocationCount(e.target.value)}
                          className="bg-background"
                        />
                      </div>
                    )}

                    {missing?.priority && (
                      <div className="space-y-1.5">
                        <Label className="text-xs text-muted-foreground">Priority</Label>
                        <Select value={priority} onValueChange={setPriority}>
                          <SelectTrigger className="bg-background">
                            <SelectValue placeholder="Select priority..." />
                          </SelectTrigger>
                          <SelectContent>
                            {PRIORITIES.map((p) => (
                              <SelectItem key={p} value={p}>{p}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    )}

                    {missing?.tier && (
                      <div className="space-y-1.5">
                        <Label className="text-xs text-muted-foreground">Tier</Label>
                        <Select value={tier} onValueChange={setTier}>
                          <SelectTrigger className="bg-background">
                            <SelectValue placeholder="Select tier..." />
                          </SelectTrigger>
                          <SelectContent>
                            {TIERS.filter(Boolean).map((t) => (
                              <SelectItem key={t} value={t}>{t}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    )}

                    {missing?.competitor && (
                      <div className="space-y-1.5">
                        <Label className="text-xs text-muted-foreground">Competitor</Label>
                        <Select value={competitor} onValueChange={setCompetitor}>
                          <SelectTrigger className="bg-background">
                            <SelectValue placeholder="Select competitor..." />
                          </SelectTrigger>
                          <SelectContent>
                            {COMPETITORS.filter(Boolean).map((c) => (
                              <SelectItem key={c} value={c}>{c}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    )}

                    {/* Add Contact */}
                    <Collapsible open={showContact} onOpenChange={setShowContact}>
                      <CollapsibleTrigger asChild>
                        <Button variant="outline" size="sm" className="gap-1.5 w-full justify-start text-xs">
                          <UserPlus className="w-3.5 h-3.5" />
                          Add Contact
                          <ChevronDown className={cn("w-3.5 h-3.5 ml-auto transition-transform", showContact && "rotate-180")} />
                        </Button>
                      </CollapsibleTrigger>
                      <CollapsibleContent className="pt-3 space-y-3">
                        <div className="grid grid-cols-2 gap-3">
                          <div className="space-y-1">
                            <Label className="text-xs text-muted-foreground">Name</Label>
                            <Input placeholder="Contact name" value={contactName} onChange={(e) => setContactName(e.target.value)} className="bg-background" />
                          </div>
                          <div className="space-y-1">
                            <Label className="text-xs text-muted-foreground">Title</Label>
                            <Input placeholder="Job title" value={contactTitle} onChange={(e) => setContactTitle(e.target.value)} className="bg-background" />
                          </div>
                          <div className="space-y-1">
                            <Label className="text-xs text-muted-foreground">Email</Label>
                            <Input type="email" placeholder="Email" value={contactEmail} onChange={(e) => setContactEmail(e.target.value)} className="bg-background" />
                          </div>
                          <div className="space-y-1">
                            <Label className="text-xs text-muted-foreground">Phone</Label>
                            <Input placeholder="Phone" value={contactPhone} onChange={(e) => setContactPhone(e.target.value)} className="bg-background" />
                          </div>
                        </div>
                      </CollapsibleContent>
                    </Collapsible>

                    {/* Notes */}
                    <div className="space-y-1.5">
                      <Label className="text-xs text-muted-foreground">Notes (appended to existing)</Label>
                      <Textarea
                        placeholder="Add any research intel..."
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                        rows={3}
                        className="bg-background resize-none"
                      />
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-3 pt-3 border-t border-border">
                      <Button onClick={handleSaveNext} disabled={saving} className="gap-1.5 flex-1">
                        {saving ? "Saving..." : "Save & Next"}
                        <span className="text-xs opacity-60 hidden sm:inline">(Ctrl+Enter)</span>
                      </Button>
                      <Button
                        variant="outline"
                        onClick={handleSkip}
                        disabled={currentIdx >= queue.length - 1}
                        className="gap-1.5"
                      >
                        Skip
                        <span className="text-xs opacity-60 hidden sm:inline">(Ctrl+→)</span>
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center space-y-4">
            <PartyPopper className="w-12 h-12 text-primary mx-auto" />
            <p className="text-lg font-medium text-foreground">Queue complete!</p>
            <Button onClick={onClose}>Exit</Button>
          </div>
        </div>
      )}
    </div>
  );
}

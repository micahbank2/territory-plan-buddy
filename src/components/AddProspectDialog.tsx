import { useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  INDUSTRIES,
  TIERS,
  COMPETITORS,
} from "@/data/prospects";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Sparkles, Loader2, CheckCircle2, AlertTriangle, Copy, Users } from "lucide-react";
import { toast } from "sonner";
import { Progress } from "@/components/ui/progress";

interface EnrichmentResult {
  industry: string;
  estimated_locations: number | null;
  company_summary: string;
  likely_competitor: string;
  suggested_tier: string;
  key_contacts_to_find: string[];
}

interface AddProspectDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAdd: (fields: any) => Promise<string | undefined>;
  onAddNote: (prospectId: string, text: string) => Promise<void>;
  existingNames: string[];
  inputClass: string;
  selectClass: string;
}

type Step = "input" | "enriching" | "review" | "basic";

function stringSimilarity(a: string, b: string): number {
  const al = a.toLowerCase(), bl = b.toLowerCase();
  if (al === bl) return 1;
  const bigrams = (s: string) => {
    const r = new Set<string>();
    for (let i = 0; i < s.length - 1; i++) r.add(s.slice(i, i + 2));
    return r;
  };
  const sa = bigrams(al), sb = bigrams(bl);
  let inter = 0;
  sa.forEach((b) => { if (sb.has(b)) inter++; });
  return sa.size + sb.size === 0 ? 0 : (2 * inter) / (sa.size + sb.size);
}

export function AddProspectDialog({
  open,
  onOpenChange,
  onAdd,
  onAddNote,
  existingNames,
  inputClass,
  selectClass,
}: AddProspectDialogProps) {
  const [step, setStep] = useState<Step>("input");
  const [name, setName] = useState("");
  const [website, setWebsite] = useState("");
  const [duplicateWarning, setDuplicateWarning] = useState<string | null>(null);

  // Enrichment results
  const [industry, setIndustry] = useState("");
  const [locs, setLocs] = useState("");
  const [tier, setTier] = useState("");
  const [competitor, setCompetitor] = useState("");
  const [status, setStatus] = useState("Prospect");
  const [summary, setSummary] = useState("");
  const [contacts, setContacts] = useState<string[]>([]);
  const [progress, setProgress] = useState(0);

  const reset = useCallback(() => {
    setStep("input");
    setName("");
    setWebsite("");
    setIndustry("");
    setLocs("");
    setTier("");
    setCompetitor("");
    setStatus("Prospect");
    setSummary("");
    setContacts([]);
    setDuplicateWarning(null);
    setProgress(0);
  }, []);

  const handleOpenChange = (open: boolean) => {
    if (!open) reset();
    onOpenChange(open);
  };

  const checkDuplicates = (val: string) => {
    setName(val);
    if (val.trim().length >= 3) {
      const match = existingNames.find((n) => stringSimilarity(n, val.trim()) > 0.6);
      setDuplicateWarning(match ? `Similar to existing: "${match}"` : null);
    } else {
      setDuplicateWarning(null);
    }
  };

  const handleEnrich = async () => {
    if (!name.trim()) return;
    setStep("enriching");
    setProgress(10);

    let wikidataDesc = "";
    let wikidataWebsite = "";

    try {
      // Call 1: Wikidata
      setProgress(20);
      try {
        const searchRes = await fetch(
          `https://www.wikidata.org/w/api.php?action=wbsearchentities&search=${encodeURIComponent(name.trim())}&language=en&format=json&limit=3&type=item&origin=*`
        );
        const searchData = await searchRes.json();
        const entity = searchData?.search?.[0];
        if (entity) {
          wikidataDesc = entity.description || "";
          // Fetch entity details for website
          const entityRes = await fetch(
            `https://www.wikidata.org/w/api.php?action=wbgetentities&ids=${entity.id}&props=claims|descriptions&languages=en&format=json&origin=*`
          );
          const entityData = await entityRes.json();
          const claims = entityData?.entities?.[entity.id]?.claims;
          // P856 = official website
          const webClaim = claims?.P856?.[0]?.mainsnak?.datavalue?.value;
          if (webClaim) wikidataWebsite = webClaim;
        }
      } catch {
        // Wikidata failed, continue
      }

      setProgress(50);

      // Call 2: AI enrichment via edge function
      try {
        const { data: aiData, error: aiError } = await supabase.functions.invoke("enrich-prospect-add", {
          body: {
            companyName: name.trim(),
            website: website.trim() || wikidataWebsite || "unknown",
            wikidataDescription: wikidataDesc || "none",
          },
        });

        setProgress(90);

        if (!aiError && aiData && !aiData.error) {
          const result = aiData as EnrichmentResult;
          setIndustry(result.industry || "");
          setLocs(result.estimated_locations ? String(result.estimated_locations) : "");
          setTier(result.suggested_tier || "");
          setCompetitor(result.likely_competitor || "");
          setSummary(result.company_summary || "");
          setContacts(result.key_contacts_to_find || []);
          if (!website.trim() && wikidataWebsite) setWebsite(wikidataWebsite);
          setProgress(100);
          setStep("review");
          return;
        }
      } catch {
        // AI failed
      }

      // Fallback to basic form
      if (!website.trim() && wikidataWebsite) setWebsite(wikidataWebsite);
      setStep("basic");
      toast.info("Auto-enrichment unavailable. Fill in details manually.");
    } catch {
      setStep("basic");
      toast.info("Auto-enrichment unavailable. Fill in details manually.");
    }
  };

  const handleBasic = () => {
    setStep("basic");
  };

  const handleConfirm = async (addAnother: boolean = false) => {
    if (!name.trim()) return;
    const prospectId = await onAdd({
      name: name.trim(),
      website: website.trim(),
      industry,
      locationCount: locs ? parseInt(locs) : null,
      status,
      tier,
      competitor,
    });

    if (prospectId && summary) {
      await onAddNote(prospectId, summary);
    }

    const label = step === "review" ? "with enrichment data" : "";
    toast.success(`Added ${name.trim()} ${label}`.trim());

    if (addAnother) {
      reset();
    } else {
      handleOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className={step === "review" ? "sm:max-w-lg" : "sm:max-w-md"}>
        {/* STEP 1: Minimal Input */}
        {step === "input" && (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-primary" />
                Add Prospect
              </DialogTitle>
              <DialogDescription>
                Enter a company name and let AI research it for you.
              </DialogDescription>
            </DialogHeader>

            {duplicateWarning && (
              <div className="flex items-center gap-2 p-3 rounded-lg bg-[hsl(var(--warning))]/10 border border-[hsl(var(--warning))]/30 text-sm">
                <AlertTriangle className="w-4 h-4 text-[hsl(var(--warning))] shrink-0" />
                <span className="text-[hsl(var(--warning))]">{duplicateWarning}</span>
              </div>
            )}

            <div className="grid gap-3">
              <div>
                <input
                  value={name}
                  onChange={(e) => checkDuplicates(e.target.value)}
                  placeholder="Company Name *"
                  className={inputClass}
                  autoFocus
                  onKeyDown={(e) => e.key === "Enter" && name.trim() && handleEnrich()}
                />
              </div>
              <div>
                <input
                  value={website}
                  onChange={(e) => setWebsite(e.target.value)}
                  placeholder="Website (e.g. example.com)"
                  className={inputClass}
                  onKeyDown={(e) => e.key === "Enter" && name.trim() && handleEnrich()}
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Adding a website dramatically improves auto-enrichment
                </p>
              </div>
            </div>

            <DialogFooter className="flex-col sm:flex-row gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={handleBasic}
                className="text-muted-foreground"
              >
                Add Basic
              </Button>
              <Button
                onClick={handleEnrich}
                disabled={!name.trim()}
                className="gap-2 glow-blue"
              >
                <Sparkles className="w-4 h-4" />
                Add & Enrich
              </Button>
            </DialogFooter>
          </>
        )}

        {/* STEP: Enriching */}
        {step === "enriching" && (
          <>
            <DialogHeader>
              <DialogTitle>Add Prospect</DialogTitle>
              <DialogDescription>AI-powered research in progress</DialogDescription>
            </DialogHeader>
            <div className="flex flex-col items-center justify-center py-8 gap-4">
              <div className="relative">
                <Loader2 className="w-10 h-10 text-primary animate-spin" />
                <Sparkles className="w-4 h-4 text-primary absolute -top-1 -right-1 animate-pulse" />
              </div>
              <p className="text-sm font-medium text-foreground">
                Researching {name.trim()}...
              </p>
              <div className="w-full max-w-xs">
                <Progress value={progress} className="h-2" />
              </div>
              <p className="text-xs text-muted-foreground">
                Checking Wikidata &amp; AI analysis
              </p>
            </div>
          </>
        )}

        {/* STEP: Review enrichment results */}
        {step === "review" && (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                Review & Confirm
              </DialogTitle>
              <DialogDescription>
                AI-enriched data — review and adjust before adding.
              </DialogDescription>
            </DialogHeader>

            <div className="grid gap-3 max-h-[60vh] overflow-y-auto pr-1">
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Company Name *"
                className={inputClass}
              />
              <input
                value={website}
                onChange={(e) => setWebsite(e.target.value)}
                placeholder="Website"
                className={inputClass}
              />
              <div className="grid grid-cols-2 gap-3">
                <select value={industry} onChange={(e) => setIndustry(e.target.value)} className={selectClass}>
                  <option value="">Industry</option>
                  {INDUSTRIES.map((i) => (
                    <option key={i} value={i}>{i}</option>
                  ))}
                </select>
                <input
                  type="number"
                  value={locs}
                  onChange={(e) => setLocs(e.target.value)}
                  placeholder="Locations"
                  className={inputClass}
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <select value={tier} onChange={(e) => setTier(e.target.value)} className={selectClass}>
                  <option value="">Tier</option>
                  {TIERS.filter(Boolean).map((t) => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>
                <select value={competitor} onChange={(e) => setCompetitor(e.target.value)} className={selectClass}>
                  <option value="">Competitor</option>
                  {COMPETITORS.filter(Boolean).map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>

              {summary && (
                <div className="p-3 rounded-lg bg-muted/50 border border-border">
                  <p className="text-xs font-medium text-muted-foreground mb-1">Company Summary</p>
                  <p className="text-sm text-foreground">{summary}</p>
                  <p className="text-xs text-muted-foreground mt-1 italic">Will be saved as the first note</p>
                </div>
              )}

              {contacts.length > 0 && (
                <div className="p-3 rounded-lg bg-primary/5 border border-primary/20">
                  <p className="text-xs font-medium text-muted-foreground mb-1 flex items-center gap-1">
                    <Users className="w-3 h-3" /> Key Contacts to Find
                  </p>
                  <p className="text-sm text-foreground">
                    Look for: {contacts.join(", ")}
                  </p>
                </div>
              )}
            </div>

            <DialogFooter className="flex-col sm:flex-row gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleConfirm(true)}
                disabled={!name.trim()}
                className="text-muted-foreground"
              >
                Confirm & Add Another
              </Button>
              <Button
                onClick={() => handleConfirm(false)}
                disabled={!name.trim()}
                className="glow-blue"
              >
                Confirm & Add
              </Button>
            </DialogFooter>
          </>
        )}

        {/* STEP: Basic manual form */}
        {step === "basic" && (
          <>
            <DialogHeader>
              <DialogTitle>Add Prospect</DialogTitle>
              <DialogDescription>Add a new company to your territory.</DialogDescription>
            </DialogHeader>

            {duplicateWarning && (
              <div className="flex items-center gap-2 p-3 rounded-lg bg-[hsl(var(--warning))]/10 border border-[hsl(var(--warning))]/30 text-sm">
                <AlertTriangle className="w-4 h-4 text-[hsl(var(--warning))] shrink-0" />
                <span className="text-[hsl(var(--warning))]">{duplicateWarning}</span>
              </div>
            )}

            <div className="grid gap-3">
              <input value={name} onChange={(e) => checkDuplicates(e.target.value)} placeholder="Company Name *" className={inputClass} />
              <input value={website} onChange={(e) => setWebsite(e.target.value)} placeholder="Website (e.g. example.com)" className={inputClass} />
              <div className="grid grid-cols-2 gap-3">
                <select value={industry} onChange={(e) => setIndustry(e.target.value)} className={selectClass}>
                  <option value="">Industry</option>
                  {INDUSTRIES.map((i) => <option key={i} value={i}>{i}</option>)}
                </select>
                <input type="number" value={locs} onChange={(e) => setLocs(e.target.value)} placeholder="Locations" className={inputClass} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <select value={status} onChange={(e) => setStatus(e.target.value)} className={selectClass}>
                  <option value="Prospect">Prospect</option>
                  <option value="Churned">Churned</option>
                </select>
                <select value={tier} onChange={(e) => setTier(e.target.value)} className={selectClass}>
                  <option value="">Tier</option>
                  {TIERS.filter(Boolean).map((t) => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
            </div>

            <DialogFooter className="flex-col sm:flex-row gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleConfirm(true)}
                disabled={!name.trim()}
                className="text-muted-foreground"
              >
                Add & Add Another
              </Button>
              <Button onClick={() => handleConfirm(false)} disabled={!name.trim()} className="glow-blue">
                Add Prospect
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

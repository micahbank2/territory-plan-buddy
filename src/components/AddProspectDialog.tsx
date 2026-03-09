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
import { Checkbox } from "@/components/ui/checkbox";
import { Sparkles, Loader2, CheckCircle2, AlertTriangle, Users, ListPlus } from "lucide-react";
import { toast } from "sonner";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";

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
type Mode = "single" | "batch";

interface BatchRow {
  name: string;
  industry: string;
  locs: number | null;
  tier: string;
  competitor: string;
  summary: string;
  isDuplicate: boolean;
  duplicateOf: string | null;
  selected: boolean;
  enriched: boolean;
  error: boolean;
}

type BatchStep = "input" | "enriching" | "review";

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

async function enrichCompany(companyName: string): Promise<EnrichmentResult | null> {
  let wikidataDesc = "";
  let wikidataWebsite = "";

  try {
    const searchRes = await fetch(
      `https://www.wikidata.org/w/api.php?action=wbsearchentities&search=${encodeURIComponent(companyName)}&language=en&format=json&limit=3&type=item&origin=*`
    );
    const searchData = await searchRes.json();
    const entity = searchData?.search?.[0];
    if (entity) {
      wikidataDesc = entity.description || "";
      const entityRes = await fetch(
        `https://www.wikidata.org/w/api.php?action=wbgetentities&ids=${entity.id}&props=claims|descriptions&languages=en&format=json&origin=*`
      );
      const entityData = await entityRes.json();
      const claims = entityData?.entities?.[entity.id]?.claims;
      const webClaim = claims?.P856?.[0]?.mainsnak?.datavalue?.value;
      if (webClaim) wikidataWebsite = webClaim;
    }
  } catch { /* continue */ }

  try {
    const { data: aiData, error: aiError } = await supabase.functions.invoke("enrich-prospect-add", {
      body: {
        companyName,
        website: wikidataWebsite || "unknown",
        wikidataDescription: wikidataDesc || "none",
      },
    });
    if (!aiError && aiData && !aiData.error) return aiData as EnrichmentResult;
  } catch { /* continue */ }

  return null;
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
  const [mode, setMode] = useState<Mode>("single");

  // === Single mode state ===
  const [step, setStep] = useState<Step>("input");
  const [name, setName] = useState("");
  const [website, setWebsite] = useState("");
  const [duplicateWarning, setDuplicateWarning] = useState<string | null>(null);
  const [industry, setIndustry] = useState("");
  const [locs, setLocs] = useState("");
  const [tier, setTier] = useState("");
  const [competitor, setCompetitor] = useState("");
  const [status, setStatus] = useState("Prospect");
  const [summary, setSummary] = useState("");
  const [contacts, setContacts] = useState<string[]>([]);
  const [progress, setProgress] = useState(0);

  // === Batch mode state ===
  const [batchStep, setBatchStep] = useState<BatchStep>("input");
  const [batchText, setBatchText] = useState("");
  const [batchRows, setBatchRows] = useState<BatchRow[]>([]);
  const [batchProgress, setBatchProgress] = useState(0);
  const [batchCurrent, setBatchCurrent] = useState(0);
  const [batchTotal, setBatchTotal] = useState(0);
  const [batchImporting, setBatchImporting] = useState(false);

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
    setBatchStep("input");
    setBatchText("");
    setBatchRows([]);
    setBatchProgress(0);
    setBatchCurrent(0);
    setBatchTotal(0);
    setBatchImporting(false);
  }, []);

  const handleOpenChange = (open: boolean) => {
    if (!open) { reset(); setMode("single"); }
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

  // === Single mode handlers ===
  const handleEnrich = async () => {
    if (!name.trim()) return;
    setStep("enriching");
    setProgress(10);

    let wikidataDesc = "";
    let wikidataWebsite = "";

    try {
      setProgress(20);
      try {
        const searchRes = await fetch(
          `https://www.wikidata.org/w/api.php?action=wbsearchentities&search=${encodeURIComponent(name.trim())}&language=en&format=json&limit=3&type=item&origin=*`
        );
        const searchData = await searchRes.json();
        const entity = searchData?.search?.[0];
        if (entity) {
          wikidataDesc = entity.description || "";
          const entityRes = await fetch(
            `https://www.wikidata.org/w/api.php?action=wbgetentities&ids=${entity.id}&props=claims|descriptions&languages=en&format=json&origin=*`
          );
          const entityData = await entityRes.json();
          const claims = entityData?.entities?.[entity.id]?.claims;
          const webClaim = claims?.P856?.[0]?.mainsnak?.datavalue?.value;
          if (webClaim) wikidataWebsite = webClaim;
        }
      } catch { /* continue */ }

      setProgress(50);

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
      } catch { /* AI failed */ }

      if (!website.trim() && wikidataWebsite) setWebsite(wikidataWebsite);
      setStep("basic");
      toast.info("Auto-enrichment unavailable. Fill in details manually.");
    } catch {
      setStep("basic");
      toast.info("Auto-enrichment unavailable. Fill in details manually.");
    }
  };

  const handleBasic = () => setStep("basic");

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

  // === Batch mode handlers ===
  const handleBatchEnrich = async () => {
    const names = batchText
      .split("\n")
      .map((l) => l.trim())
      .filter((l) => l.length > 0);

    if (names.length === 0) return;

    setBatchStep("enriching");
    setBatchTotal(names.length);
    setBatchCurrent(0);
    setBatchProgress(0);

    const rows: BatchRow[] = [];

    for (let i = 0; i < names.length; i++) {
      setBatchCurrent(i + 1);
      setBatchProgress(Math.round(((i + 1) / names.length) * 100));

      const companyName = names[i];
      const dupMatch = existingNames.find((n) => stringSimilarity(n, companyName) > 0.6);

      const result = await enrichCompany(companyName);

      rows.push({
        name: companyName,
        industry: result?.industry || "",
        locs: result?.estimated_locations ?? null,
        tier: result?.suggested_tier || "",
        competitor: result?.likely_competitor || "",
        summary: result?.company_summary || "",
        isDuplicate: !!dupMatch,
        duplicateOf: dupMatch || null,
        selected: !dupMatch,
        enriched: !!result,
        error: !result,
      });

      // Small delay to avoid rate limiting
      if (i < names.length - 1) {
        await new Promise((r) => setTimeout(r, 500));
      }
    }

    setBatchRows(rows);
    setBatchStep("review");
  };

  const toggleBatchRow = (idx: number) => {
    setBatchRows((prev) =>
      prev.map((r, i) => (i === idx ? { ...r, selected: !r.selected } : r))
    );
  };

  const toggleAllBatchRows = () => {
    const allSelected = batchRows.every((r) => r.selected);
    setBatchRows((prev) => prev.map((r) => ({ ...r, selected: !allSelected })));
  };

  const handleBatchConfirm = async () => {
    const selected = batchRows.filter((r) => r.selected);
    if (selected.length === 0) return;

    setBatchImporting(true);

    let added = 0;
    for (const row of selected) {
      const prospectId = await onAdd({
        name: row.name,
        website: "",
        industry: row.industry,
        locationCount: row.locs,
        status: "Prospect",
        tier: row.tier,
        competitor: row.competitor,
      });

      if (prospectId && row.summary) {
        await onAddNote(prospectId, row.summary);
      }
      added++;
    }

    setBatchImporting(false);
    toast.success(`🎉 Added ${added} prospect${added !== 1 ? "s" : ""} with enrichment data`);
    handleOpenChange(false);
  };

  const selectedCount = batchRows.filter((r) => r.selected).length;

  // Mode toggle
  const ModeToggle = () => (
    <div className="flex gap-1 p-0.5 rounded-lg bg-muted w-fit">
      <button
        onClick={() => { setMode("single"); reset(); }}
        className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${
          mode === "single" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
        }`}
      >
        Single
      </button>
      <button
        onClick={() => { setMode("batch"); reset(); }}
        className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${
          mode === "batch" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
        }`}
      >
        Batch
      </button>
    </div>
  );

  const showModeToggle = (mode === "single" && step === "input") || (mode === "batch" && batchStep === "input");

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent
        className={
          (mode === "batch" && batchStep === "review")
            ? "sm:max-w-3xl"
            : step === "review"
            ? "sm:max-w-lg"
            : "sm:max-w-md"
        }
      >
        {/* ========== SINGLE MODE ========== */}
        {mode === "single" && (
          <>
            {step === "input" && (
              <>
                <DialogHeader>
                  <div className="flex items-center justify-between">
                    <DialogTitle className="flex items-center gap-2">
                      <Sparkles className="w-5 h-5 text-primary" />
                      Add Prospect
                    </DialogTitle>
                    <ModeToggle />
                  </div>
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
                  <input
                    value={name}
                    onChange={(e) => checkDuplicates(e.target.value)}
                    placeholder="Company Name *"
                    className={inputClass}
                    autoFocus
                    onKeyDown={(e) => e.key === "Enter" && name.trim() && handleEnrich()}
                  />
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
                  <Button variant="ghost" size="sm" onClick={handleBasic} className="text-muted-foreground">
                    Add Basic
                  </Button>
                  <Button onClick={handleEnrich} disabled={!name.trim()} className="gap-2 glow-blue">
                    <Sparkles className="w-4 h-4" /> Add & Enrich
                  </Button>
                </DialogFooter>
              </>
            )}

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
                  <p className="text-sm font-medium text-foreground">Researching {name.trim()}...</p>
                  <div className="w-full max-w-xs">
                    <Progress value={progress} className="h-2" />
                  </div>
                  <p className="text-xs text-muted-foreground">Checking Wikidata &amp; AI analysis</p>
                </div>
              </>
            )}

            {step === "review" && (
              <>
                <DialogHeader>
                  <DialogTitle className="flex items-center gap-2">
                    <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                    Review & Confirm
                  </DialogTitle>
                  <DialogDescription>AI-enriched data — review and adjust before adding.</DialogDescription>
                </DialogHeader>

                <div className="grid gap-3 max-h-[60vh] overflow-y-auto pr-1">
                  <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Company Name *" className={inputClass} />
                  <input value={website} onChange={(e) => setWebsite(e.target.value)} placeholder="Website" className={inputClass} />
                  <div className="grid grid-cols-2 gap-3">
                    <select value={industry} onChange={(e) => setIndustry(e.target.value)} className={selectClass}>
                      <option value="">Industry</option>
                      {INDUSTRIES.map((i) => <option key={i} value={i}>{i}</option>)}
                    </select>
                    <input type="number" value={locs} onChange={(e) => setLocs(e.target.value)} placeholder="Locations" className={inputClass} />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <select value={tier} onChange={(e) => setTier(e.target.value)} className={selectClass}>
                      <option value="">Tier</option>
                      {TIERS.filter(Boolean).map((t) => <option key={t} value={t}>{t}</option>)}
                    </select>
                    <select value={competitor} onChange={(e) => setCompetitor(e.target.value)} className={selectClass}>
                      <option value="">Competitor</option>
                      {COMPETITORS.filter(Boolean).map((c) => <option key={c} value={c}>{c}</option>)}
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
                      <p className="text-sm text-foreground">Look for: {contacts.join(", ")}</p>
                    </div>
                  )}
                </div>

                <DialogFooter className="flex-col sm:flex-row gap-2">
                  <Button variant="ghost" size="sm" onClick={() => handleConfirm(true)} disabled={!name.trim()} className="text-muted-foreground">
                    Confirm & Add Another
                  </Button>
                  <Button onClick={() => handleConfirm(false)} disabled={!name.trim()} className="glow-blue">
                    Confirm & Add
                  </Button>
                </DialogFooter>
              </>
            )}

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
                  <Button variant="ghost" size="sm" onClick={() => handleConfirm(true)} disabled={!name.trim()} className="text-muted-foreground">
                    Add & Add Another
                  </Button>
                  <Button onClick={() => handleConfirm(false)} disabled={!name.trim()} className="glow-blue">
                    Add Prospect
                  </Button>
                </DialogFooter>
              </>
            )}
          </>
        )}

        {/* ========== BATCH MODE ========== */}
        {mode === "batch" && (
          <>
            {batchStep === "input" && (
              <>
                <DialogHeader>
                  <div className="flex items-center justify-between">
                    <DialogTitle className="flex items-center gap-2">
                      <ListPlus className="w-5 h-5 text-primary" />
                      Batch Add
                    </DialogTitle>
                    <ModeToggle />
                  </div>
                  <DialogDescription>
                    Paste company names and AI will enrich them all at once.
                  </DialogDescription>
                </DialogHeader>

                <textarea
                  value={batchText}
                  onChange={(e) => setBatchText(e.target.value)}
                  placeholder={`Paste company names, one per line. Example:\nJersey Mike's\nNothing Bundt Cakes\nEuropean Wax Center\nMassage Envy`}
                  className={`${inputClass} min-h-[180px] resize-y font-mono text-sm`}
                  autoFocus
                />

                <p className="text-xs text-muted-foreground">
                  {batchText.split("\n").filter((l) => l.trim()).length} companies detected
                </p>

                <DialogFooter>
                  <Button
                    onClick={handleBatchEnrich}
                    disabled={batchText.split("\n").filter((l) => l.trim()).length === 0}
                    className="gap-2 glow-blue"
                  >
                    <Sparkles className="w-4 h-4" />
                    Add & Enrich All
                  </Button>
                </DialogFooter>
              </>
            )}

            {batchStep === "enriching" && (
              <>
                <DialogHeader>
                  <DialogTitle>Batch Enrichment</DialogTitle>
                  <DialogDescription>AI-powered research in progress</DialogDescription>
                </DialogHeader>
                <div className="flex flex-col items-center justify-center py-8 gap-4">
                  <div className="relative">
                    <Loader2 className="w-10 h-10 text-primary animate-spin" />
                    <Sparkles className="w-4 h-4 text-primary absolute -top-1 -right-1 animate-pulse" />
                  </div>
                  <p className="text-sm font-medium text-foreground">
                    Enriching {batchCurrent} of {batchTotal}...
                  </p>
                  <div className="w-full max-w-xs">
                    <Progress value={batchProgress} className="h-2" />
                  </div>
                  <p className="text-xs text-muted-foreground">
                    This may take a moment for larger batches
                  </p>
                </div>
              </>
            )}

            {batchStep === "review" && (
              <>
                <DialogHeader>
                  <DialogTitle className="flex items-center gap-2">
                    <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                    Review Batch ({selectedCount} of {batchRows.length} selected)
                  </DialogTitle>
                  <DialogDescription>
                    Uncheck any you don't want to import. Duplicates are unchecked by default.
                  </DialogDescription>
                </DialogHeader>

                <ScrollArea className="max-h-[50vh]">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border text-left">
                        <th className="p-2 w-8">
                          <Checkbox
                            checked={batchRows.length > 0 && batchRows.every((r) => r.selected)}
                            onCheckedChange={toggleAllBatchRows}
                          />
                        </th>
                        <th className="p-2 font-medium text-muted-foreground">Name</th>
                        <th className="p-2 font-medium text-muted-foreground">Industry</th>
                        <th className="p-2 font-medium text-muted-foreground">Locs</th>
                        <th className="p-2 font-medium text-muted-foreground">Tier</th>
                        <th className="p-2 font-medium text-muted-foreground">Competitor</th>
                        <th className="p-2 font-medium text-muted-foreground">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {batchRows.map((row, idx) => (
                        <tr
                          key={idx}
                          className={`border-b border-border/50 ${
                            !row.selected ? "opacity-50" : ""
                          } ${row.isDuplicate ? "bg-muted/30" : ""}`}
                        >
                          <td className="p-2">
                            <Checkbox
                              checked={row.selected}
                              onCheckedChange={() => toggleBatchRow(idx)}
                            />
                          </td>
                          <td className="p-2 font-medium text-foreground">
                            <div className="flex items-center gap-1.5">
                              {row.name}
                              {row.isDuplicate ? (
                                <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                                  exists
                                </Badge>
                              ) : (
                                <Badge className="text-[10px] px-1.5 py-0 bg-emerald-500/15 text-emerald-600 border-emerald-500/30 hover:bg-emerald-500/15">
                                  new
                                </Badge>
                              )}
                              {row.error && (
                                <Badge variant="destructive" className="text-[10px] px-1.5 py-0">
                                  no data
                                </Badge>
                              )}
                            </div>
                            {row.isDuplicate && (
                              <p className="text-[10px] text-muted-foreground mt-0.5">
                                Similar to "{row.duplicateOf}"
                              </p>
                            )}
                          </td>
                          <td className="p-2 text-muted-foreground">{row.industry || "—"}</td>
                          <td className="p-2 text-muted-foreground">{row.locs ?? "—"}</td>
                          <td className="p-2 text-muted-foreground">{row.tier || "—"}</td>
                          <td className="p-2 text-muted-foreground">{row.competitor || "—"}</td>
                          <td className="p-2">
                            {row.enriched ? (
                              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                            ) : (
                              <AlertTriangle className="w-3.5 h-3.5 text-[hsl(var(--warning))]" />
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </ScrollArea>

                <DialogFooter>
                  <Button variant="outline" onClick={() => handleOpenChange(false)}>
                    Cancel
                  </Button>
                  <Button
                    onClick={handleBatchConfirm}
                    disabled={selectedCount === 0 || batchImporting}
                    className="gap-2 glow-blue"
                  >
                    {batchImporting ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Importing...
                      </>
                    ) : (
                      <>Confirm Import ({selectedCount})</>
                    )}
                  </Button>
                </DialogFooter>
              </>
            )}
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

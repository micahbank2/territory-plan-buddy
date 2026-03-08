import { useState, useCallback } from "react";
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
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Upload, AlertTriangle, ClipboardPaste } from "lucide-react";
import { stringSimilarity, getDomain, type Prospect, type Contact } from "@/data/prospects";
import {
  matchColumn,
  mapRow,
  computeChanges,
  PROTECTED_FIELDS,
  type ParsedRow,
  type RowAction,
} from "@/components/CSVUploadDialog";
import { toast } from "sonner";

// Detect delimiter: tabs > commas > fixed-width
function detectDelimiter(text: string): "tab" | "comma" | "space" {
  const lines = text.split(/\r?\n/).filter((l) => l.trim());
  if (lines.length === 0) return "comma";

  const tabCount = lines.reduce((sum, l) => sum + (l.match(/\t/g)?.length || 0), 0);
  if (tabCount > 0) return "tab";

  const commaCount = lines.reduce((sum, l) => sum + (l.match(/,/g)?.length || 0), 0);
  if (commaCount > lines.length) return "comma"; // at least ~1 comma per line

  return "space";
}

function splitLine(line: string, delimiter: "tab" | "comma" | "space"): string[] {
  if (delimiter === "tab") return line.split("\t").map((s) => s.trim());
  if (delimiter === "comma") {
    // Handle quoted CSV fields
    const result: string[] = [];
    let current = "";
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (inQuotes) {
        if (ch === '"') {
          if (i + 1 < line.length && line[i + 1] === '"') {
            current += '"';
            i++;
          } else {
            inQuotes = false;
          }
        } else {
          current += ch;
        }
      } else {
        if (ch === '"') {
          inQuotes = true;
        } else if (ch === ",") {
          result.push(current.trim());
          current = "";
        } else {
          current += ch;
        }
      }
    }
    result.push(current.trim());
    return result;
  }

  // Fixed-width / space-separated: split on 2+ spaces
  return line.split(/\s{2,}/).map((s) => s.trim()).filter(Boolean);
}

function looksLikeHeader(cells: string[]): boolean {
  // A header row typically has no numbers and short text
  const numericCount = cells.filter((c) => /^\d+$/.test(c.trim())).length;
  if (numericCount > cells.length / 2) return false;

  // Check if any cell matches a known column alias
  const matchCount = cells.filter((c) => matchColumn(c) !== undefined).length;
  return matchCount > 0;
}

interface PasteImportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  existingData: Prospect[];
  onImport: (newRows: (Partial<Prospect> & { name: string })[], updates: { id: any; changes: Partial<Prospect> }[]) => void;
}

export function PasteImportDialog({ open, onOpenChange, existingData, onImport }: PasteImportDialogProps) {
  const [pastedText, setPastedText] = useState("");
  const [rows, setRows] = useState<ParsedRow[]>([]);
  const [step, setStep] = useState<"paste" | "preview">("paste");
  const [unmappedColumns, setUnmappedColumns] = useState<string[]>([]);
  const [firstRowIsHeaders, setFirstRowIsHeaders] = useState(true);
  const [detectedDelimiter, setDetectedDelimiter] = useState<string>("");

  const resetState = useCallback(() => {
    setPastedText("");
    setRows([]);
    setStep("paste");
    setUnmappedColumns([]);
    setFirstRowIsHeaders(true);
    setDetectedDelimiter("");
  }, []);

  const handleParse = useCallback(() => {
    const text = pastedText.trim();
    if (!text) {
      toast.error("Nothing to parse — paste some data first");
      return;
    }

    const lines = text.split(/\r?\n/).filter((l) => l.trim());
    if (lines.length === 0) {
      toast.error("No data rows found");
      return;
    }

    const delimiter = detectDelimiter(text);
    setDetectedDelimiter(delimiter === "tab" ? "Tab-separated" : delimiter === "comma" ? "Comma-separated" : "Space-aligned");

    const allCells = lines.map((l) => splitLine(l, delimiter));

    // Single column case: treat as company names
    const maxCols = Math.max(...allCells.map((c) => c.length));
    if (maxCols === 1) {
      // All single values — treat as company names
      const unmapped = new Set<string>();
      const parsed: ParsedRow[] = allCells
        .map((cells) => {
          const name = cells[0]?.trim();
          if (!name) return null;
          const mapped: Partial<Prospect> = { name };

          // Check for duplicates
          let bestMatch: Prospect | undefined;
          let bestSim = 0;
          for (const p of existingData) {
            const sim = stringSimilarity(p.name, name);
            if (sim > bestSim) { bestSim = sim; bestMatch = p; }
          }

          if (bestSim > 0.7 && bestMatch) {
            return { raw: { Name: name }, mapped, action: "skip" as RowAction, matchedProspect: bestMatch, similarity: bestSim, included: false, changedFields: [] };
          }
          if (bestSim >= 0.5 && bestMatch) {
            return { raw: { Name: name }, mapped, action: "review" as RowAction, matchedProspect: bestMatch, similarity: bestSim, included: false, changedFields: [] };
          }
          return { raw: { Name: name }, mapped, action: "new" as RowAction, included: true, changedFields: [] };
        })
        .filter(Boolean) as ParsedRow[];

      setUnmappedColumns(Array.from(unmapped));
      setRows(parsed);
      setStep("preview");
      return;
    }

    // Multi-column: determine headers
    let headers: string[];
    let dataRows: string[][];

    if (firstRowIsHeaders && looksLikeHeader(allCells[0])) {
      headers = allCells[0];
      dataRows = allCells.slice(1);
    } else if (firstRowIsHeaders) {
      headers = allCells[0];
      dataRows = allCells.slice(1);
    } else {
      // Generate synthetic headers
      headers = allCells[0].map((_, i) => `Column ${i + 1}`);
      dataRows = allCells;
    }

    // Build raw records
    const rawRows: Record<string, string>[] = dataRows
      .filter((cells) => cells.some((c) => c.trim()))
      .map((cells) => {
        const obj: Record<string, string> = {};
        headers.forEach((h, i) => { obj[h] = cells[i]?.trim() || ""; });
        return obj;
      });

    if (rawRows.length === 0) {
      toast.error("No data rows found after parsing");
      return;
    }

    // Use the same mapping logic as CSV import
    const unmapped = new Set<string>();
    const parsed: ParsedRow[] = rawRows
      .map((raw) => {
        const mapped = mapRow(raw, unmapped);
        if (!mapped.name) return null;

        const csvDomain = getDomain(mapped.website);

        if (csvDomain) {
          const websiteMatch = existingData.find(
            (p) => getDomain(p.website).toLowerCase() === csvDomain.toLowerCase() && csvDomain !== ""
          );
          if (websiteMatch) {
            const { changes, changedFields } = computeChanges(websiteMatch, mapped);
            if (changedFields.length === 0) {
              return { raw, mapped, action: "skip" as RowAction, matchedProspect: websiteMatch, included: false, changedFields: [] };
            }
            return { raw, mapped, action: "update" as RowAction, matchedProspect: websiteMatch, included: true, changedFields };
          }
        }

        let bestMatch: Prospect | undefined;
        let bestSim = 0;
        for (const p of existingData) {
          const sim = stringSimilarity(p.name, mapped.name as string);
          if (sim > bestSim) { bestSim = sim; bestMatch = p; }
        }

        if (bestSim > 0.7 && bestMatch) {
          const { changes, changedFields } = computeChanges(bestMatch, mapped);
          if (changedFields.length === 0) {
            return { raw, mapped, action: "skip" as RowAction, matchedProspect: bestMatch, similarity: bestSim, included: false, changedFields: [] };
          }
          return { raw, mapped, action: "update" as RowAction, matchedProspect: bestMatch, similarity: bestSim, included: true, changedFields };
        }

        if (bestSim >= 0.5 && bestMatch) {
          return { raw, mapped, action: "review" as RowAction, matchedProspect: bestMatch, similarity: bestSim, included: false, changedFields: [] };
        }

        return { raw, mapped, action: "new" as RowAction, included: true, changedFields: [] };
      })
      .filter(Boolean) as ParsedRow[];

    setUnmappedColumns(Array.from(unmapped));
    setRows(parsed);
    setStep("preview");
  }, [pastedText, firstRowIsHeaders, existingData]);

  const toggleRow = (index: number) => {
    setRows((prev) => prev.map((r, i) => (i === index ? { ...r, included: !r.included } : r)));
  };

  const counts = {
    new: rows.filter((r) => r.action === "new").length,
    update: rows.filter((r) => r.action === "update").length,
    review: rows.filter((r) => r.action === "review").length,
    skip: rows.filter((r) => r.action === "skip").length,
  };
  const includedCount = rows.filter((r) => r.included).length;

  const handleConfirm = () => {
    const toAdd = rows
      .filter((r) => r.included && r.action === "new")
      .map((r) => r.mapped as Partial<Prospect> & { name: string });

    const toUpdate = rows
      .filter((r) => r.included && (r.action === "update" || r.action === "review") && r.matchedProspect)
      .map((r) => {
        const { changes } = computeChanges(r.matchedProspect!, r.mapped);
        return { id: r.matchedProspect!.id, changes };
      })
      .filter((u) => Object.keys(u.changes).length > 0);

    onImport(toAdd, toUpdate);
    const unmappedNote = unmappedColumns.length > 0 ? ` | ${unmappedColumns.length} unmapped columns` : "";
    toast.success("Paste import complete!", {
      description: `${toAdd.length} added, ${toUpdate.length} updated, ${counts.skip} skipped${unmappedNote}`,
    });

    resetState();
    onOpenChange(false);
  };

  const prospectActionBadge = (action: RowAction) => {
    switch (action) {
      case "new": return <Badge className="bg-emerald-500/15 text-emerald-600 border-emerald-500/30 hover:bg-emerald-500/15">NEW</Badge>;
      case "update": return <Badge className="bg-blue-500/15 text-blue-600 border-blue-500/30 hover:bg-blue-500/15">UPDATE</Badge>;
      case "review": return <Badge className="bg-amber-500/15 text-amber-600 border-amber-500/30 hover:bg-amber-500/15">REVIEW</Badge>;
      case "skip": return <Badge className="bg-muted text-muted-foreground border-border hover:bg-muted">SKIP</Badge>;
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        if (!v) resetState();
        onOpenChange(v);
      }}
    >
      <DialogContent className="max-w-4xl max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ClipboardPaste className="w-5 h-5 text-primary" />
            Paste Import{step === "preview" ? " Preview" : ""}
          </DialogTitle>
          <DialogDescription>
            {step === "paste"
              ? "Paste tabular data from any source to import prospects."
              : `${rows.length} rows parsed${detectedDelimiter ? ` (${detectedDelimiter})` : ""}`}
          </DialogDescription>
        </DialogHeader>

        {step === "paste" && (
          <div className="space-y-4">
            <textarea
              value={pastedText}
              onChange={(e) => setPastedText(e.target.value)}
              placeholder="Paste data from LinkedIn Sales Nav, ZoomInfo, Salesforce, or any table..."
              className="w-full min-h-[200px] px-4 py-3 text-sm rounded-xl border border-border bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/40 transition-all font-mono resize-y"
              rows={8}
            />
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Switch
                  id="first-row-headers"
                  checked={firstRowIsHeaders}
                  onCheckedChange={setFirstRowIsHeaders}
                />
                <Label htmlFor="first-row-headers" className="text-xs text-muted-foreground cursor-pointer">
                  First row is headers
                </Label>
              </div>
              <Button onClick={handleParse} disabled={!pastedText.trim()} className="gap-1.5">
                Parse Data
              </Button>
            </div>
            <p className="text-[11px] text-muted-foreground leading-relaxed">
              Select rows from any web table, copy (Ctrl+C / ⌘C), and paste here. Tab-separated, comma-separated, and space-aligned data are all supported. Single-column lists of company names also work.
            </p>
          </div>
        )}

        {step === "preview" && (
          <>
            {unmappedColumns.length > 0 && (
              <div className="flex items-center gap-2 rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-700 dark:text-amber-400">
                <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                <span>{unmappedColumns.length} column{unmappedColumns.length > 1 ? "s" : ""} not mapped: <strong>{unmappedColumns.join(", ")}</strong></span>
              </div>
            )}

            <div className="flex items-center gap-3 flex-wrap">
              {counts.update > 0 && <span className="text-xs font-medium text-blue-600">{counts.update} Updates</span>}
              {counts.new > 0 && <span className="text-xs font-medium text-emerald-600">{counts.new} New</span>}
              {counts.review > 0 && (
                <span className="text-xs font-medium text-amber-600 flex items-center gap-1">
                  <AlertTriangle className="w-3 h-3" /> {counts.review} Review
                </span>
              )}
              {counts.skip > 0 && <span className="text-xs font-medium text-muted-foreground">{counts.skip} Skip</span>}
            </div>

            <div className="text-xs text-muted-foreground">
              {rows.length} row{rows.length !== 1 ? "s" : ""} • {includedCount} selected for import
            </div>

            <ScrollArea className="flex-1 min-h-0 max-h-[50vh] border border-border rounded-lg">
              <table className="w-full text-sm">
                <thead className="sticky top-0 bg-muted/80 backdrop-blur-sm">
                  <tr className="border-b border-border">
                    <th className="p-2 w-8" />
                    <th className="p-2 text-left text-xs font-medium text-muted-foreground">Status</th>
                    <th className="p-2 text-left text-xs font-medium text-muted-foreground">Name</th>
                    <th className="p-2 text-left text-xs font-medium text-muted-foreground">Website</th>
                    <th className="p-2 text-left text-xs font-medium text-muted-foreground">Industry</th>
                    <th className="p-2 text-left text-xs font-medium text-muted-foreground">Details</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row, i) => (
                    <tr
                      key={i}
                      className={`border-b border-border last:border-0 transition-colors ${
                        row.action === "skip" ? "opacity-50" : ""
                      } ${row.included ? "" : "opacity-60"}`}
                    >
                      <td className="p-2">
                        <Checkbox checked={row.included} onCheckedChange={() => toggleRow(i)} />
                      </td>
                      <td className="p-2">{prospectActionBadge(row.action)}</td>
                      <td className="p-2 font-medium text-foreground">
                        {row.mapped.name as string}
                        {row.matchedProspect && row.action === "review" && (
                          <div className="text-[10px] text-amber-600 mt-0.5">
                            ≈ {row.matchedProspect.name} ({Math.round((row.similarity || 0) * 100)}% match)
                          </div>
                        )}
                        {row.matchedProspect && row.action === "update" && (
                          <div className="text-[10px] text-blue-600 mt-0.5">→ {row.matchedProspect.name}</div>
                        )}
                      </td>
                      <td className="p-2 text-muted-foreground text-xs truncate max-w-[140px]">
                        {(row.mapped.website as string) || "—"}
                      </td>
                      <td className="p-2 text-muted-foreground text-xs">
                        {(row.mapped.industry as string) || "—"}
                      </td>
                      <td className="p-2 text-xs text-muted-foreground">
                        {row.action === "update" && row.changedFields && row.changedFields.length > 0 && (
                          <span className="text-blue-600">Δ {row.changedFields.join(", ")}</span>
                        )}
                        {row.action === "new" && row.mapped.locationCount && (
                          <span>{row.mapped.locationCount} locs</span>
                        )}
                        {row.action === "skip" && <span>No changes</span>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </ScrollArea>

            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={() => { setStep("paste"); setRows([]); }}>
                ← Back to paste
              </Button>
            </div>
          </>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => { resetState(); onOpenChange(false); }}>
            Cancel
          </Button>
          {step === "preview" && (
            <Button onClick={handleConfirm} disabled={includedCount === 0}>
              <Upload className="w-4 h-4 mr-1.5" />
              Confirm Import ({includedCount})
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

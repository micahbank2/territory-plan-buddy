import { useState, useCallback, useRef } from "react";
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
import { Upload, FileUp, AlertTriangle } from "lucide-react";
import { stringSimilarity, getDomain, type Prospect } from "@/data/prospects";
import { toast } from "sonner";

// --- Normalize header for matching ---
function normalizeHeader(h: string): string {
  return h
    .toLowerCase()
    .replace(/[_]/g, " ")
    .replace(/[^a-z0-9 ]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

// --- Column mapping ---
const COLUMN_MAP: Record<string, keyof Prospect> = {};
const addAliases = (aliases: string[], field: keyof Prospect) =>
  aliases.forEach((a) => (COLUMN_MAP[normalizeHeader(a)] = field));

addAliases(["company", "name", "company name", "account", "account name", "business name", "business"], "name");
addAliases(["website", "url", "domain", "site"], "website");
addAliases(["industry", "vertical", "category", "sector"], "industry");
addAliases(["locations", "location count", "locs", "locations count", "loc count", "num locations", "number of locations", "store count", "stores", "units"], "locationCount");
addAliases(["status"], "status");
addAliases(["owner", "transition owner", "rep", "sales rep"], "transitionOwner");
addAliases(["priority", "heat"], "priority");
addAliases(["tier"], "tier");
addAliases(["outreach", "stage", "pipeline"], "outreach");
addAliases(["competitor"], "competitor");
addAliases(["notes", "location notes"], "locationNotes");
addAliases(["contact name", "contact"], "contactName");
addAliases(["contact email", "email"], "contactEmail");
addAliases(["estimated revenue", "revenue", "arr"], "estimatedRevenue");

// Fuzzy column matching: exact -> starts-with -> contains
function matchColumn(header: string): keyof Prospect | undefined {
  const norm = normalizeHeader(header);
  if (!norm) return undefined;
  // 1. Exact
  if (COLUMN_MAP[norm]) return COLUMN_MAP[norm];
  // 2. Starts-with
  for (const [alias, field] of Object.entries(COLUMN_MAP)) {
    if (norm.startsWith(alias) || alias.startsWith(norm)) return field;
  }
  // 3. Contains
  for (const [alias, field] of Object.entries(COLUMN_MAP)) {
    if (norm.includes(alias) || alias.includes(norm)) return field;
  }
  return undefined;
}

// App-only fields that CSV should never overwrite
const PROTECTED_FIELDS = new Set(["contacts", "interactions", "noteLog", "nextStep", "nextStepDate", "ps", "id", "createdAt", "customLogo"]);

type RowAction = "new" | "update" | "review" | "skip";

interface ParsedRow {
  raw: Record<string, string>;
  mapped: Partial<Prospect>;
  action: RowAction;
  matchedProspect?: Prospect;
  similarity?: number;
  included: boolean;
  changedFields?: string[];
}

// --- CSV parser that handles quoted fields ---
function parseCSVLine(line: string): string[] {
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

function parseCSV(text: string): Record<string, string>[] {
  const lines = text.split(/\r?\n/).filter((l) => l.trim());
  if (lines.length < 2) return [];
  const headers = parseCSVLine(lines[0]);
  return lines.slice(1).map((line) => {
    const vals = parseCSVLine(line);
    const obj: Record<string, string> = {};
    headers.forEach((h, i) => {
      obj[h] = vals[i] || "";
    });
    return obj;
  });
}

function mapRow(raw: Record<string, string>, unmappedCols: Set<string>): Partial<Prospect> {
  const mapped: any = {};
  for (const [header, value] of Object.entries(raw)) {
    const field = matchColumn(header);
    if (!field) { unmappedCols.add(header); continue; }
    if (PROTECTED_FIELDS.has(field)) continue;
    if (!value.trim()) continue;
    if (field === "locationCount" || field === "estimatedRevenue") {
      const num = parseInt(value.replace(/[^0-9-]/g, ""));
      if (!isNaN(num)) mapped[field] = num;
    } else {
      mapped[field] = value.trim();
    }
  }
  return mapped;
}

function computeChanges(existing: Prospect, incoming: Partial<Prospect>): { changes: Partial<Prospect>; changedFields: string[] } {
  const changes: any = {};
  const changedFields: string[] = [];
  for (const [key, val] of Object.entries(incoming)) {
    if (PROTECTED_FIELDS.has(key)) continue;
    const existingVal = (existing as any)[key];
    // Never clear existing data
    if (val == null || val === "") continue;
    // If existing is empty or different, take CSV value
    if (existingVal == null || existingVal === "" || existingVal !== val) {
      if (existingVal !== val) {
        changes[key] = val;
        changedFields.push(key);
      }
    }
  }
  return { changes, changedFields };
}

interface CSVUploadDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  existingData: Prospect[];
  onImport: (newRows: (Partial<Prospect> & { name: string })[], updates: { id: any; changes: Partial<Prospect> }[]) => void;
}

export function CSVUploadDialog({ open, onOpenChange, existingData, onImport }: CSVUploadDialogProps) {
  const [rows, setRows] = useState<ParsedRow[]>([]);
  const [fileName, setFileName] = useState("");
  const [step, setStep] = useState<"upload" | "preview">("upload");
  const [dragging, setDragging] = useState(false);
  const [unmappedColumns, setUnmappedColumns] = useState<string[]>([]);
  const fileRef = useRef<HTMLInputElement>(null);

  const resetState = useCallback(() => {
    setRows([]);
    setFileName("");
    setStep("upload");
    setDragging(false);
    setUnmappedColumns([]);
  }, []);

  const processFile = useCallback(
    (file: File) => {
      setFileName(file.name);
      const reader = new FileReader();
      reader.onload = () => {
        const text = reader.result as string;
        const rawRows = parseCSV(text);
        if (rawRows.length === 0) {
          toast.error("No data rows found in CSV");
          return;
        }

        const unmapped = new Set<string>();
        const parsed: ParsedRow[] = rawRows
          .map((raw) => {
            const mapped = mapRow(raw, unmapped);
            if (!mapped.name) return null;

            // Match logic
            const csvDomain = getDomain(mapped.website);

            // 1. Exact website match
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

            // 2. Name similarity
            let bestMatch: Prospect | undefined;
            let bestSim = 0;
            for (const p of existingData) {
              const sim = stringSimilarity(p.name, mapped.name as string);
              if (sim > bestSim) {
                bestSim = sim;
                bestMatch = p;
              }
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

            // 4. New
            return { raw, mapped, action: "new" as RowAction, included: true, changedFields: [] };
          })
          .filter(Boolean) as ParsedRow[];

        setUnmappedColumns(Array.from(unmapped));
        setRows(parsed);
        setStep("preview");
      };
      reader.readAsText(file);
    },
    [existingData]
  );

  const handleFileDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file && file.name.endsWith(".csv")) processFile(file);
    else toast.error("Please drop a .csv file");
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) processFile(file);
    e.target.value = "";
  };

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
    const unmappedNote = unmappedColumns.length > 0 ? ` | ${unmappedColumns.length} unmapped columns: ${unmappedColumns.join(", ")}` : "";
    toast.success(`CSV imported!`, {
      description: `${toAdd.length} added, ${toUpdate.length} updated, ${counts.skip} skipped${unmappedNote}`,
    });
    resetState();
    onOpenChange(false);
  };

  const actionBadge = (action: RowAction) => {
    switch (action) {
      case "new":
        return <Badge className="bg-emerald-500/15 text-emerald-600 border-emerald-500/30 hover:bg-emerald-500/15">NEW</Badge>;
      case "update":
        return <Badge className="bg-blue-500/15 text-blue-600 border-blue-500/30 hover:bg-blue-500/15">UPDATE</Badge>;
      case "review":
        return <Badge className="bg-amber-500/15 text-amber-600 border-amber-500/30 hover:bg-amber-500/15">REVIEW</Badge>;
      case "skip":
        return <Badge className="bg-muted text-muted-foreground border-border hover:bg-muted">SKIP</Badge>;
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
          <DialogTitle>CSV Import{step === "preview" ? " Preview" : ""}</DialogTitle>
          <DialogDescription>
            {step === "upload"
              ? "Upload a CSV file to import prospects. Existing records will be matched and updated smartly."
              : `File: ${fileName} (${rows.length} rows)`}
          </DialogDescription>
        </DialogHeader>

        {step === "upload" && (
          <div
            className={`border-2 border-dashed rounded-xl p-12 text-center transition-colors cursor-pointer ${
              dragging ? "border-primary bg-primary/5" : "border-border hover:border-primary/50"
            }`}
            onClick={() => fileRef.current?.click()}
            onDrop={handleFileDrop}
            onDragOver={(e) => {
              e.preventDefault();
              setDragging(true);
            }}
            onDragLeave={() => setDragging(false)}
          >
            <input ref={fileRef} type="file" accept=".csv" className="hidden" onChange={handleFileSelect} />
            <FileUp className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
            <p className="text-sm font-medium text-foreground mb-1">Drop a CSV file here or click to browse</p>
            <p className="text-xs text-muted-foreground">Supports standard CSV format with headers</p>
          </div>
        )}

        {step === "preview" && (
          <>
            {/* Unmapped columns warning */}
            {unmappedColumns.length > 0 && (
              <div className="flex items-center gap-2 rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-700 dark:text-amber-400">
                <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                <span>{unmappedColumns.length} column{unmappedColumns.length > 1 ? "s" : ""} not mapped: <strong>{unmappedColumns.join(", ")}</strong></span>
              </div>
            )}

            {/* Summary bar */}
            <div className="flex items-center gap-3 flex-wrap">
              {counts.new > 0 && (
                <span className="text-xs font-medium text-emerald-600">
                  {counts.new} New
                </span>
              )}
              {counts.update > 0 && (
                <span className="text-xs font-medium text-blue-600">
                  {counts.update} Updates
                </span>
              )}
              {counts.review > 0 && (
                <span className="text-xs font-medium text-amber-600 flex items-center gap-1">
                  <AlertTriangle className="w-3 h-3" /> {counts.review} Review
                </span>
              )}
              {counts.skip > 0 && (
                <span className="text-xs font-medium text-muted-foreground">
                  {counts.skip} Skip
                </span>
              )}
            </div>

            {/* Table */}
            <ScrollArea className="flex-1 min-h-0 border border-border rounded-lg">
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
                        <Checkbox
                          checked={row.included}
                          onCheckedChange={() => toggleRow(i)}
                        />
                      </td>
                      <td className="p-2">{actionBadge(row.action)}</td>
                      <td className="p-2 font-medium text-foreground">
                        {row.mapped.name as string}
                        {row.matchedProspect && row.action === "review" && (
                          <div className="text-[10px] text-amber-600 mt-0.5">
                            ≈ {row.matchedProspect.name} ({Math.round((row.similarity || 0) * 100)}% match)
                          </div>
                        )}
                        {row.matchedProspect && row.action === "update" && (
                          <div className="text-[10px] text-blue-600 mt-0.5">
                            → {row.matchedProspect.name}
                          </div>
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
                          <span className="text-blue-600">
                            Δ {row.changedFields.join(", ")}
                          </span>
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

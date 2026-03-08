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
import { Upload, FileUp, AlertTriangle, Users } from "lucide-react";
import { stringSimilarity, getDomain, type Prospect, type Contact } from "@/data/prospects";
import { normalizeUrl } from "@/lib/utils";
import { toast } from "sonner";

// --- Normalize header for matching ---
export function normalizeHeader(h: string): string {
  return h
    .toLowerCase()
    .replace(/[_]/g, " ")
    .replace(/[^a-z0-9 ]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

// --- Prospect column mapping ---
export const COLUMN_MAP: Record<string, keyof Prospect> = {};
export const addAliases = (aliases: string[], field: keyof Prospect) =>
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

// --- Contact-specific column aliases ---
const CONTACT_COLUMNS: Record<string, string> = {};
const addContactAliases = (aliases: string[], field: string) =>
  aliases.forEach((a) => (CONTACT_COLUMNS[normalizeHeader(a)] = field));

addContactAliases(["first name", "fname", "given name", "first"], "firstName");
addContactAliases(["last name", "lname", "surname", "family name", "last"], "lastName");
addContactAliases(["title", "job title", "position", "role"], "title");
addContactAliases(["email", "email address", "e mail", "e-mail"], "email");
addContactAliases(["phone", "phone number", "mobile", "cell"], "phone");
addContactAliases(["company", "company name", "account", "account name", "business", "business name"], "company");
addContactAliases(["notes", "contact notes"], "notes");

// Detect if CSV headers indicate a contact import
function detectContactMode(headers: string[]): boolean {
  const normalized = headers.map(normalizeHeader);
  const hasFirstName = normalized.some((h) => CONTACT_COLUMNS[h] === "firstName" || h.includes("first name"));
  const hasLastName = normalized.some((h) => CONTACT_COLUMNS[h] === "lastName" || h.includes("last name"));
  return hasFirstName || hasLastName;
}

// Match a contact column header
function matchContactColumn(header: string): string | undefined {
  const norm = normalizeHeader(header);
  if (!norm) return undefined;
  if (CONTACT_COLUMNS[norm]) return CONTACT_COLUMNS[norm];
  for (const [alias, field] of Object.entries(CONTACT_COLUMNS)) {
    if (norm.startsWith(alias) || alias.startsWith(norm)) return field;
  }
  for (const [alias, field] of Object.entries(CONTACT_COLUMNS)) {
    if (norm.includes(alias) || alias.includes(norm)) return field;
  }
  return undefined;
}

// Fuzzy column matching: exact -> starts-with -> contains
export function matchColumn(header: string): keyof Prospect | undefined {
  const norm = normalizeHeader(header);
  if (!norm) return undefined;
  if (COLUMN_MAP[norm]) return COLUMN_MAP[norm];
  for (const [alias, field] of Object.entries(COLUMN_MAP)) {
    if (norm.startsWith(alias) || alias.startsWith(norm)) return field;
  }
  for (const [alias, field] of Object.entries(COLUMN_MAP)) {
    if (norm.includes(alias) || alias.includes(norm)) return field;
  }
  return undefined;
}

// App-only fields that CSV should never overwrite
export const PROTECTED_FIELDS = new Set(["contacts", "interactions", "noteLog", "nextStep", "nextStepDate", "ps", "id", "createdAt", "customLogo"]);

export type RowAction = "new" | "update" | "review" | "skip";
type ImportMode = "prospects" | "contacts";

interface ContactData {
  firstName: string;
  lastName: string;
  name: string;
  title: string;
  email: string;
  phone: string;
  notes: string;
  company: string;
}

export interface ParsedRow {
  raw: Record<string, string>;
  mapped: Partial<Prospect>;
  contactData?: ContactData;
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

function parseCSV(text: string): { headers: string[]; rows: Record<string, string>[] } {
  const lines = text.split(/\r?\n/).filter((l) => l.trim());
  if (lines.length < 2) return { headers: [], rows: [] };
  const headers = parseCSVLine(lines[0]);
  const rows = lines.slice(1).map((line) => {
    const vals = parseCSVLine(line);
    const obj: Record<string, string> = {};
    headers.forEach((h, i) => {
      obj[h] = vals[i] || "";
    });
    return obj;
  });
  return { headers, rows };
}

export function mapRow(raw: Record<string, string>, unmappedCols: Set<string>): Partial<Prospect> {
  const mapped: any = {};
  for (const [header, value] of Object.entries(raw)) {
    const field = matchColumn(header);
    if (!field) { unmappedCols.add(header); continue; }
    if (PROTECTED_FIELDS.has(field)) continue;
    if (!value.trim()) continue;
    if (field === "locationCount" || field === "estimatedRevenue") {
      const num = parseInt(value.replace(/[^0-9-]/g, ""));
      if (!isNaN(num)) mapped[field] = num;
    } else if (field === "website") {
      // Strip protocol so we store clean domains
      mapped[field] = value.trim().replace(/^https?:?\/?\/?\/?/i, "");
    } else {
      mapped[field] = value.trim();
    }
  }
  return mapped;
}

function mapContactRow(raw: Record<string, string>, unmappedCols: Set<string>): ContactData {
  const contact: any = { firstName: "", lastName: "", name: "", title: "", email: "", phone: "", notes: "", company: "" };
  for (const [header, value] of Object.entries(raw)) {
    const field = matchContactColumn(header);
    if (!field) { unmappedCols.add(header); continue; }
    if (!value.trim()) continue;
    contact[field] = value.trim();
  }
  // Combine first + last name
  const parts = [contact.firstName, contact.lastName].filter(Boolean);
  contact.name = parts.join(" ");
  return contact;
}

export function computeChanges(existing: Prospect, incoming: Partial<Prospect>): { changes: Partial<Prospect>; changedFields: string[] } {
  const changes: any = {};
  const changedFields: string[] = [];
  for (const [key, val] of Object.entries(incoming)) {
    if (PROTECTED_FIELDS.has(key)) continue;
    const existingVal = (existing as any)[key];
    if (val == null || val === "") continue;
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
  const [importMode, setImportMode] = useState<ImportMode>("prospects");
  const fileRef = useRef<HTMLInputElement>(null);

  const resetState = useCallback(() => {
    setRows([]);
    setFileName("");
    setStep("upload");
    setDragging(false);
    setUnmappedColumns([]);
    setImportMode("prospects");
  }, []);

  const processFile = useCallback(
    (file: File) => {
      setFileName(file.name);
      const reader = new FileReader();
      reader.onload = () => {
        const text = reader.result as string;
        const { headers, rows: rawRows } = parseCSV(text);
        if (rawRows.length === 0) {
          toast.error("No data rows found in CSV");
          return;
        }

        const isContactMode = detectContactMode(headers);
        setImportMode(isContactMode ? "contacts" : "prospects");

        const unmapped = new Set<string>();

        if (isContactMode) {
          // --- Contact import mode ---
          const parsed: ParsedRow[] = rawRows
            .map((raw) => {
              const contactData = mapContactRow(raw, unmapped);
              if (!contactData.name && !contactData.email) return null;
              if (!contactData.company) return null;

              // Match company against existing prospects
              let bestMatch: Prospect | undefined;
              let bestSim = 0;

              // Exact name match first
              const exactMatch = existingData.find(
                (p) => p.name.toLowerCase() === contactData.company.toLowerCase()
              );
              if (exactMatch) {
                bestMatch = exactMatch;
                bestSim = 1;
              } else {
                // Fuzzy match
                for (const p of existingData) {
                  const sim = stringSimilarity(p.name, contactData.company);
                  if (sim > bestSim) {
                    bestSim = sim;
                    bestMatch = p;
                  }
                }
              }

              if (bestSim > 0.7 && bestMatch) {
                // Check for duplicate contact by email
                if (contactData.email && bestMatch.contacts.some(
                  (c) => c.email.toLowerCase() === contactData.email.toLowerCase()
                )) {
                  return {
                    raw, mapped: {}, contactData, action: "skip" as RowAction,
                    matchedProspect: bestMatch, similarity: bestSim,
                    included: false, changedFields: [],
                  };
                }
                return {
                  raw, mapped: {}, contactData, action: "update" as RowAction,
                  matchedProspect: bestMatch, similarity: bestSim,
                  included: true, changedFields: ["contacts"],
                };
              }

              if (bestSim >= 0.5 && bestMatch) {
                return {
                  raw, mapped: {}, contactData, action: "review" as RowAction,
                  matchedProspect: bestMatch, similarity: bestSim,
                  included: false, changedFields: [],
                };
              }

              // No match — flag for review, never auto-create
              return {
                raw, mapped: {}, contactData, action: "review" as RowAction,
                included: false, changedFields: [],
              };
            })
            .filter(Boolean) as ParsedRow[];

          setUnmappedColumns(Array.from(unmapped));
          setRows(parsed);
          setStep("preview");
        } else {
          // --- Prospect import mode (existing logic) ---
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

              return { raw, mapped, action: "new" as RowAction, included: true, changedFields: [] };
            })
            .filter(Boolean) as ParsedRow[];

          setUnmappedColumns(Array.from(unmapped));
          setRows(parsed);
          setStep("preview");
        }
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
    if (importMode === "contacts") {
      // Contact import: group by matched prospect, append contacts
      const contactUpdates: { id: any; changes: Partial<Prospect> }[] = [];
      const includedRows = rows.filter((r) => r.included && r.matchedProspect && r.contactData);

      // Group by prospect id
      const grouped = new Map<string, { prospect: Prospect; newContacts: ContactData[] }>();
      for (const row of includedRows) {
        const pid = row.matchedProspect!.id;
        if (!grouped.has(pid)) {
          grouped.set(pid, { prospect: row.matchedProspect!, newContacts: [] });
        }
        grouped.get(pid)!.newContacts.push(row.contactData!);
      }

      for (const [id, { prospect, newContacts }] of grouped) {
        const existingContacts = [...prospect.contacts];
        const toAdd: Contact[] = newContacts
          .filter((c) => {
            // Skip if email already exists
            if (c.email && existingContacts.some((ec) => ec.email.toLowerCase() === c.email.toLowerCase())) return false;
            return true;
          })
          .map((c) => ({
            id: crypto.randomUUID(),
            name: c.name,
            email: c.email,
            phone: c.phone,
            title: c.title,
            notes: c.notes,
          }));

        if (toAdd.length > 0) {
          contactUpdates.push({
            id,
            changes: { contacts: [...existingContacts, ...toAdd] },
          });
        }
      }

      onImport([], contactUpdates);
      toast.success(`Contacts imported!`, {
        description: `${contactUpdates.reduce((sum, u) => sum + ((u.changes.contacts?.length || 0) - (grouped.get(u.id)?.prospect.contacts.length || 0)), 0)} contacts added to ${contactUpdates.length} account${contactUpdates.length !== 1 ? "s" : ""}`,
      });
    } else {
      // Prospect import (existing logic)
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
    }

    resetState();
    onOpenChange(false);
  };

  const actionBadge = (action: RowAction) => {
    switch (action) {
      case "new":
        return <Badge className="bg-emerald-500/15 text-emerald-600 border-emerald-500/30 hover:bg-emerald-500/15">NEW</Badge>;
      case "update":
        return <Badge className="bg-blue-500/15 text-blue-600 border-blue-500/30 hover:bg-blue-500/15">ADD</Badge>;
      case "review":
        return <Badge className="bg-amber-500/15 text-amber-600 border-amber-500/30 hover:bg-amber-500/15">REVIEW</Badge>;
      case "skip":
        return <Badge className="bg-muted text-muted-foreground border-border hover:bg-muted">SKIP</Badge>;
    }
  };

  const prospectActionBadge = (action: RowAction) => {
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
          <DialogTitle className="flex items-center gap-2">
            {importMode === "contacts" && <Users className="w-5 h-5 text-blue-500" />}
            {importMode === "contacts" ? "Contact Import" : "CSV Import"}
            {step === "preview" ? " Preview" : ""}
          </DialogTitle>
          <DialogDescription>
            {step === "upload"
              ? "Upload a CSV file to import prospects or contacts. The system auto-detects the file type."
              : importMode === "contacts"
              ? `File: ${fileName} — ${rows.length} contacts detected. Contacts will be added to matching accounts.`
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
            <p className="text-xs text-muted-foreground">Supports prospect CSVs and contact CSVs (with First Name, Last Name, Company)</p>
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

            {/* Contact mode info banner */}
            {importMode === "contacts" && (
              <div className="flex items-center gap-2 rounded-lg border border-blue-500/30 bg-blue-500/10 px-3 py-2 text-xs text-blue-700 dark:text-blue-400">
                <Users className="w-3.5 h-3.5 shrink-0" />
                <span>Contact import mode — contacts will be added to matched accounts. No account data will be modified.</span>
              </div>
            )}

            {/* Summary bar */}
            <div className="flex items-center gap-3 flex-wrap">
              {counts.update > 0 && (
                <span className="text-xs font-medium text-blue-600">
                  {counts.update} {importMode === "contacts" ? "Add" : "Updates"}
                </span>
              )}
              {counts.new > 0 && (
                <span className="text-xs font-medium text-emerald-600">
                  {counts.new} New
                </span>
              )}
              {counts.review > 0 && (
                <span className="text-xs font-medium text-amber-600 flex items-center gap-1">
                  <AlertTriangle className="w-3 h-3" /> {counts.review} Review
                </span>
              )}
              {counts.skip > 0 && (
                <span className="text-xs font-medium text-muted-foreground">
                  {counts.skip} {importMode === "contacts" ? "Duplicate" : "Skip"}
                </span>
              )}
            </div>

            {/* Table */}
            {/* Row count */}
            <div className="text-xs text-muted-foreground">
              {rows.length} row{rows.length !== 1 ? "s" : ""} • {includedCount} selected for import
            </div>

            <ScrollArea className="flex-1 min-h-0 max-h-[50vh] border border-border rounded-lg">
              <table className="w-full text-sm">
                <thead className="sticky top-0 bg-muted/80 backdrop-blur-sm">
                  <tr className="border-b border-border">
                    <th className="p-2 w-8" />
                    <th className="p-2 text-left text-xs font-medium text-muted-foreground">Status</th>
                    {importMode === "contacts" ? (
                      <>
                        <th className="p-2 text-left text-xs font-medium text-muted-foreground">Contact Name</th>
                        <th className="p-2 text-left text-xs font-medium text-muted-foreground">Title</th>
                        <th className="p-2 text-left text-xs font-medium text-muted-foreground">Email</th>
                        <th className="p-2 text-left text-xs font-medium text-muted-foreground">Company Match</th>
                      </>
                    ) : (
                      <>
                        <th className="p-2 text-left text-xs font-medium text-muted-foreground">Name</th>
                        <th className="p-2 text-left text-xs font-medium text-muted-foreground">Website</th>
                        <th className="p-2 text-left text-xs font-medium text-muted-foreground">Industry</th>
                        <th className="p-2 text-left text-xs font-medium text-muted-foreground">Details</th>
                      </>
                    )}
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
                      <td className="p-2">{importMode === "contacts" ? actionBadge(row.action) : prospectActionBadge(row.action)}</td>
                      {importMode === "contacts" ? (
                        <>
                          <td className="p-2 font-medium text-foreground">
                            {row.contactData?.name || "—"}
                          </td>
                          <td className="p-2 text-muted-foreground text-xs truncate max-w-[180px]">
                            {row.contactData?.title || "—"}
                          </td>
                          <td className="p-2 text-muted-foreground text-xs truncate max-w-[180px]">
                            {row.contactData?.email || "—"}
                          </td>
                          <td className="p-2 text-xs">
                            {row.matchedProspect ? (
                              <span className={row.action === "skip" ? "text-muted-foreground" : "text-blue-600"}>
                                → {row.matchedProspect.name}
                                {row.similarity && row.similarity < 1 && (
                                  <span className="text-[10px] ml-1">({Math.round(row.similarity * 100)}%)</span>
                                )}
                                {row.action === "skip" && <span className="ml-1 text-[10px]">(duplicate)</span>}
                              </span>
                            ) : (
                              <span className="text-amber-600">
                                {row.contactData?.company || "—"} <span className="text-[10px]">(no match)</span>
                              </span>
                            )}
                          </td>
                        </>
                      ) : (
                        <>
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
                        </>
                      )}
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
              {importMode === "contacts"
                ? `Import ${includedCount} Contact${includedCount !== 1 ? "s" : ""}`
                : `Confirm Import (${includedCount})`}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

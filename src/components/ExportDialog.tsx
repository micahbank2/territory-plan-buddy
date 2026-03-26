import { useState, useMemo } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Download, FileSpreadsheet, Users, Building2 } from "lucide-react";
import { toast } from "sonner";
import type { Prospect, Contact } from "@/data/prospects";

type ExportMode = "accounts" | "contacts" | "accounts_contacts";

interface AccountField {
  key: string;
  label: string;
  getValue: (p: Prospect & { ps?: number }) => string;
}

interface ContactField {
  key: string;
  label: string;
  getValue: (c: Contact) => string;
}

const ACCOUNT_FIELDS: AccountField[] = [
  { key: "name", label: "Account Name", getValue: (p) => p.name },
  { key: "website", label: "Website", getValue: (p) => p.website || "" },
  { key: "industry", label: "Industry", getValue: (p) => p.industry || "" },
  { key: "locationCount", label: "Location Count", getValue: (p) => String(p.locationCount ?? "") },
  { key: "locationNotes", label: "Location Notes", getValue: (p) => p.locationNotes || "" },
  { key: "status", label: "Status", getValue: (p) => p.status || "" },
  { key: "outreach", label: "Outreach Stage", getValue: (p) => p.outreach || "" },
  { key: "priority", label: "Priority", getValue: (p) => p.priority || "" },
  { key: "tier", label: "Tier", getValue: (p) => p.tier || "" },
  { key: "competitor", label: "Competitor", getValue: (p) => p.competitor || "" },
  { key: "score", label: "Score", getValue: (p) => String((p as any).ps ?? "") },
  { key: "estimatedRevenue", label: "Est. Revenue", getValue: (p) => String(p.estimatedRevenue ?? "") },
  { key: "lastTouched", label: "Last Touched", getValue: (p) => p.lastTouched || "" },
  { key: "notes", label: "Notes", getValue: (p) => p.notes || "" },
  { key: "contactName", label: "Primary Contact", getValue: (p) => p.contactName || "" },
  { key: "contactEmail", label: "Primary Email", getValue: (p) => p.contactEmail || "" },
  { key: "aiReadinessGrade", label: "AI Readiness Grade", getValue: (p) => (p as any).aiReadinessGrade || "" },
  { key: "aiReadinessScore", label: "AI Readiness Score", getValue: (p) => String((p as any).aiReadinessScore ?? "") },
];

const CONTACT_FIELDS: ContactField[] = [
  { key: "name", label: "Name", getValue: (c) => c.name || "" },
  { key: "title", label: "Title", getValue: (c) => c.title || "" },
  { key: "email", label: "Email", getValue: (c) => c.email || "" },
  { key: "phone", label: "Phone", getValue: (c) => c.phone || "" },
  { key: "role", label: "Role", getValue: (c) => c.role || "" },
  { key: "relationshipStrength", label: "Relationship Strength", getValue: (c) => c.relationshipStrength || "" },
  { key: "notes", label: "Notes", getValue: (c) => c.notes || "" },
  { key: "starred", label: "Starred", getValue: (c) => c.starred ? "Yes" : "No" },
];

const DEFAULT_ACCOUNT_KEYS = ["name", "website", "industry", "locationCount", "status", "outreach", "priority", "tier", "competitor", "score", "lastTouched"];
const DEFAULT_CONTACT_KEYS = ["name", "title", "email", "phone", "role"];

function escapeCSV(val: string): string {
  if (val.includes(",") || val.includes('"') || val.includes("\n")) {
    return `"${val.replace(/"/g, '""')}"`;
  }
  return val;
}

interface ExportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  prospects: (Prospect & { ps?: number })[];
}

export function ExportDialog({ open, onOpenChange, prospects }: ExportDialogProps) {
  const [mode, setMode] = useState<ExportMode>("accounts");
  const [selectedAccountFields, setSelectedAccountFields] = useState<Set<string>>(new Set(DEFAULT_ACCOUNT_KEYS));
  const [selectedContactFields, setSelectedContactFields] = useState<Set<string>>(new Set(DEFAULT_CONTACT_KEYS));

  const showAccountFields = mode === "accounts" || mode === "accounts_contacts";
  const showContactFields = mode === "contacts" || mode === "accounts_contacts";

  const toggleField = (set: Set<string>, setFn: (s: Set<string>) => void, key: string) => {
    const next = new Set(set);
    if (next.has(key)) next.delete(key); else next.add(key);
    setFn(next);
  };

  const selectAll = (fields: { key: string }[], setFn: (s: Set<string>) => void) => {
    setFn(new Set(fields.map((f) => f.key)));
  };

  const selectNone = (_fields: { key: string }[], setFn: (s: Set<string>) => void) => {
    setFn(new Set());
  };

  const stats = useMemo(() => {
    const totalContacts = prospects.reduce((sum, p) => sum + (p.contacts?.length || 0), 0);
    const accountsWithContacts = prospects.filter((p) => (p.contacts?.length || 0) > 0).length;
    return { totalContacts, accountsWithContacts };
  }, [prospects]);

  const handleExport = () => {
    if (mode === "accounts") {
      const fields = ACCOUNT_FIELDS.filter((f) => selectedAccountFields.has(f.key));
      if (fields.length === 0) { toast.error("Select at least one field"); return; }
      const headers = fields.map((f) => f.label);
      const rows = prospects.map((p) => fields.map((f) => escapeCSV(f.getValue(p))));
      downloadCSV(headers, rows, "accounts.csv");
    } else if (mode === "contacts") {
      const cFields = CONTACT_FIELDS.filter((f) => selectedContactFields.has(f.key));
      if (cFields.length === 0) { toast.error("Select at least one field"); return; }
      const headers = ["Account Name", ...cFields.map((f) => f.label)];
      const rows: string[][] = [];
      for (const p of prospects) {
        for (const c of p.contacts || []) {
          rows.push([escapeCSV(p.name), ...cFields.map((f) => escapeCSV(f.getValue(c)))]);
        }
      }
      if (rows.length === 0) { toast.error("No contacts to export"); return; }
      downloadCSV(headers, rows, "contacts.csv");
    } else {
      // accounts_contacts — one row per contact, account fields repeated
      const aFields = ACCOUNT_FIELDS.filter((f) => selectedAccountFields.has(f.key));
      const cFields = CONTACT_FIELDS.filter((f) => selectedContactFields.has(f.key));
      if (aFields.length === 0 && cFields.length === 0) { toast.error("Select at least one field"); return; }
      const headers = [...aFields.map((f) => f.label), ...cFields.map((f) => `Contact ${f.label}`)];
      const rows: string[][] = [];
      for (const p of prospects) {
        const accountVals = aFields.map((f) => escapeCSV(f.getValue(p)));
        const contacts = p.contacts || [];
        if (contacts.length === 0) {
          // Include account even if no contacts
          rows.push([...accountVals, ...cFields.map(() => "")]);
        } else {
          for (const c of contacts) {
            rows.push([...accountVals, ...cFields.map((f) => escapeCSV(f.getValue(c)))]);
          }
        }
      }
      downloadCSV(headers, rows, "accounts_contacts.csv");
    }
    onOpenChange(false);
    toast.success("📊 Export downloaded!");
  };

  const downloadCSV = (headers: string[], rows: string[][], filename: string) => {
    const csv = [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  const modeButtons: { value: ExportMode; label: string; icon: React.ReactNode; desc: string }[] = [
    { value: "accounts", label: "Accounts Only", icon: <Building2 className="w-4 h-4" />, desc: `${prospects.length} accounts` },
    { value: "contacts", label: "Contacts Only", icon: <Users className="w-4 h-4" />, desc: `${stats.totalContacts} contacts` },
    { value: "accounts_contacts", label: "Accounts + Contacts", icon: <FileSpreadsheet className="w-4 h-4" />, desc: "Combined rows" },
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[520px] max-h-[85vh] flex flex-col overflow-hidden">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Download className="w-5 h-5" /> Export Data
          </DialogTitle>
          <DialogDescription>Choose what to export and which fields to include.</DialogDescription>
        </DialogHeader>

        {/* Mode Selection */}
        <div className="grid grid-cols-3 gap-2">
          {modeButtons.map((m) => (
            <button
              key={m.value}
              onClick={() => setMode(m.value)}
              className={`flex flex-col items-center gap-1.5 p-3 rounded-lg border text-xs transition-colors ${
                mode === m.value
                  ? "border-primary bg-primary/10 text-primary font-medium"
                  : "border-border hover:bg-muted text-muted-foreground"
              }`}
            >
              {m.icon}
              <span className="font-medium text-foreground">{m.label}</span>
              <span className="text-[10px]">{m.desc}</span>
            </button>
          ))}
        </div>

        <Separator />

        {/* Field Selection */}
        <ScrollArea className="flex-1 min-h-0 max-h-[40vh] pr-2">
          <div className="space-y-4">
            {showAccountFields && (
              <div>
                <div className="flex items-center justify-between mb-2">
                  <h4 className="text-sm font-medium">Account Fields</h4>
                  <div className="flex gap-2 text-xs">
                    <button className="text-primary hover:underline" onClick={() => selectAll(ACCOUNT_FIELDS, setSelectedAccountFields)}>All</button>
                    <button className="text-muted-foreground hover:underline" onClick={() => selectNone(ACCOUNT_FIELDS, setSelectedAccountFields)}>None</button>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-x-4 gap-y-1.5">
                  {ACCOUNT_FIELDS.map((f) => (
                    <label key={f.key} className="flex items-center gap-2 text-sm cursor-pointer hover:text-foreground text-muted-foreground">
                      <Checkbox
                        checked={selectedAccountFields.has(f.key)}
                        onCheckedChange={() => toggleField(selectedAccountFields, setSelectedAccountFields, f.key)}
                      />
                      {f.label}
                    </label>
                  ))}
                </div>
              </div>
            )}

            {showAccountFields && showContactFields && <Separator />}

            {showContactFields && (
              <div>
                <div className="flex items-center justify-between mb-2">
                  <h4 className="text-sm font-medium">Contact Fields</h4>
                  <div className="flex gap-2 text-xs">
                    <button className="text-primary hover:underline" onClick={() => selectAll(CONTACT_FIELDS, setSelectedContactFields)}>All</button>
                    <button className="text-muted-foreground hover:underline" onClick={() => selectNone(CONTACT_FIELDS, setSelectedContactFields)}>None</button>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-x-4 gap-y-1.5">
                  {CONTACT_FIELDS.map((f) => (
                    <label key={f.key} className="flex items-center gap-2 text-sm cursor-pointer hover:text-foreground text-muted-foreground">
                      <Checkbox
                        checked={selectedContactFields.has(f.key)}
                        onCheckedChange={() => toggleField(selectedContactFields, setSelectedContactFields, f.key)}
                      />
                      {f.label}
                    </label>
                  ))}
                </div>
              </div>
            )}
          </div>
        </ScrollArea>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleExport} className="gap-2">
            <Download className="w-4 h-4" /> Export CSV
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

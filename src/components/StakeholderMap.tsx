import { cn } from "@/lib/utils";
import { Check, X, Minus } from "lucide-react";
import type { Contact, ContactRole } from "@/data/prospects";
import { CONTACT_ROLES } from "@/data/prospects";
import { RoleBadge, StrengthDot } from "./ContactBadges";

const COLUMNS: { label: string; roles: ContactRole[] }[] = [
  { label: "Power", roles: ["Executive Sponsor", "Decision Maker"] },
  { label: "Influence", roles: ["Champion", "Influencer"] },
  { label: "Evaluation", roles: ["Technical Evaluator", "End User"] },
  { label: "Risk", roles: ["Blocker"] },
];

interface StakeholderMapProps {
  contacts: Contact[];
  onClickContact?: (contact: Contact) => void;
}

export function StakeholderMap({ contacts, onClickContact }: StakeholderMapProps) {
  if (!contacts || contacts.length === 0) {
    return <p className="text-xs text-muted-foreground py-2">Add contacts with roles to see the stakeholder map.</p>;
  }

  const hasRoles = contacts.some(c => c.role && c.role !== "Unknown");
  if (!hasRoles) {
    return <p className="text-xs text-muted-foreground py-2">Assign roles to contacts to populate the stakeholder map.</p>;
  }

  const columnsToShow = COLUMNS.filter(col => {
    if (col.label === "Risk") {
      return contacts.some(c => c.role && col.roles.includes(c.role));
    }
    return true;
  });

  // Coverage summary
  const coveredRoles = new Set(contacts.map(c => c.role).filter(Boolean));
  const keyRoles: ContactRole[] = ["Champion", "Decision Maker", "Technical Evaluator", "Blocker", "Executive Sponsor"];

  return (
    <div className="space-y-4">
      {/* Map columns */}
      <div className={cn("grid gap-3", `grid-cols-${columnsToShow.length}`)}>
        {columnsToShow.map(col => {
          const colContacts = contacts.filter(c => c.role && col.roles.includes(c.role));
          return (
            <div key={col.label} className="space-y-2">
              <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider text-center">{col.label}</div>
              {colContacts.length === 0 ? (
                <div className="p-3 border border-dashed border-border rounded-lg text-center">
                  <span className="text-[10px] text-muted-foreground">None</span>
                </div>
              ) : (
                colContacts.map(c => (
                  <div
                    key={c.id}
                    className="p-2.5 border border-border rounded-lg hover:border-primary/30 transition-colors cursor-pointer bg-card"
                    onClick={() => onClickContact?.(c)}
                  >
                    <div className="font-medium text-xs text-foreground">{c.name}</div>
                    {c.title && <div className="text-[10px] text-muted-foreground">{c.title}</div>}
                    <div className="flex items-center gap-1.5 mt-1.5">
                      <RoleBadge role={c.role} />
                    </div>
                    <div className="mt-1">
                      <StrengthDot strength={c.relationshipStrength} />
                    </div>
                  </div>
                ))
              )}
            </div>
          );
        })}
      </div>

      {/* Coverage Summary */}
      <div className="pt-3 border-t border-border">
        <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-2">Coverage Summary</div>
        <div className="flex flex-wrap gap-2">
          {keyRoles.map(role => {
            const has = coveredRoles.has(role);
            const isBlocker = role === "Blocker";
            return (
              <span key={role} className="inline-flex items-center gap-1 text-[10px]">
                {isBlocker ? (
                  <Minus className="w-3 h-3 text-muted-foreground" />
                ) : has ? (
                  <Check className="w-3 h-3 text-[hsl(var(--success))]" />
                ) : (
                  <X className="w-3 h-3 text-destructive" />
                )}
                <span className={cn("font-medium", has || isBlocker ? "text-foreground" : "text-muted-foreground")}>{role}</span>
              </span>
            );
          })}
        </div>
      </div>
    </div>
  );
}

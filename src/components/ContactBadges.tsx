import { cn } from "@/lib/utils";
import { Star, Crown, Shield } from "lucide-react";
import type { ContactRole, RelationshipStrength } from "@/data/prospects";

export const ROLE_CONFIG: Record<string, { color: string; bg: string; icon?: React.ComponentType<any> }> = {
  Champion: { color: "text-[hsl(var(--success))]", bg: "bg-[hsl(var(--success))]/15", icon: Star },
  "Decision Maker": { color: "text-primary", bg: "bg-primary/15", icon: Crown },
  Influencer: { color: "text-blue-600 dark:text-blue-400", bg: "bg-blue-500/15" },
  "Technical Evaluator": { color: "text-purple-600 dark:text-purple-400", bg: "bg-purple-500/15" },
  Blocker: { color: "text-destructive", bg: "bg-destructive/15", icon: Shield },
  "End User": { color: "text-muted-foreground", bg: "bg-muted" },
  "Executive Sponsor": { color: "text-amber-600 dark:text-amber-400", bg: "bg-amber-500/15" },
  Unknown: { color: "text-muted-foreground/60", bg: "bg-muted/50" },
};

export const STRENGTH_CONFIG: Record<string, { color: string; pulse?: boolean; hollow?: boolean }> = {
  Strong: { color: "bg-[hsl(var(--success))]" },
  Warm: { color: "bg-amber-500" },
  Cold: { color: "bg-blue-500" },
  "At Risk": { color: "bg-destructive", pulse: true },
  Unknown: { color: "border border-muted-foreground/40", hollow: true },
};

export function RoleBadge({ role }: { role?: ContactRole }) {
  const r = role || "Unknown";
  const cfg = ROLE_CONFIG[r] || ROLE_CONFIG.Unknown;
  const Icon = cfg.icon;
  return (
    <span className={cn("inline-flex items-center gap-1 px-1.5 py-0.5 text-[10px] font-semibold rounded-md", cfg.bg, cfg.color)}>
      {Icon && <Icon className="w-2.5 h-2.5" />}
      {r}
    </span>
  );
}

export function StrengthDot({ strength }: { strength?: RelationshipStrength }) {
  const s = strength || "Unknown";
  const cfg = STRENGTH_CONFIG[s] || STRENGTH_CONFIG.Unknown;
  return (
    <span className="inline-flex items-center gap-1">
      <span
        className={cn(
          "w-2 h-2 rounded-full inline-block shrink-0",
          cfg.hollow ? cfg.color : cfg.color,
          cfg.pulse && "animate-pulse"
        )}
        style={cfg.hollow ? { backgroundColor: "transparent" } : undefined}
      />
      <span className="text-[9px] text-muted-foreground">{s}</span>
    </span>
  );
}

export function RoleSelect({ value, onChange, className }: { value?: string; onChange: (v: string) => void; className?: string }) {
  const { CONTACT_ROLES } = require("@/data/prospects");
  return (
    <select value={value || "Unknown"} onChange={e => onChange(e.target.value)} className={className}>
      {CONTACT_ROLES.map((r: string) => <option key={r} value={r}>{r}</option>)}
    </select>
  );
}

export function StrengthSelect({ value, onChange, className }: { value?: string; onChange: (v: string) => void; className?: string }) {
  const { RELATIONSHIP_STRENGTHS } = require("@/data/prospects");
  return (
    <select value={value || "Unknown"} onChange={e => onChange(e.target.value)} className={className}>
      {RELATIONSHIP_STRENGTHS.map((s: string) => <option key={s} value={s}>{s}</option>)}
    </select>
  );
}

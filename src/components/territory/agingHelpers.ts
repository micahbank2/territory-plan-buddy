import type { Prospect } from "@/data/prospects";

export function getAgingClass(interactions: Prospect["interactions"]): string {
  if (!interactions || interactions.length === 0) return "aging-gray";
  const latest = Math.max(...interactions.map((i) => new Date(i.date).getTime()));
  const days = Math.floor((Date.now() - latest) / 86400000);
  if (days < 7) return "aging-green";
  if (days <= 30) return "aging-yellow";
  return "aging-red";
}

export function getAgingLabel(interactions: Prospect["interactions"]): string {
  if (!interactions || interactions.length === 0) return "Never contacted";
  const latest = Math.max(...interactions.map((i) => new Date(i.date).getTime()));
  const days = Math.floor((Date.now() - latest) / 86400000);
  if (days === 0) return "Contacted today";
  if (days === 1) return "1 day ago";
  return `${days} days ago`;
}

export function relativeTime(dateStr: string): string {
  const now = new Date();
  const then = new Date(dateStr);
  const diffMs = now.getTime() - then.getTime();
  const diffDays = Math.floor(diffMs / 86400000);
  if (diffDays === 0) return "today";
  if (diffDays === 1) return "yesterday";
  if (diffDays < 7) return `${diffDays}d ago`;
  if (diffDays < 30) return `${Math.floor(diffDays / 7)}w ago`;
  return `${Math.floor(diffDays / 30)}mo ago`;
}

export const STAGE_COLORS: Record<string, string> = {
  "Not Started": "hsl(225, 15%, 50%)",
  "Actively Prospecting": "hsl(236, 64%, 57%)",
  "Meeting Booked": "hsl(38, 92%, 55%)",
  "Closed Lost": "hsl(0, 65%, 55%)",
  "Closed Won": "hsl(152, 65%, 38%)",
};

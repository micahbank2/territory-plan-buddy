import type { Contact, Prospect } from "@/data/prospects";
import { scoreProspect, scoreBreakdown, getScoreLabel, CONTACT_ROLES } from "@/data/prospects";
import type { Signal } from "@/hooks/useSignals";

export interface ContactSelection {
  contact: Contact;
  prospect: Prospect;
  signals: Signal[];
}

const KEY_ROLES = ["Champion", "Decision Maker", "Executive Sponsor"] as const;

export function buildContactPrompt(selections: ContactSelection[]): string {
  if (selections.length === 0) return "";

  // Group by prospect
  const byProspect = new Map<string, { prospect: Prospect; signals: Signal[]; contacts: Contact[] }>();
  for (const s of selections) {
    const key = s.prospect.id;
    if (!byProspect.has(key)) {
      byProspect.set(key, { prospect: s.prospect, signals: s.signals, contacts: [] });
    }
    byProspect.get(key)!.contacts.push(s.contact);
  }

  const sections: string[] = [];

  // Header
  sections.push(`You are drafting personalized outreach emails for Micah Bank, a Senior Account Executive at Yext covering Mid-Enterprise North.

Yext's key products: Listings, Pages, Reviews, Search (Scout), Reputation Management, Analytics.
Position Yext around: AI search visibility, multi-location brand consistency, local SEO at scale, competitive displacement of SOCi/Birdeye.

For each contact below, write one personalized first-touch cold email. Rules:
- Lead with a specific insight about their business, not a generic opener
- Under 150 words
- Reference the account's specific context (industry, location count, competitor situation)
- Low-friction CTA (quick question, not a demo request)
- Conversational tone, not corporate
- Email body only (no subject line or signature)
- If AI readiness data or signals are available, weave them in naturally`);

  let contactNum = 0;
  for (const [, group] of byProspect) {
    const { prospect: p, signals, contacts } = group;
    const score = scoreProspect(p);
    const breakdown = scoreBreakdown(p);
    const label = getScoreLabel(score);

    // Find missing key roles at this account
    const existingRoles = new Set(p.contacts.map(c => c.role).filter(Boolean));
    const missingRoles = KEY_ROLES.filter(r => !existingRoles.has(r));

    for (const contact of contacts) {
      contactNum++;
      const lines: string[] = [];

      lines.push(`---\n\n## ${contactNum}. ${contact.name} — ${p.name}`);

      // Contact info
      const contactParts = [contact.name];
      if (contact.title) contactParts.push(contact.title);
      lines.push(`**Contact:** ${contactParts.join(", ")}${contact.email ? ` <${contact.email}>` : " (no email on file — find before sending)"}`);
      if (contact.role && contact.role !== "Unknown") lines.push(`**Role:** ${contact.role}`);
      if (contact.relationshipStrength && contact.relationshipStrength !== "Unknown") lines.push(`**Relationship:** ${contact.relationshipStrength}`);

      // Account context
      lines.push("");
      lines.push("**Account Context:**");
      const ctx: string[] = [];
      if (p.industry) ctx.push(`Industry: ${p.industry}`);
      if (p.locationCount) ctx.push(`Locations: ${p.locationCount}`);
      if (p.tier) ctx.push(`Tier: ${p.tier}`);
      if (p.priority) ctx.push(`Priority: ${p.priority}`);
      if (p.outreach) ctx.push(`Stage: ${p.outreach}`);
      if (p.competitor) ctx.push(`Competitor: ${p.competitor}`);
      lines.push(`- ${ctx.join(" | ")}`);
      lines.push(`- Score: ${score} (${label.short} — ${label.label})${breakdown.length > 0 ? ` — ${breakdown.map(b => `${b.label} ${b.value > 0 ? "+" : ""}${b.value}`).join(", ")}` : ""}`);

      if (missingRoles.length > 0) {
        lines.push(`- Missing key roles: ${missingRoles.join(", ")}`);
      }

      // AI readiness
      if (p.aiReadinessData) {
        const ai = p.aiReadinessData;
        lines.push("");
        lines.push("**AI Readiness:**");
        if (ai.summary) lines.push(`- ${ai.summary}`);
        if (ai.strengths?.length) lines.push(`- Strengths: ${ai.strengths.join("; ")}`);
        if (ai.risks?.length) lines.push(`- Risks: ${ai.risks.join("; ")}`);
        if (ai.yext_opportunity) lines.push(`- Yext Opportunity: ${ai.yext_opportunity}`);
        if (ai.talking_point) lines.push(`- Talking Point: ${ai.talking_point}`);
      }

      // Recent interactions (last 3)
      if (p.interactions?.length) {
        const recent = p.interactions.slice(-3);
        lines.push("");
        lines.push("**Recent Activity:**");
        for (const i of recent) {
          lines.push(`- ${i.date}: ${i.type}${i.notes ? ` — ${i.notes}` : ""}`);
        }
      }

      // Signals
      if (signals.length > 0) {
        lines.push("");
        lines.push("**Signals:**");
        for (const sig of signals) {
          lines.push(`- ${sig.title} (${sig.signal_type}, ${sig.relevance})${sig.description ? `: ${sig.description}` : ""}`);
        }
      }

      sections.push(lines.join("\n"));
    }
  }

  return sections.join("\n\n");
}

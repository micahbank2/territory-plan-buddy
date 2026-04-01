import type { Contact, Prospect } from "@/data/prospects";
import { scoreProspect, scoreBreakdown, getScoreLabel, CONTACT_ROLES } from "@/data/prospects";
import type { Signal } from "@/hooks/useSignals";

export interface ContactSelection {
  contact: Contact;
  prospect: Prospect;
  signals: Signal[];
}

const KEY_ROLES = ["Champion", "Decision Maker", "Executive Sponsor"] as const;

/**
 * Build context-aware tone instructions based on the status of accounts in the selection.
 */
function buildToneGuidance(selections: ContactSelection[], filterSummary: string[]): string {
  const statuses = new Set(selections.map(s => s.prospect.status));
  const parts: string[] = [];

  if (statuses.has("Churned")) {
    parts.push(`**For CHURNED accounts:** These brands have used Yext in the past but parted ways. Acknowledge the prior relationship tactfully — don't ignore it. Lead with what's changed at Yext since they left (new AI capabilities, product improvements). Frame it as a fresh conversation, not a hard sell. Example hook: "I know [brand] worked with Yext previously — a lot has changed on our end since then, especially around AI search visibility."`);
  }
  if (statuses.has("Closed Lost Prospect")) {
    parts.push(`**For CLOSED LOST PROSPECT accounts:** These were evaluated but not chosen. Don't reference the prior evaluation directly unless the contact was involved. Instead, lead with new developments or a different angle than what was pitched before. Be genuinely curious about what they went with and how it's working.`);
  }
  if (statuses.has("Customer")) {
    parts.push(`**For CUSTOMER accounts:** These are existing Yext customers. Focus on expansion, upsell, or cross-sell. Reference products they likely already use and position additional capabilities. Tone should be collaborative partner, not cold prospector.`);
  }

  if (parts.length === 0) return "";

  return `\n## TONE GUIDANCE BY ACCOUNT STATUS\n\n${parts.join("\n\n")}\n`;
}

export function buildContactPrompt(selections: ContactSelection[], filterSummary: string[] = []): string {
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
  let header = `You are drafting personalized outreach emails for Micah Bank, a Senior Account Executive at Yext covering Mid-Enterprise North.

Yext's key products: Listings, Pages, Reviews, Search (Scout), Reputation Management, Analytics.
Position Yext around: AI search visibility, multi-location brand consistency, local SEO at scale, competitive displacement of SOCi/Birdeye.`;

  // Add filter context if filters were applied
  if (filterSummary.length > 0) {
    header += `\n\n**Selection Context:** These contacts were filtered by: ${filterSummary.join(" | ")}. Keep this context in mind when crafting emails — the filtering criteria reflects Micah's outreach strategy for this batch.`;
  }

  // Add tone guidance based on account statuses in selection
  const toneGuidance = buildToneGuidance(selections, filterSummary);
  if (toneGuidance) {
    header += "\n" + toneGuidance;
  }

  header += `
## CONTEXT IS YOUR RESEARCH

The account data below is your pre-loaded research. Treat every field — signals, AI readiness, notes, interactions, competitor, contact role — as intelligence you already have. Use it to build the hook. Do not re-summarize it; use it.

## WRITE EMAILS

For each contact below, write one personalized first-touch cold email using the cold-email-ae skill framework.

**Rules:**
- 50–80 words max for the email body (tighter is better)
- Lead with an illumination question or timeline hook — pick the sharpest one for this account
- One-sentence solution framed as an outcome, not features
- Non-assumptive CTA — give them the freedom to say no
- Match tone to account status (see TONE GUIDANCE above if provided)
- Weave in signals, AI readiness, or contact notes naturally if present
- End the email the moment the ask is made — nothing after the CTA

## OUTPUT FORMAT

Return a clean artifact. For EACH contact:

---

**To:** [Full Name] <[email@domain.com]>
**Subject:** [2–5 words, specific, lowercase preferred]

[Email body — 50–80 words, 3 blocks max]

Micah Bank | Yext

---

If a contact has no email on file, write "EMAIL NEEDED" in the To field but still write the email.`;

  sections.push(header);

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

      lines.push(`---\n\n## ${contactNum}. ${contact.name} — ${p.name}${p.website ? ` (${p.website})` : ""}`);

      // Contact info
      const contactParts = [contact.name];
      if (contact.title) contactParts.push(contact.title);
      lines.push(`**Contact:** ${contactParts.join(", ")}${contact.email ? ` <${contact.email}>` : " (no email on file — find before sending)"}`);
      if (contact.role && contact.role !== "Unknown") lines.push(`**Role:** ${contact.role}`);
      if (contact.relationshipStrength && contact.relationshipStrength !== "Unknown") lines.push(`**Relationship:** ${contact.relationshipStrength}`);
      if (contact.linkedinUrl) lines.push(`**LinkedIn:** ${contact.linkedinUrl}`);
      if (contact.notes?.trim()) lines.push(`**Contact Notes:** ${contact.notes.trim()}`);

      // Account context
      lines.push("");
      lines.push("**Account Context:**");
      const ctx: string[] = [];
      if (p.status && p.status !== "Prospect") ctx.push(`Status: ${p.status}`);
      if (p.industry) ctx.push(`Industry: ${p.industry}`);
      if (p.locationCount) ctx.push(`Locations: ${p.locationCount}`);
      if (p.tier) ctx.push(`Tier: ${p.tier}`);
      if (p.priority) ctx.push(`Priority: ${p.priority}`);
      if (p.outreach) ctx.push(`Stage: ${p.outreach}`);
      if (p.competitor) ctx.push(`Competitor: ${p.competitor}`);
      if ((p as any).activeAcv) ctx.push(`Active ACV: $${(p as any).activeAcv.toLocaleString()}`);
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

      // Notes
      if (p.noteLog?.length) {
        const recentNotes = p.noteLog.slice(-3);
        lines.push("");
        lines.push("**Account Notes:**");
        for (const n of recentNotes) {
          const dateStr = n.timestamp ? new Date(n.timestamp).toLocaleDateString() : "";
          const text = n.text.replace(/<[^>]*>/g, "").trim();
          if (text) lines.push(`- ${dateStr ? `${dateStr}: ` : ""}${text}`);
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

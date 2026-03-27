import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const {
      mode, name, industry, locationCount, competitor, tier, contacts,
      recentInteraction, priority, interactions, tasks, notes, score, website,
    } = body;

    const ANTHROPIC_API_KEY = Deno.env.get("ANTHROPIC_API_KEY");
    if (!ANTHROPIC_API_KEY) {
      throw new Error("ANTHROPIC_API_KEY is not configured");
    }

    const contactSummary = (contacts || [])
      .map((c: { name: string; role?: string; title?: string; relationshipStrength?: string; notes?: string }) =>
        `${c.name}${c.title ? ` (${c.title})` : ""}${c.role && c.role !== "Unknown" ? ` — ${c.role}` : ""}${c.relationshipStrength && c.relationshipStrength !== "Unknown" ? ` [${c.relationshipStrength}]` : ""}${c.notes ? ` | ${c.notes}` : ""}`
      )
      .join("; ") || "No contacts on file";

    let systemPrompt: string;
    let userPrompt: string;
    let maxTokens = 1000;
    let responseKey = "draft";

    if (mode === "research") {
      // ---- RESEARCH MODE ----
      systemPrompt = "You are a sales intelligence researcher for a Yext Senior AE. Research companies and find real, recent, actionable intelligence. Always respond with a valid JSON array only — no markdown, no code fences, no extra text.";
      maxTokens = 2000;
      responseKey = "findings";

      userPrompt = `Research this company and find recent, actionable intelligence:

Company: ${name}
Website: ${website || "unknown"}
Industry: ${industry || "unknown"}
Locations: ${locationCount ?? "unknown"}
Current Competitor: ${competitor || "unknown"}
Known Contacts: ${contactSummary}

Search for:
1. Recent leadership changes (new CMO, VP Marketing, VP Digital, CTO) in the last 6 months
2. Company news (expansion, new locations, acquisitions, rebrand, funding)
3. Mentions of local SEO, listings management, reputation management, or digital presence
4. Competitor mentions (SOCi, Birdeye, Uberall, Chatmeter, Rio SEO, Podium)
5. Public job postings related to marketing, digital, or local SEO

Return ONLY a valid JSON array. Each item:
{
  "title": "Short headline",
  "description": "2-3 sentence summary with specific details",
  "signal_type": one of "Leadership Change", "Expansion", "Competitor Contract Ending", "Bad Reviews / Reputation Issue", "Rebrand / Redesign", "Acquisition / Merger", "New Locations", "Funding Round", "Tech Vendor Evaluation", "Website Redesign", "Other",
  "relevance": "Hot" or "Warm" or "Low",
  "source": "Where this info comes from (e.g. Press Release, LinkedIn, Job Board, Google News)"
}

Return 0-6 findings. Only include real, recent info (last 12 months). If nothing notable, return [].`;
    } else if (mode === "meeting-prep") {
      // ---- MEETING PREP MODE ----
      const interactionLines = (interactions || [])
        .slice(-10)
        .reverse()
        .map((i: { type: string; date: string; notes?: string }) =>
          `- ${i.date}: ${i.type}${i.notes ? ` — "${i.notes}"` : ""}`)
        .join("\n") || "No interactions logged";

      const taskLines = (tasks || [])
        .map((t: { text: string; dueDate?: string }) =>
          `- ${t.text}${t.dueDate ? ` (due: ${t.dueDate})` : ""}`)
        .join("\n") || "No open tasks";

      const noteLines = (notes || [])
        .slice(-5)
        .reverse()
        .map((n: { text: string }) => `- ${n.text}`)
        .join("\n") || "No notes";

      systemPrompt = "You are an elite B2B enterprise sales strategist. Generate concise, actionable meeting prep briefs that help AEs walk into meetings prepared and confident.";
      maxTokens = 2000;
      responseKey = "brief";

      userPrompt = `You are helping a Senior AE at Yext prepare for a meeting with a multi-location brand prospect. Generate a one-page meeting prep brief.

ACCOUNT DATA:
- Company: ${name}
- Website: ${website || "unknown"}
- Industry: ${industry || "unknown"}
- Location count: ${locationCount ?? "unknown"}
- Tier: ${tier || "untiered"}
- Priority: ${priority || "none"}
- Current competitor/solution: ${competitor || "none known"}
- Account score: ${score ?? "N/A"}/100

CONTACTS:
${contactSummary}

RECENT INTERACTIONS (newest first):
${interactionLines}

OPEN TASKS:
${taskLines}

NOTES:
${noteLines}

Generate the brief with these sections:
1. **Situation Summary** — 2-3 sentences on who they are, where they stand, and why we're meeting
2. **Key Contacts & Roles** — Who matters, their role in the deal, relationship status
3. **Open Items & Risks** — Overdue tasks, gaps (missing decision maker?), competitive threats
4. **Recommended Talking Points** — 3-5 specific, insight-led points to drive the conversation. Position Yext around AI search visibility, multi-location brand consistency, and local SEO at scale.
5. **Suggested Ask** — The one thing to close on in this meeting (next step, intro, demo, etc.)

Keep it concise and actionable. Use bullet points. No fluff.`;
    } else {
      // ---- OUTREACH MODE (default) ----
      const interactionSummary = recentInteraction
        ? `Most recent interaction: ${recentInteraction.type} on ${recentInteraction.date}${recentInteraction.notes ? ` — "${recentInteraction.notes}"` : ""}`
        : "No prior interactions logged";

      systemPrompt = "You are an elite B2B sales development writer. Write concise, insight-led cold emails that feel personal and relevant. No fluff.";
      responseKey = "draft";

      userPrompt = `You are a Senior AE at Yext writing a cold outreach email to a multi-location brand prospect. Write a short, personalized first-touch cold email.

PROSPECT CONTEXT:
- Company: ${name}
- Industry: ${industry || "unknown"}
- Location count: ${locationCount ?? "unknown"}
- Current competitor/solution: ${competitor || "none known"}
- Tier: ${tier || "untiered"}
- Known contacts: ${contactSummary}
- ${interactionSummary}

RULES:
1. Lead with a specific, relevant insight about their business or industry — NOT a generic opener like "I hope this finds you well" or "I noticed your company..."
2. Connect the insight to how Yext helps multi-location brands with AI search visibility, listings accuracy, reviews management, or local SEO at scale
3. Keep it under 150 words
4. End with a low-friction CTA (e.g. "Worth a 15-min look?" or "Open to a quick call this week?")
5. If a competitor is known, subtly position against them without naming them negatively
6. Use a conversational, confident tone — not salesy or formal
7. Write ONLY the email body (no subject line, no signature block)
8. If contacts are known, optionally reference the right person to loop in

Return ONLY the email text, no markdown formatting, no extra commentary.`;
    }

    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514",
        max_tokens: maxTokens,
        system: systemPrompt,
        messages: [{ role: "user", content: userPrompt }],
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded. Please try again later." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const errorText = await response.text();
      console.error("Anthropic API error:", response.status, errorText);
      throw new Error(`Anthropic API error: ${response.status}`);
    }

    const data = await response.json();
    const text = data.content?.[0]?.text || "";

    // Research mode returns parsed JSON array
    if (mode === "research") {
      let findings;
      try {
        const jsonMatch = text.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
        const raw = jsonMatch ? jsonMatch[1].trim() : text.trim();
        findings = JSON.parse(raw);
        if (!Array.isArray(findings)) findings = [];
      } catch {
        console.error("Failed to parse research JSON:", text);
        findings = [];
      }
      return new Response(JSON.stringify({ findings }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ [responseKey]: text.trim() }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("chat error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

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
    console.log("[draft-outreach] incoming request — mode:", body.mode, "name:", body.name);

    const {
      mode, name, industry, locationCount, competitor, tier, contacts,
      recentInteraction, priority, interactions, tasks, notes, score, website,
    } = body;

    const ANTHROPIC_API_KEY = Deno.env.get("ANTHROPIC_API_KEY");
    if (!ANTHROPIC_API_KEY) {
      throw new Error("ANTHROPIC_API_KEY is not configured");
    }

    let systemPrompt: string;
    let userPrompt: string;
    let maxTokens = 1000;
    let responseKey = "draft";

    if (mode === "meeting-prep") {
      // ---- MEETING PREP ----
      const contactLines = (contacts || [])
        .map((c: { name: string; role?: string; title?: string; relationshipStrength?: string; notes?: string }) =>
          `- ${c.name}${c.title ? ` (${c.title})` : ""}${c.role && c.role !== "Unknown" ? ` — Role: ${c.role}` : ""}${c.relationshipStrength && c.relationshipStrength !== "Unknown" ? `, Relationship: ${c.relationshipStrength}` : ""}${c.notes ? ` | Notes: ${c.notes}` : ""}`)
        .join("\n") || "No contacts on file";

      const interactionLines = (interactions || [])
        .slice(-10).reverse()
        .map((i: { type: string; date: string; notes?: string }) =>
          `- ${i.date}: ${i.type}${i.notes ? ` — "${i.notes}"` : ""}`)
        .join("\n") || "No interactions logged";

      const taskLines = (tasks || [])
        .map((t: { text: string; dueDate?: string }) =>
          `- ${t.text}${t.dueDate ? ` (due: ${t.dueDate})` : ""}`)
        .join("\n") || "No open tasks";

      const noteLines = (notes || [])
        .slice(-5).reverse()
        .map((n: { text: string }) => `- ${n.text}`)
        .join("\n") || "No notes";

      systemPrompt = "You are an elite B2B enterprise sales strategist. Generate concise, actionable meeting prep briefs that help AEs walk into meetings prepared and confident.";
      maxTokens = 1000;
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
${contactLines}

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
      // ---- OUTREACH (default) ----
      const contactSummary = (contacts || [])
        .map((c: { name: string; role?: string; title?: string }) =>
          `${c.name}${c.title ? ` (${c.title})` : ""}${c.role && c.role !== "Unknown" ? ` — ${c.role}` : ""}`)
        .join("; ") || "No contacts on file";

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
    console.log("[draft-outreach] responseKey:", responseKey, "text length:", text.length, "stop_reason:", data.stop_reason);

    return new Response(JSON.stringify({ [responseKey]: text.trim() }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("draft-outreach error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

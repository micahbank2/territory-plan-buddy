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
    const {
      name, industry, locationCount, competitor, tier, priority,
      contacts, interactions, tasks, notes, score, website,
    } = await req.json();

    const ANTHROPIC_API_KEY = Deno.env.get("ANTHROPIC_API_KEY");
    if (!ANTHROPIC_API_KEY) {
      throw new Error("ANTHROPIC_API_KEY is not configured");
    }

    const contactSummary = (contacts || [])
      .map((c: { name: string; role?: string; title?: string; relationshipStrength?: string; notes?: string }) =>
        `- ${c.name}${c.title ? ` (${c.title})` : ""}${c.role && c.role !== "Unknown" ? ` — Role: ${c.role}` : ""}${c.relationshipStrength && c.relationshipStrength !== "Unknown" ? `, Relationship: ${c.relationshipStrength}` : ""}${c.notes ? ` | Notes: ${c.notes}` : ""}`
      )
      .join("\n") || "No contacts on file";

    const interactionSummary = (interactions || [])
      .slice(-10)
      .reverse()
      .map((i: { type: string; date: string; notes?: string }) =>
        `- ${i.date}: ${i.type}${i.notes ? ` — "${i.notes}"` : ""}`
      )
      .join("\n") || "No interactions logged";

    const taskSummary = (tasks || [])
      .map((t: { text: string; dueDate?: string }) =>
        `- ${t.text}${t.dueDate ? ` (due: ${t.dueDate})` : ""}`
      )
      .join("\n") || "No open tasks";

    const notesSummary = (notes || [])
      .slice(-5)
      .reverse()
      .map((n: { text: string; timestamp?: string }) => `- ${n.text}`)
      .join("\n") || "No notes";

    const userPrompt = `You are helping a Senior AE at Yext prepare for a meeting with a multi-location brand prospect. Generate a one-page meeting prep brief.

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
${interactionSummary}

OPEN TASKS:
${taskSummary}

NOTES:
${notesSummary}

Generate the brief with these sections:
1. **Situation Summary** — 2-3 sentences on who they are, where they stand, and why we're meeting
2. **Key Contacts & Roles** — Who matters, their role in the deal, relationship status
3. **Open Items & Risks** — Overdue tasks, gaps (missing decision maker?), competitive threats
4. **Recommended Talking Points** — 3-5 specific, insight-led points to drive the conversation. Position Yext around AI search visibility, multi-location brand consistency, and local SEO at scale.
5. **Suggested Ask** — The one thing to close on in this meeting (next step, intro, demo, etc.)

Keep it concise and actionable. Use bullet points. No fluff.`;

    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514",
        max_tokens: 2000,
        system: "You are an elite B2B enterprise sales strategist. Generate concise, actionable meeting prep briefs that help AEs walk into meetings prepared and confident.",
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
    const brief = data.content?.[0]?.text || "";

    return new Response(JSON.stringify({ brief: brief.trim() }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("meeting-prep error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

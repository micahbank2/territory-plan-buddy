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
    const { name, industry, locationCount, competitor, tier, contacts, recentInteraction } = await req.json();

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const contactSummary = (contacts || [])
      .map((c: { name: string; role?: string; title?: string }) =>
        `${c.name}${c.title ? ` (${c.title})` : ""}${c.role && c.role !== "Unknown" ? ` — ${c.role}` : ""}`
      )
      .join("; ") || "No contacts on file";

    const interactionSummary = recentInteraction
      ? `Most recent interaction: ${recentInteraction.type} on ${recentInteraction.date}${recentInteraction.notes ? ` — "${recentInteraction.notes}"` : ""}`
      : "No prior interactions logged";

    const prompt = `You are a Senior AE at Yext writing a cold outreach email to a multi-location brand prospect. Write a short, personalized first-touch cold email.

PROSPECT CONTEXT:
- Company: ${name}
- Industry: ${industry || "unknown"}
- Location count: ${locationCount || "unknown"}
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

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514",
        max_tokens: 1000,
        messages: [
          { role: "system", content: "You are an elite B2B sales development writer. Write concise, insight-led cold emails that feel personal and relevant. No fluff." },
          { role: "user", content: prompt },
        ],
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
      console.error("AI gateway error:", response.status, errorText);
      throw new Error(`AI gateway error: ${response.status}`);
    }

    const data = await response.json();
    const emailDraft = data.choices?.[0]?.message?.content || "";

    return new Response(JSON.stringify({ draft: emailDraft.trim() }), {
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

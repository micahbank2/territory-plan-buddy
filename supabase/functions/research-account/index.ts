import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const { companyName, website, industry, locationCount, contacts, competitor } = await req.json();

    if (!companyName) throw new Error("companyName is required");

    const contactContext = (contacts || [])
      .slice(0, 5)
      .map((c: any) => `${c.name}${c.title ? ` (${c.title})` : ""}`)
      .join(", ");

    const prompt = `You are a sales research assistant for a Yext Senior Account Executive prospecting multi-location brands.

Research this company and find recent, actionable intelligence:

Company: ${companyName}
Website: ${website || "unknown"}
Industry: ${industry || "unknown"}
Locations: ${locationCount || "unknown"}
Current Competitor: ${competitor || "unknown"}
Known Contacts: ${contactContext || "none"}

Search for and report on:
1. Recent leadership changes (new CMO, VP Marketing, VP Digital, CTO) — especially in the last 6 months
2. Company news (expansion, new locations, acquisitions, rebrand, funding)
3. Any mentions of local SEO, listings management, reputation management, or digital presence initiatives
4. Competitor mentions (SOCi, Birdeye, Uberall, Chatmeter, Rio SEO, Podium)
5. Any public job postings related to marketing, digital, or local SEO

Return ONLY a valid JSON array of findings. Each finding should be:
{
  "title": "Short headline (e.g. 'New VP of Marketing hired')",
  "description": "2-3 sentence summary with specific details, names, dates if available",
  "signal_type": one of "Leadership Change", "Expansion", "Competitor Contract Ending", "Bad Reviews / Reputation Issue", "Rebrand / Redesign", "Acquisition / Merger", "New Locations", "Funding Round", "Tech Vendor Evaluation", "Website Redesign", "Other",
  "relevance": "Hot" or "Warm" or "Low",
  "source": "Where this info likely came from (e.g. 'LinkedIn', 'Press Release', 'Job Board', 'Google News')"
}

Return between 0 and 6 findings. Only include things that seem real and recent (within last 12 months). If you can't find anything notable, return an empty array [].

Do NOT make up findings. Only report things you have reasonable confidence about.`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          {
            role: "system",
            content: "You are a sales intelligence researcher. Use your knowledge to find real, recent information about companies. Always respond with a valid JSON array only, no markdown formatting or code fences.",
          },
          { role: "user", content: prompt },
        ],
        stream: false,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limited, please try again later." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "Payment required." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const t = await response.text();
      console.error("AI gateway error:", response.status, t);
      throw new Error("AI gateway error");
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || "[]";

    let findings;
    try {
      // Strip markdown code fences if present
      const jsonMatch = content.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
      const raw = jsonMatch ? jsonMatch[1].trim() : content.trim();
      findings = JSON.parse(raw);
      if (!Array.isArray(findings)) findings = [];
    } catch {
      console.error("Failed to parse research response:", content);
      findings = [];
    }

    return new Response(JSON.stringify({ findings }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("research-account error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

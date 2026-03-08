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
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const { companyName, website, locationCount, wikidataDescription } = await req.json();

    const prompt = `You are a sales intelligence assistant for Yext, a digital presence management platform. Given the following company information, return a JSON object with your analysis.

Company Name: ${companyName || "unknown"}
Website: ${website || "unknown"}
Location Count: ${locationCount || "unknown"}
Wikidata Description: ${wikidataDescription || "none found"}

Return ONLY a valid JSON object with these fields:
{
  "industry": one of exactly these values: "QSR / Fast Casual", "Casual Dining", "Grocery / Supermarket", "Gas Stations / C-Store", "Hotels / Hospitality", "Healthcare", "Car Wash", "Auto Dealerships", "Financial Services", "Insurance", "Real Estate", "Retail (General)", "Fashion Retail", "Home Services", "Fitness / Gyms", "Education", "Legal Services", "Pet Services", "Beauty / Salon", "Storage / Parking", "Entertainment", "Senior Care", "Pharmacy", "Telecom", "Staffing", "Other",
  "industry_confidence": "high" or "medium" or "low",
  "company_summary": a 1-2 sentence description of what the company does,
  "likely_competitor": one of "SOCi", "Birdeye", "Podium", "Reputation.com", "Uberall", "Rio SEO", "Chatmeter", "Unknown", "None" - your best guess at what local marketing/listings platform they might currently use,
  "yext_relevance": "high" or "medium" or "low" - how relevant is Yext's digital presence platform to this company based on their industry and multi-location nature,
  "yext_relevance_reason": a 1 sentence explanation of why Yext is or isn't relevant
}`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: "You are a sales intelligence analyst. Always respond with valid JSON only, no markdown formatting." },
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
        return new Response(JSON.stringify({ error: "Payment required. Please add credits to your workspace." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const text = await response.text();
      console.error("AI gateway error:", response.status, text);
      return new Response(JSON.stringify({ error: "AI gateway error" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || "";

    // Parse JSON from the response, stripping markdown code fences if present
    let cleaned = content.trim();
    if (cleaned.startsWith("```")) {
      cleaned = cleaned.replace(/^```(?:json)?\s*/, "").replace(/```\s*$/, "").trim();
    }

    let parsed;
    try {
      parsed = JSON.parse(cleaned);
    } catch {
      console.error("Failed to parse AI response:", content);
      return new Response(JSON.stringify({ error: "Failed to parse AI response", raw: content }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify(parsed), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("enrich-prospect error:", e);
    const msg = e instanceof Error ? e.message : "Unknown error";
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

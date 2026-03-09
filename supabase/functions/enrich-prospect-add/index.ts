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

    const { companyName, website, wikidataDescription } = await req.json();

    const prompt = `You are a sales intelligence assistant for Yext, a digital presence management platform for multi-location brands.

Research this company and return a JSON object:
Company: ${companyName || "unknown"}
Website: ${website || "unknown"}
Wikidata description: ${wikidataDescription || "none"}

Return ONLY valid JSON:
{
  "industry": one of these exact values: "QSR / Fast Casual", "Casual Dining", "Grocery / Supermarket", "Gas Stations / C-Store", "Hotels / Hospitality", "Healthcare", "Car Wash", "Auto Dealerships", "Financial Services", "Insurance", "Real Estate", "Retail (General)", "Fashion Retail", "Home Services", "Fitness / Gyms", "Education", "Legal Services", "Pet Services", "Beauty / Salon", "Storage / Parking", "Entertainment", "Senior Care", "Pharmacy", "Telecom", "Staffing", "Other",
  "estimated_locations": number or null if unknown,
  "company_summary": 1-2 sentence description,
  "likely_competitor": one of "SOCi", "Birdeye", "Podium", "Reputation.com", "Uberall", "Rio SEO", "Chatmeter", "Unknown", "None",
  "suggested_tier": "Tier 1", "Tier 2", "Tier 3", or "Tier 4" based on estimated size and industry value,
  "key_contacts_to_find": [array of 2-3 job titles most relevant for a Yext sale, e.g., "VP of Marketing", "Director of Digital", "Head of Local SEO"]
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

    let cleaned = content.trim();
    if (cleaned.startsWith("```")) {
      cleaned = cleaned.replace(/^```(?:json)?\s*/, "").replace(/```\s*$/, "").trim();
    }

    let parsed;
    try {
      parsed = JSON.parse(cleaned);
    } catch {
      console.error("Failed to parse AI response:", content);
      return new Response(JSON.stringify({ error: "Failed to parse AI response" }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify(parsed), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("enrich-prospect-add error:", e);
    const msg = e instanceof Error ? e.message : "Unknown error";
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

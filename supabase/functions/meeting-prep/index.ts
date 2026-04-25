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

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
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
      .filter((t: { completed?: boolean }) => !t.completed)
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

EMIT EXACTLY THESE SIX MARKDOWN SECTIONS, IN ORDER, WITH THESE EXACT HEADERS:

## Context
2-3 sentences: who they are, where the deal stands, why we're meeting.

## Recent History
Bulleted list of the last 3-5 interactions with dates. If none, write "No prior interactions on file."

## Contacts
Bulleted list of key contacts with role and relationship strength. If none, write "No contacts on file - discovery call required."

## Open Tasks
Bulleted list of open tasks with due dates. If none, write "No open tasks."

## Talking Points
3-5 bullets. EACH bullet must reference at least one of: AI search visibility, multi-location brand consistency, local SEO at scale, or competitive displacement of {SOCi, Birdeye, Uberall, Chatmeter, Rio SEO}.

## Suggested Ask
One sentence - a single concrete next step (intro, demo, pilot scope, decision criteria check). NOT a bullet list.

ALWAYS emit all six sections, in order. If a section truly has no relevant data, write "None on file." under that header. Never omit a header.`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        max_tokens: 2000,
        messages: [
          { role: "system", content: "You are an elite B2B enterprise sales strategist. Generate concise, actionable meeting prep briefs that help AEs walk into meetings prepared and confident." },
          { role: "user", content: userPrompt },
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
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "AI credits exhausted. Please add funds to your workspace." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      throw new Error(`AI gateway error: ${response.status}`);
    }

    const data = await response.json();
    const brief = data.choices?.[0]?.message?.content || "";

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

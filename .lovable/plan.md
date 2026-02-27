

# AI Chat Bubble -- Prospect-Aware Assistant

A floating chat bubble in the bottom-right corner that lets you ask questions about your pipeline. The AI sees your prospect data and can answer things like "which prospects haven't been touched in 30 days?" or "summarize my Tier 1 pipeline."

## Prerequisites

**Lovable Cloud must be enabled first.** The AI chat needs a backend edge function to securely call the Lovable AI gateway (the API key can't be exposed in the browser). I'll set this up as part of the implementation.

## What Gets Built

### 1. Edge Function: `supabase/functions/chat/index.ts`
- Receives chat messages + a summary of prospect data from the frontend
- Prepends a system prompt that explains the prospect data schema and the user's role
- Calls the Lovable AI Gateway (`google/gemini-3-flash-preview` -- fast, cheap, solid answers)
- Streams the response back via SSE for real-time token rendering
- Handles 429/402 errors gracefully

### 2. Chat Component: `src/components/ChatBubble.tsx`
- Floating button (bottom-right corner, above any scroll) with a chat/sparkle icon
- Clicking opens a compact chat panel (~350px wide, ~450px tall on desktop; near-full-screen on mobile)
- Features:
  - Message list with markdown rendering (install `react-markdown`)
  - Text input + send button
  - Streaming token display (assistant messages build up in real-time)
  - "Thinking..." indicator while waiting for first token
  - Close button to collapse back to bubble
- Sends prospect summary as context with each request (compact JSON: name, stage, score, tier, last touched, location count -- enough for the AI to reason about without being huge)

### 3. Integration: `src/components/TerritoryPlanner.tsx`
- Import and render `ChatBubble`, passing the current prospect data array
- The bubble sits outside the main layout flow (fixed position)

### 4. Supabase Client: `src/integrations/supabase/client.ts`
- Minimal Supabase client setup for calling edge functions

## Prospect Context Strategy

To keep token costs low while giving the AI useful context, I'll send a compressed summary:

```text
You have access to the user's prospect pipeline. Here is their current data:
[{name, stage, score, tier, priority, industry, locations, lastTouched, daysSinceTouch}, ...]
```

This keeps the payload small (roughly 100-200 tokens per prospect) while giving the AI everything it needs to answer pipeline questions.

## UI Design

```text
Desktop:                          Mobile:
                    [X]           [X] AI Assistant
  AI Assistant     ----           ----------------
  ----------------                |              |
  | User: Which   |              | (messages)   |
  | prospects...   |              |              |
  |                |              |              |
  | AI: Here are  |              |              |
  | the top 3...  |              |              |
  |                |              |              |
  ----------------               ----------------
  [Type a message...] [>]        [Type a message...] [>]

         [chat icon]  <-- bubble
```

## Technical Details

### Files to create:
| File | Purpose |
|------|---------|
| `supabase/functions/chat/index.ts` | Edge function calling Lovable AI Gateway with streaming |
| `src/components/ChatBubble.tsx` | Floating chat UI with SSE streaming |
| `src/integrations/supabase/client.ts` | Supabase client for edge function calls |

### Files to modify:
| File | Changes |
|------|---------|
| `src/components/TerritoryPlanner.tsx` | Add `<ChatBubble>` with prospect data prop |

### New dependency:
- `react-markdown` -- for rendering AI responses with proper formatting

### Model choice:
- `google/gemini-3-flash-preview` -- fast, cheap, good reasoning. Perfect for "light but spicy."

### System prompt (backend only):
Instructs the AI that it's a sales assistant for a territory planner, explains the data schema, and tells it to be concise and actionable. The user never sees or controls this.


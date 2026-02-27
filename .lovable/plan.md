

## Remove Chatbot Feature

### What will change
The AI chat bubble and its backend function will be removed. The database, authentication, and all other cloud functionality remain completely untouched.

### Files to delete
- `src/components/ChatBubble.tsx` -- the chat UI component
- `supabase/functions/chat/index.ts` -- the backend function powering the chatbot

### Files to modify

**`src/components/TerritoryPlanner.tsx`**
- Remove the `import { ChatBubble }` line
- Remove the `<ChatBubble prospects={data} />` usage near the bottom of the component

### What stays the same
- Database tables, RLS policies, and all stored prospect data
- Authentication system
- All other backend functions (if any)
- CSV upload, prospect management, insights -- everything else


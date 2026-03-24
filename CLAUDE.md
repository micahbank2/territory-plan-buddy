# Territory Plan Buddy — CLAUDE.md

This file gives you full context on the codebase. Read it before making any changes.

---

## What This Is

A territory planning tool for a Yext Senior AE (Micah, Mid-Enterprise North). Manages 300+ multi-location brand prospects across verticals: QSR, retail, franchise, automotive, property management. Backed by Supabase, deployed via Lovable, GitHub-connected for Claude Code edits.

This is a personal productivity tool, not a public SaaS product. Optimizations should favor speed and workflow over generalization.

---

## Tech Stack

- **React + TypeScript** via Vite
- **Tailwind CSS** for styling — use utility classes, avoid arbitrary values where possible
- **shadcn/ui** for base components (Button, Dialog, Sheet, etc.) — check components.json before adding new UI
- **Supabase** for database + auth (Lovable Cloud instance — no direct CLI access)
- **React Router v6** for routing
- **TanStack Query** is installed but underused — currently most data fetching is in custom hooks
- **next-themes** for dark/light mode
- **sonner** for toasts
- **date-fns** for date formatting
- **lucide-react** for icons

---

## File Structure

```
src/
  pages/
    Index.tsx              → thin wrapper, renders <TerritoryPlanner />
    ProspectPage.tsx       → full-page view for a single prospect
    InsightsPage.tsx       → analytics/charts view
    OpportunitiesPage.tsx  → deal pipeline table
    AuthPage.tsx
    LandingPage.tsx
    ShareJoinPage.tsx
  components/
    TerritoryPlanner.tsx   → main app shell (~1000 lines, the core UI)
    ProspectSheet.tsx      → slide-over panel for prospect detail
    OpportunitySheet.tsx   → slide-over for deal detail
    AddProspectDialog.tsx
    CSVUploadDialog.tsx
    PasteImportDialog.tsx
    BulkEditDialog.tsx
    ShareTerritoryDialog.tsx
    EnrichmentQueue.tsx
    AIReadinessCard.tsx
    SignalsSection.tsx
    MultiSelect.tsx
    ContactBadges.tsx
    AccountCombobox.tsx
    ui/                    → shadcn components, don't modify directly
  hooks/
    useProspects.ts        → all prospect CRUD, Supabase sync
    useOpportunities.ts    → deal CRUD
    useTerritories.ts      → territory management + sharing
    useSignals.ts          → buying signals per prospect
    useAuth.ts
    use-mobile.ts
  data/
    prospects.ts           → data model, scoring logic, seed data (309 accounts)
  integrations/
    supabase/client.ts     → Supabase client
  assets/
    yext-logo-black.jpg
    yext-logo-white.jpg
```

---

## Database Schema

### prospects
| column | type | notes |
|--------|------|-------|
| id | uuid PK | |
| user_id | uuid | FK to auth.users |
| territory_id | uuid | FK to territories, nullable |
| name | text | |
| website | text | used for favicon via Google S2 |
| status | text | "Prospect" or "Churned" |
| industry | text | see INDUSTRIES constant |
| location_count | int | null = unknown |
| location_notes | text | e.g. "CLOSED" triggers score penalty |
| outreach | text | see STAGES constant |
| priority | text | "Hot", "Warm", "Cold", "Dead", or "" |
| tier | text | "Tier 1"-"Tier 4" or "" |
| competitor | text | see COMPETITORS constant |
| notes | text | legacy single note field |
| last_touched | date | auto-updated on any update() call |
| estimated_revenue | int | nullable |
| contact_name | text | legacy, use prospect_contacts instead |
| contact_email | text | legacy |
| custom_logo | text | base64 image string |
| ai_readiness_score | int | nullable, 0-100 |
| ai_readiness_grade | text | nullable |
| ai_readiness_data | jsonb | {summary, strengths, risks, yext_opportunity, talking_point} |
| ai_readiness_updated_at | timestamptz | |
| created_at | timestamptz | |

### prospect_contacts
| column | type |
|--------|------|
| id | uuid PK |
| prospect_id | uuid FK |
| user_id | uuid FK |
| name | text |
| title | text |
| email | text |
| phone | text |
| notes | text |
| role | text | "Champion", "Decision Maker", "Influencer", "Technical Evaluator", "Blocker", "End User", "Executive Sponsor", "Unknown" |
| relationship_strength | text | "Strong", "Warm", "Cold", "At Risk", "Unknown" |

### prospect_interactions
| column | type |
|--------|------|
| id | uuid PK |
| prospect_id | uuid FK |
| user_id | uuid FK |
| type | text | "Email", "Call", "LinkedIn Message", "Task Completed" |
| date | date | YYYY-MM-DD string |
| notes | text |

### prospect_notes
| column | type |
|--------|------|
| id | uuid PK |
| prospect_id | uuid FK |
| user_id | uuid FK |
| text | text |
| timestamp | timestamptz |

### prospect_tasks
| column | type |
|--------|------|
| id | uuid PK |
| prospect_id | uuid FK |
| user_id | uuid FK |
| text | text |
| due_date | date | nullable |

### opportunities
| column | type | notes |
|--------|------|-------|
| id | uuid PK | |
| territory_id | uuid FK | |
| user_id | uuid FK | |
| name | text | |
| type | text | "Net New", "Renewal", "Order Form" |
| potential_value | int | ACV in dollars |
| stage | text | see OPP_STAGES |
| products | text | e.g. "Listings, Pages, Reviews" |
| point_of_contact | text | |
| notes | text | |
| close_date | date | |
| prospect_id | uuid | nullable FK to prospects |
| created_at | timestamptz | |

### territories
| column | type |
|--------|------|
| id | uuid PK |
| name | text |
| owner_id | uuid FK |
| created_at | timestamptz |

### territory_members
| column | type | notes |
|--------|------|-------|
| territory_id | uuid FK | |
| user_id | uuid FK | |
| role | text | "owner", "editor", "viewer" |

### signals
Buying signals attached to prospects. Referenced via `useSignals` hook.

---

## Data Model — Key Types

```typescript
interface Prospect {
  id: uuid
  name: string
  website: string
  status: "Prospect" | "Churned"
  industry: string           // from INDUSTRIES constant
  locationCount: number | null
  outreach: string           // from STAGES constant
  priority: string           // "Hot" | "Warm" | "Cold" | "Dead" | ""
  tier: string               // "Tier 1" | "Tier 2" | "Tier 3" | "Tier 4" | ""
  competitor: string         // from COMPETITORS constant
  contacts: Contact[]
  interactions: InteractionLog[]
  noteLog: NoteEntry[]
  tasks: Task[]
  aiReadinessScore?: number | null
  aiReadinessData?: AIReadinessData | null
  customLogo?: string        // base64
  lastTouched: string | null // YYYY-MM-DD, auto-updated
}

// nextStep and nextStepDate are DEPRECATED — use tasks[] instead
```

---

## Scoring System

Lives in `src/data/prospects.ts`. Score = sum of these factors:

| Condition | Points |
|-----------|--------|
| 500+ locations | +40 |
| 100+ locations | +30 |
| 50+ locations | +20 |
| 1+ locations | +10 |
| High-value industry (QSR, Grocery, Casual Dining, Gas, Hotels, Healthcare, Car Wash) | +20 |
| Outreach: Meeting Booked | +15 |
| Outreach: Actively Prospecting | +5 |
| Priority: Hot | +25 |
| Priority: Warm | +10 |
| Priority: Dead | -30 |
| Status: Churned | -10 |
| locationCount=0 AND locationNotes contains "CLOSED" | -50 |

Score labels: 60+ = Excellent (A+), 40+ = Strong (A), 20+ = Moderate (B), 1+ = Low (C), 0 = Needs Work (D)

**The score is currently just displayed — it does not drive recommended actions. This is a known gap to fix.**

---

## Key Constants (src/data/prospects.ts)

```typescript
STAGES = ["Not Started", "Actively Prospecting", "Meeting Booked", "Closed Lost", "Closed Won"]
PRIORITIES = ["", "Hot", "Warm", "Cold", "Dead"]
TIERS = ["", "Tier 1", "Tier 2", "Tier 3", "Tier 4"]
INDUSTRIES = [...26 verticals...]
COMPETITORS = ["", "SOCi", "Yext", "Birdeye", "Podium", "Reputation.com", "Uberall", "Rio SEO", "Chatmeter", "Unknown", "Other"]
CONTACT_ROLES = ["Unknown", "Champion", "Decision Maker", "Influencer", "Technical Evaluator", "Blocker", "End User", "Executive Sponsor"]
RELATIONSHIP_STRENGTHS = ["Unknown", "Strong", "Warm", "Cold", "At Risk"]
OPP_STAGES = ["Develop", "Discovery", "Business Alignment", "Validate", "Propose", "Negotiate", "Won", "Closed Won", "Closed Lost", "Dead"]
OPP_TYPES = ["Net New", "Renewal", "Order Form"]
```

---

## Hooks — How Data Flows

### useProspects(territoryId?)
The main data hook. Returns:
- `data: Prospect[]` — all prospects for territory
- `ok: boolean` — whether initial load completed
- `update(id, Partial<Prospect>)` — handles sub-collections (contacts, interactions, noteLog, tasks) by full replace
- `add(partial)` → returns new uuid
- `remove(id)` — hard delete (no soft delete currently)
- `bulkUpdate(ids[], changes)` — only handles top-level prospect fields
- `bulkAdd(partials[])` — batch insert, no sub-collections
- `bulkMerge(updates[])` — merge with sub-collection support
- `seedData()` — owner-only, imports 309 seed accounts
- `deleteNote(prospectId, noteId)`
- `addNote(prospectId, text)`

**Important:** `update()` does a full replace on sub-collections. If you pass `contacts: [...]`, it deletes all existing contacts and re-inserts. Don't pass sub-collections unless you mean to replace them entirely.

### useOpportunities(territoryId)
- `opportunities: Opportunity[]`
- `add(partial)`, `update(id, partial)`, `remove(id)`
- Requires territoryId — returns empty if null

### useTerritories()
- `territories[]`, `activeTerritory: string | null`
- `myRole: "owner" | "editor" | "viewer"`
- `switchTerritory(id)`, `createTerritory(name)`
- `inviteMember(email, role)`, `removeMember(userId)`, `updateMemberRole(userId, role)`

---

## Component Patterns

### Inline editing
Triple state: display → editing (click/double-click) → saved (blur/enter). Pattern in TerritoryPlanner.tsx:
```tsx
{editingCell?.id === p.id && editingCell?.field === "industry" ? (
  <select autoFocus onBlur={() => setEditingCell(null)} ... />
) : (
  <span onClick={() => setEditingCell({ id: p.id, field: "industry" })} ... />
)}
```

### Logo display
`getLogoUrl(website, size)` uses Google S2 favicons. Falls back to `<Building2>` icon. Supports custom base64 logo via `customLogo` field.

### ProspectSheet
Slide-over panel (Sheet on desktop, Drawer on mobile). Opens via `sheetProspectId` state in TerritoryPlanner. This is where most per-account work happens. Currently a long vertical scroll — tabbed layout is a planned improvement.

### Aging dots
Color-coded last-contact indicator. Green = <7 days, Yellow = 7-30 days, Red = 30+ days, Gray = never contacted. Class names: `aging-green`, `aging-yellow`, `aging-red`, `aging-gray`.

---

## Known Patterns & Gotchas

1. **Sub-collection replace**: `update(id, { contacts: [...] })` replaces ALL contacts. Always pass the full array including unchanged items.

2. **Optimistic updates**: All hooks update local state immediately, then sync to Supabase. If Supabase fails, local state is stale until next reload. No error recovery currently.

3. **territoryId can be null**: `useOpportunities` returns empty if territoryId is null. `useProspects` without territoryId falls back to user-owned prospects.

4. **Owner-only features**: `seedData()`, reset data, and some admin actions are gated by `OWNER_EMAILS = ["micahbank2@gmail.com", "mbank@yext.com"]`.

5. **TerritoryPlanner.tsx is ~1000 lines**: All state, filtering, views, dialogs live here. Extract to sub-components when adding new features, don't make it bigger.

6. **Deprecated fields**: `nextStep` and `nextStepDate` on Prospect are deprecated. All task data lives in `tasks[]`. The migration in `initProspect()` handles old data.

7. **CSS custom classes**: Several non-Tailwind classes exist in the CSS: `glass-card`, `glow-blue`, `aging-dot`, `aging-green/yellow/red/gray`, `skeleton-shimmer`, `gradient-text`, `yext-grid-bg`, `pipeline-segment`, `kanban-card`, `row-hover-lift`, `overdue-flag`, `delete-glow`, `inline-edit-cell`. Don't remove these.

8. **Score does not drive actions**: The scoring system produces a number but nothing downstream uses it to suggest actions. This is intentional tech debt to address.

9. **Archive is simplified**: The `restore` and `permanentDelete` functions in useProspects are stubs (`() => {}`). Archive is visual only — items are hard deleted.

---

## Priority Build Roadmap

Work on these in order. Do NOT skip ahead.

### 1. CLAUDE.md (this file) ✅
### 2. Log + Next Step — single interaction widget in ProspectSheet
One action captures: interaction type, notes, and creates a follow-up task. Currently requires scrolling to two separate sections. Target: a single "Log Activity" widget that does both in one submit.

### 3. AI Outreach Drafting in ProspectSheet
Button that calls Anthropic API with full prospect context (name, industry, locationCount, competitor, tier, contacts, recent interactions) and returns a draft first-touch email. Uses cold-email-ae skill logic. Add as a tab or collapsible section in ProspectSheet.

### 4. Daily Briefing Artifact
Claude reads Supabase data and generates a single HTML page: overdue tasks, stale accounts, pipeline movement, what to do today. No app to open, just a bookmark.

### 5. Score → Recommended Action
Surface a "Why call this account" block in ProspectSheet header using score breakdown data + contact coverage gaps + staleness. Example: "Score 82 — missing Decision Maker, 45 days since last touch, competing with SOCi."

### 6. Supabase MCP
Point at territory database for conversational querying. Blocked on Lovable Cloud credential access — revisit.

### 7. Weighted Pipeline Forecast in Opportunities
Stage-weighted ACV: Propose=70%, Validate=50%, Discovery=20%, Develop=10%. Add forecast bar above the table and quota tracker.

### 8. Meeting Prep Skill
Takes prospect ID, outputs one-page brief: context, history, contacts, tasks, talking points, suggested ask.

### 9. Firecrawl Enrichment
Replace manual enrichment queue with Firecrawl-powered flow. No company quota limits.

### 10. My Numbers Tab
Quota attainment, activity rate, pipeline coverage tracked over time.

---

## Yext Context (for AI-assisted features)

Micah is a Senior AE at Yext, Mid-Enterprise North territory. Key Yext products: Listings, Pages, Reviews, Search (Scout), Reputation Management, Analytics. Primary competitors: SOCi, Birdeye, Uberall, Chatmeter, Rio SEO. Target verticals: QSR/Fast Casual, Grocery, Auto Dealerships, Car Wash, Multifamily, Healthcare. Top current accounts/prospects: Shake Shack (win-back, April 1 meeting), Dollar Tree, Morgan Properties, Goddard Schools, Charleys Philly Steaks. RVP: Lauren Goldman. SE: Zoe Byerly.

When generating outreach or meeting prep, position Yext around: AI search visibility, multi-location brand consistency, local SEO at scale, competitive displacement of SOCi/Birdeye.

---

## Environment

- Node via Bun
- Vite dev server
- Supabase client at `src/integrations/supabase/client.ts`
- Anthropic API available for in-app AI features (call via fetch to `/v1/messages`, key handled by environment)
- Deployed on Lovable Cloud, GitHub-connected — push to main triggers deploy

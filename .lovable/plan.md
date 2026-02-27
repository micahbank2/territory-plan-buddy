

# Migrate to Lovable Cloud with Team Access

## What This Does
Moves all prospect data from browser storage to a persistent cloud database, and adds login/signup so each person on your team gets their own account with their own prospect list. Data will never disappear again -- it lives in the cloud, works across devices, and each team member manages their own pipeline independently.

## User-Facing Changes

1. **Login/Signup page** -- simple email + password auth (team members sign up themselves)
2. **Everything else stays the same** -- same Territory Planner UI, same CSV import, same features
3. **Data persists permanently** -- no more data loss from URL changes or browser cache clears
4. **Each team member has their own prospects** -- everyone logs in and sees only their data

## How It Works (Step by Step)

### Step 1: Create the database tables
- **prospects** table: stores all prospect fields (name, website, industry, location count, priority, status, etc.) with a `user_id` column linking each prospect to its owner
- **contacts**, **interactions**, **note_log**, **tasks** tables: related data linked to each prospect
- Row-level security ensures each user can only see/edit their own data

### Step 2: Add authentication
- Create a login/signup page with email + password
- Protect all routes so you must be logged in to access the app
- Add a logout button to the header

### Step 3: Rewire data layer
- Replace the `useProspects` hook (currently reads/writes localStorage) with one that reads/writes to the cloud database
- CSV import will save directly to the database instead of localStorage
- All existing features (edit, archive, bulk update, etc.) will work the same way

### Step 4: Seed migration
- On first login, if you have no prospects in the database, offer to import the built-in seed data (your 309 FY27 accounts) so you're not starting from scratch

## Technical Details

### Database Schema

| Table | Key Columns |
|-------|------------|
| `prospects` | id (uuid), user_id, name, website, industry, location_count, status, priority, tier, competitor, outreach, notes, estimated_revenue, contact_name, contact_email, location_notes, last_touched, created_at |
| `prospect_contacts` | id, prospect_id (FK), name, email, phone, title, notes |
| `prospect_interactions` | id, prospect_id (FK), type, date, notes |
| `prospect_notes` | id, prospect_id (FK), text, timestamp |
| `prospect_tasks` | id, prospect_id (FK), text, due_date |
| `prospect_archive` | same as prospects + archived_at |

All tables have RLS policies: users can only CRUD their own rows (WHERE user_id = auth.uid()).

### Files to Create/Modify

| File | What |
|------|------|
| `src/pages/AuthPage.tsx` | New login/signup page |
| `src/hooks/useAuth.tsx` | Auth context provider |
| `src/hooks/useProspects.ts` | Rewrite to use database instead of localStorage |
| `src/components/TerritoryPlanner.tsx` | Add logout button, remove localStorage references |
| `src/components/CSVUploadDialog.tsx` | Save imports to database |
| `src/App.tsx` | Add auth provider, protect routes |

### What Stays the Same
- All UI components (ProspectSheet, ChatBubble, MultiSelect, etc.)
- Prospect type definitions and scoring logic
- Insights page
- CSV column mapping logic (including the fuzzy matching we just added)


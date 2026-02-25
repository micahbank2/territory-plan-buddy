
# Territory Planner App

## Overview
A sales territory planning tool for tracking and managing enterprise prospect accounts. It features a dark-themed UI with a dashboard overview and a detailed prospects table with inline editing.

## Phase 1: Scaffold the UI (Initial Implementation)

### 1. Territory Planner Component
Port the provided JSX component into the app, adapting it to work within the existing React + Tailwind project. The component will be placed as the main page.

**Key features preserved from the original code:**
- **Dashboard View** — Summary stat cards (total prospects, location counts, hot/warm/churned counts), pipeline stage breakdown (clickable to filter), and industry distribution bar chart
- **Prospects Table View** — Sortable table with columns for Score, Account, Locations, Industry, Outreach Stage, Priority, and Owner
- **Search & Filters** — Text search plus dropdowns for Industry, Outreach Stage, Priority, Owner, and minimum location count
- **Detail Panel** — Side panel for editing prospect details (locations, industry, outreach stage, priority, contact info, revenue estimate, notes, location source)
- **Prospect Scoring** — Automatic scoring algorithm based on location count, industry, outreach stage, priority, and status
- **Dark theme** — The existing dark navy/slate color scheme from the original component

### 2. Seed Data from CSV
Replace the JSX seed data with all 303 prospects from the uploaded CSV file. Each CSV row will be mapped to a prospect record with the appropriate fields (name, website, location count, transition owner, status, industry, location notes).

### 3. Temporary Local Storage
Initially use localStorage for data persistence (replacing `window.storage` calls) so the app is fully functional before adding a database.

## Phase 2: Database Migration (Next Step)
After the UI is working, we'll connect Supabase as the backend database to replace localStorage with persistent, cloud-hosted storage. This will include:
- A `prospects` table with all fields
- Real-time data fetching and updates
- No authentication required (single shared dataset)

# Phase 4: AI Capabilities — Draft Emails & Post-Outreach Tracking — Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-03-30
**Phase:** 04-ai-capabilities
**Areas discussed:** Contact Selection UX, Email Generation → Send Handoff, Post-Send Tracking, Results Layout

---

## Contact Selection UX

| Option | Description | Selected |
|--------|-------------|----------|
| Pick accounts first, then contacts | Two-step funnel: select accounts, then pick contacts within each | ✓ |
| Flat contact list with filters | All contacts across all accounts in one filterable list | |
| Smart suggestions + manual add | Claude suggests contacts, user reviews and adjusts | |

**User's choice:** Pick accounts first, then contacts
**Notes:** Already implemented in quirky-buck branch

### Contact Picker Within Accounts

| Option | Description | Selected |
|--------|-------------|----------|
| Auto-select primary contact per account | Pre-check highest-role contact, user can override | |
| Show all contacts, pick manually | Expand each account, checkbox who to email | ✓ |
| Only show contacts with emails | Filter to contacts with email addresses | |

**User's choice:** Show all contacts, pick manually

---

## Email Generation → Send Handoff

| Option | Description | Selected |
|--------|-------------|----------|
| Copy each email to clipboard | View draft, click Copy, paste into Gmail yourself | ✓ |
| Open mailto: links | Button opens default email client with pre-filled fields | |
| Batch copy all drafts | One button copies all emails as formatted list | |

**User's choice:** Copy each email to clipboard
**Notes:** User clarified the current flow is prompt-to-clipboard → paste into Claude → get emails back → paste into Gmail. The generation itself is NOT in-app — it's via Claude chat. This is kept as-is.

---

## Post-Send Tracking

### Mark as Contacted Method

| Option | Description | Selected |
|--------|-------------|----------|
| Checkbox next to each draft | Per-email sent checkbox, auto-logs interaction | |
| "Mark All Sent" button | One button marks all contacts as contacted | |
| Both — per-email + batch button | Checkbox per email + Mark All Sent for remaining | ✓ |

**User's choice:** Both — per-email checkbox + batch button

### What Gets Logged

| Option | Description | Selected |
|--------|-------------|----------|
| Email interaction + update last_touched | Log interaction, update last_touched | |
| Email interaction + last_touched + outreach stage bump | Same + auto-advance Not Started → Actively Prospecting | ✓ |
| Email interaction + last_touched + optional follow-up task | Same + prompt for follow-up task | |

**User's choice:** Email interaction + last_touched + outreach stage bump

### Batch Persistence

| Option | Description | Selected |
|--------|-------------|----------|
| Remember the batch (saved pending outreach) | Tool saves contact list, shows Pending Outreach indicator | |
| Quick-mark from table (bulk action) | Re-select accounts in table, use bulk action | |
| Both — saved batch + manual bulk | Saved batch for draft flow + bulk action for ad-hoc | ✓ |

**User's choice:** Both — saved batch for the draft flow, plus a bulk "Mark Contacted" action on the main table

---

## Results Layout

| Option | Description | Selected |
|--------|-------------|----------|
| Full-page view | Navigate to /draft-emails route | |
| Dialog/modal overlay | Large modal over territory view | ✓ |
| Right panel (like ProspectSheet) | Slide-over panel | |

**User's choice:** Dialog/modal overlay

---

## Claude's Discretion

- Badge placement for pending outreach indicator
- Single vs multiple pending batches (start with most recent)
- Exact interaction note wording
- Bulk action placement in UI

## Deferred Ideas

- Direct email sending integration (Gmail API)
- Smart contact suggestions based on staleness/priority
- Email template library
- Email open/reply tracking
- In-app email generation via Anthropic API

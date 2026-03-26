---
phase: 01-data-integrity-security
plan: "03"
subsystem: security
tags: [xss, api-key, dompurify, edge-function, security]
dependency_graph:
  requires: ["01-02"]
  provides: ["SafeHTML component", "meeting-prep Edge Function wiring"]
  affects: ["src/components/ProspectSheet.tsx"]
tech_stack:
  added: ["dompurify@3.3.3", "@types/dompurify@3.2.0"]
  patterns: ["DOMPurify sanitize with allowlist", "supabase.functions.invoke pattern"]
key_files:
  created:
    - src/components/SafeHTML.tsx
    - src/components/SafeHTML.test.tsx
    - src/components/ProspectSheet.test.tsx
  modified:
    - src/components/ProspectSheet.tsx
    - package.json
decisions:
  - "Use DOMPurify allowlist (not blocklist) for XSS prevention — safer and more predictable"
  - "Static analysis test for SEC-01/SEC-02 — verifies source file content rather than runtime mock"
metrics:
  duration: "143s"
  completed_date: "2026-03-26"
  tasks_completed: 2
  files_changed: 5
---

# Phase 01 Plan 03: XSS Fix and API Key Security Summary

## One-liner

DOMPurify SafeHTML component closes XSS in shared territory notes; generateMeetingPrep routed through Edge Function eliminating VITE_ANTHROPIC_API_KEY from client bundle.

## What Was Built

### Task 1: SafeHTML Component (SEC-03)

Created `src/components/SafeHTML.tsx` — a wrapper that runs `DOMPurify.sanitize()` with an explicit allowed-tags allowlist before passing to `dangerouslySetInnerHTML`. Applied to the note display in `ProspectSheet.tsx` (previously rendered raw HTML from user input).

Allowlist: `p, br, strong, em, u, s, ul, ol, li, a, h1, h2, h3` with `href, target, rel` attributes only.

### Task 2: Edge Function Wiring (SEC-01, SEC-02)

Replaced the 94-line `generateMeetingPrep` function body in `ProspectSheet.tsx` with a clean 30-line implementation that:
1. Calls `supabase.functions.invoke("meeting-prep", { body: {...} })`
2. Reads `result.brief` from the Edge Function response
3. Handles both Supabase SDK errors and Edge Function application errors

The `meeting-prep` Edge Function already existed and was complete — this plan just wired the client to use it instead of calling Anthropic directly.

## Requirements Closed

- SEC-01: No direct Anthropic API calls from browser — CLOSED
- SEC-02: VITE_ANTHROPIC_API_KEY removed from all src/ files — CLOSED
- SEC-03: XSS sanitization on note display — CLOSED

## Test Results

All 6 tests pass:
- `SafeHTML.test.tsx`: 4 tests (XSS strip, safe tags preserved, javascript: href stripped, empty string safe)
- `ProspectSheet.test.tsx`: 1 test (static analysis: no api.anthropic.com, no VITE_ANTHROPIC_API_KEY, functions.invoke present)
- `example.test.ts`: 1 test (existing)

## Deviations from Plan

None — plan executed exactly as written.

## Manual Step Required

**USER ACTION NEEDED:** After this plan deploys, remove `VITE_ANTHROPIC_API_KEY` from Lovable Cloud environment variable settings.

- Location: Lovable Dashboard -> Project Settings -> Environment Variables
- Action: DELETE the `VITE_ANTHROPIC_API_KEY` entry
- Verify: `ANTHROPIC_API_KEY` (without VITE_ prefix) is set as a Supabase Edge Function secret (Supabase Dashboard -> Edge Functions -> Secrets)

This cannot be done via code — it requires access to the Lovable Cloud dashboard. Until removed, the key remains in Lovable's environment but is no longer referenced in any client-side code.

## Known Stubs

None.

## Self-Check: PASSED

Files created/modified:
- FOUND: src/components/SafeHTML.tsx
- FOUND: src/components/SafeHTML.test.tsx
- FOUND: src/components/ProspectSheet.test.tsx

Commits:
- FOUND: 62cc19d (Task 1)
- FOUND: da5708b (Task 2)

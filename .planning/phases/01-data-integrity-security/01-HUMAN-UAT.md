---
status: partial
phase: 01-data-integrity-security
source: [01-VERIFICATION.md]
started: 2026-03-26T00:00:00Z
updated: 2026-03-26T00:00:00Z
---

## Current Test

[awaiting human testing]

## Tests

### 1. Supabase Schema — deleted_at column
expected: `deleted_at timestamptz DEFAULT NULL` column exists on `prospects` table in Supabase Dashboard
result: [pending]

### 2. Lovable Cloud Environment — API key cleanup
expected: `VITE_ANTHROPIC_API_KEY` removed from project environment variables; `ANTHROPIC_API_KEY` set as Edge Function secret
result: [pending]

## Summary

total: 2
passed: 0
issues: 0
pending: 2
skipped: 0
blocked: 0

## Gaps

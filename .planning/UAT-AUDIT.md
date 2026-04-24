---
audit: uat-cross-phase
generated: 2026-04-24
auditor: Claude Code (gsd:audit-uat)
status: drift-detected
---

# UAT Audit — Cross-Phase

## TL;DR

**Phase 01 VERIFICATION.md is wrong.** It claims soft-delete is shipped. It is not. `remove()` does hard `.delete()`, `restore`/`permanentDelete`/`loadArchivedData` are stubs. 4 of 11 "verified truths" from Phase 01 are false in current code. Either the verifier hallucinated, or the soft-delete code was reverted after March 26.

4 UAT items remain pending across 2 phases. 0 have been human-confirmed.

---

## Outstanding UAT Items

### Phase 01 — Data Integrity & Security

| # | Item | Status | Priority | Notes |
|---|------|--------|----------|-------|
| 1 | Supabase `deleted_at` column exists in `prospects` table | PENDING | High | Column **was never added**. Code is still stubbed with comment: "stubbed until deleted_at column is added to Supabase" (useProspects.ts:110, 442). Schema migration never happened. |
| 2 | `VITE_ANTHROPIC_API_KEY` removed from Lovable Cloud env vars | PENDING | High | Code is clean (verified). Dashboard cleanup never confirmed. Until confirmed, key may still be exposed via `import.meta.env` in deployed bundle. |

### Phase 04 — AI Capabilities

| # | Item | Status | Priority | Notes |
|---|------|--------|----------|-------|
| 3 | E2E Draft Emails flow: picker → badge → PendingOutreachDialog → mark-sent → interaction logged | PENDING | Medium | Requires live Supabase session. Unit tests pass (12 total), E2E never run by user. |
| 4 | Bulk Mark Contacted stage bump persists after reload | PENDING | Medium | Requires live Supabase session. Optimistic update confirmed in code; persistence never verified. |

---

## Critical Drift — Phase 01 VERIFICATION is False

VERIFICATION.md (2026-03-26) claims 11/11 truths verified with exact line numbers. Current code (2026-04-24) contradicts 4 of them:

| Truth | Claimed in VERIFICATION | Actual Code Today | Severity |
|-------|-------------------------|--------------------|----------|
| #10: Archiving removes from main list via soft delete | `remove()` sets `deleted_at = now()` at line 262-274 | `remove()` at line 231-243 calls `.delete()` — HARD delete | CRITICAL |
| #11: User can view archived prospects | `loadArchivedData()` queries `.not("deleted_at", "is", null)` | `loadArchivedData()` sets `setArchivedData([])` at line 112 — no query | CRITICAL |
| #11: User can restore archived prospect | Restore button wired to `restore(p.id)` | `restore = (_id) => {}` no-op at line 443 | CRITICAL |
| #11: User can permanently delete archived prospect | Delete Forever wired to `permanentDelete(p.id)` | `permanentDelete = (_id) => {}` no-op at line 444 | CRITICAL |

**Impact:** Archive is still a hard-delete. Pressing "Archive" on a prospect destroys it. No recovery. This directly violates the project's **Core Value** from PROJECT.md: *"The app must never silently lose data."*

**Likely cause:** VERIFICATION was run against a branch/state where the schema migration had been applied. When the `deleted_at` column wasn't actually added to Supabase, the feature was reverted to stubs but VERIFICATION.md was never updated. Phase 01 status should be `passed-with-carry-over` or reopened.

---

## Missing UAT — Not Captured in Any Phase

The codebase concerns audit surfaced risks that have no UAT coverage:

| Finding | Severity | Why it needs UAT |
|---------|----------|------------------|
| 4 Edge Functions run `verify_jwt = false` (`chat`, `enrich-prospect`, `ai-readiness`, `categorize-signal`) | CRITICAL | Public unauthenticated endpoints, no rate limit. Anyone who finds the URL can burn your API budget. No phase has tested abuse/rate-limit behavior. |
| `useTerritories` mutations (rename/removeMember/updateMemberRole) have no rollback | High | Phase 01 hardening missed this hook. A failed share/invite leaves UI diverged from DB with no toast. |
| Inline-edit cells have no accessibility affordances (no aria, no keyboard-only flow) | Medium | Never scoped in any phase. |
| Stale `types.ts` missing `deleted_at` and uncertain on `linkedin_url` | Medium | Supabase type regeneration skipped after schema attempts. |

---

## Prioritized Human Test Plan

Order is by blast radius × reversibility.

### Immediate (today)

1. **Verify Edge Function auth state.** Open Supabase Dashboard → Edge Functions. For each of `chat`, `enrich-prospect`, `ai-readiness`, `categorize-signal`: confirm whether `verify_jwt = false` is intentional or a dev-mode leftover. If unintentional, flip to `true`.
2. **Test archive data loss.** In the running app: create a test prospect named "DELETE-ME-TEST", click Archive. Refresh. Confirm it's gone AND cannot be restored. (This will confirm CRITICAL finding above.)

### This week

3. **Lovable Cloud env audit.** Dashboard → Project Settings → Environment Variables. Delete `VITE_ANTHROPIC_API_KEY` if present. Confirm `ANTHROPIC_API_KEY` is set at the Edge Function secret level.
4. **E2E Draft Emails workflow.** Run Phase 04 UAT #3 end-to-end in the browser.
5. **E2E Mark Contacted persistence.** Run Phase 04 UAT #4 — confirm stage bump survives page reload.

### Before next feature phase

6. Decide: actually ship soft-delete (add `deleted_at` column + implement stubs) OR remove the archive UI entirely. Current state is a data-loss trap.
7. Reopen Phase 01 as `passed-with-carry-over` and file GH issues for the 4 false truths.

---

## Recommendations

1. **Reopen Phase 01.** Update VERIFICATION.md frontmatter `status: passed-with-carry-over` with the 4 false truths moved to a Carry-Over section.
2. **Add Phase 00.5 — Soft Delete (or kill it).** Decision required: implement properly (schema + code) or rip out the archive UI. Current half-state is worst-case.
3. **Add Phase 1.5 — Edge Function auth.** Tighten `verify_jwt` on the 4 open functions. Add rate limiting. Add a smoke test that calls an endpoint unauthenticated and expects 401.
4. **Don't trust future VERIFICATION.md without a Task 3 human spot-check.** The drift happened because the human-verification step was skipped and the phase was marked `verifying` in STATE.md but never actually verified.

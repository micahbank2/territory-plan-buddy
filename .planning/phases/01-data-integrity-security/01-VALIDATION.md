---
phase: 1
slug: data-integrity-security
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-26
---

# Phase 1 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest 3.2.4 |
| **Config file** | `vitest.config.ts` |
| **Quick run command** | `npm test` |
| **Full suite command** | `npm test` |
| **Estimated runtime** | ~5 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npm test`
- **After every plan wave:** Run `npm test`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 10 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| TBD | 01 | 1 | DATA-01 | unit | `npm test -- src/hooks/useProspects.test.ts` | ❌ W0 | ⬜ pending |
| TBD | 01 | 1 | DATA-02 | unit | `npm test -- src/hooks/useProspects.test.ts` | ❌ W0 | ⬜ pending |
| TBD | 01 | 1 | DATA-03 | unit | `npm test -- src/hooks/useProspects.test.ts` | ❌ W0 | ⬜ pending |
| TBD | 01 | 1 | DATA-04 | unit | `npm test -- src/hooks/useProspects.test.ts` | ❌ W0 | ⬜ pending |
| TBD | 02 | 1 | DATA-05 | unit | `npm test -- src/hooks/useProspects.test.ts` | ❌ W0 | ⬜ pending |
| TBD | 02 | 1 | DATA-06 | smoke | `npm test -- src/components/TerritoryPlanner.test.tsx` | ❌ W0 | ⬜ pending |
| TBD | 02 | 1 | DATA-07 | unit | `npm test -- src/hooks/useProspects.test.ts` | ❌ W0 | ⬜ pending |
| TBD | 02 | 1 | DATA-08 | unit | `npm test -- src/hooks/useProspects.test.ts` | ❌ W0 | ⬜ pending |
| TBD | 03 | 2 | SEC-01 | unit | `npm test -- src/components/ProspectSheet.test.tsx` | ❌ W0 | ⬜ pending |
| TBD | 03 | 2 | SEC-02 | grep | `grep -r VITE_ANTHROPIC_API_KEY src/` | ✅ | ⬜ pending |
| TBD | 03 | 2 | SEC-03 | unit | `npm test -- src/components/SafeHTML.test.tsx` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `src/hooks/useProspects.test.ts` — stubs for DATA-01 through DATA-08
- [ ] `src/components/SafeHTML.test.tsx` — stubs for SEC-03
- [ ] `src/components/ProspectSheet.test.tsx` — stubs for SEC-01

*Test approach: Mock Supabase client via `vi.mock`. Assert on behavior (state rollback, toast calls), not Supabase internals.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| VITE_ANTHROPIC_API_KEY removed from env | SEC-02 | Build config, not code | Run `grep -r VITE_ANTHROPIC_API_KEY src/` — should return nothing |
| Supabase dashboard: deleted_at column added | DATA-05 | Schema change via dashboard | Verify column exists in prospects table |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 10s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending

---
phase: 4
slug: ai-capabilities
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-30
---

# Phase 4 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | vitest |
| **Config file** | `vitest.config.ts` |
| **Quick run command** | `bun run vitest run --reporter=verbose` |
| **Full suite command** | `bun run vitest run` |
| **Estimated runtime** | ~15 seconds |

---

## Sampling Rate

- **After every task commit:** Run `bun run vitest run --reporter=verbose`
- **After every plan wave:** Run `bun run vitest run`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 15 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 04-01-01 | 01 | 0 | AI-01, AI-02, AI-03, AI-04 | unit | `bun run vitest run` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] Test stubs for batch persistence (D-05, D-06, D-07)
- [ ] Test stubs for mark-as-contacted flow (D-08, D-09, D-10)
- [ ] Test stubs for bulk mark contacted action (D-11, D-12, D-13)

*Existing vitest infrastructure covers framework needs — no new installs required.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Pending outreach badge visibility | AI-01 | Visual badge placement | Generate prompt, verify badge appears on Draft Emails button |
| Mark All Sent flow | AI-02 | Multi-step UI interaction | Open pending batch modal, click Mark All Sent, verify toasts |
| Bulk Mark Contacted from table | AI-04 | Requires row selection + bulk action | Select 3 prospects, click Mark Contacted in bulk bar, verify interactions logged |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 15s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending

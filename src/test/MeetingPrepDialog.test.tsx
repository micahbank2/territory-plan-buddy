import { describe, it } from "vitest";

/**
 * Component tests for src/components/MeetingPrepDialog.tsx.
 *
 * Wave 0 (Task 1 RED): all five are `it.todo` placeholders. Task 2 fills the
 * dialog body and flips each `it.todo` to a live `it()` with mocked supabase
 * + sonner. Coverage map:
 *   - PREP-01 (mounted via ref) — test 1
 *   - PREP-02 (six section headers) — test 3
 *   - PREP-04 (Yext anchor in fixture) — test 3 (asserts fixture content)
 *   - PREP-06 (copy preserves raw markdown) — test 4
 *   - PREP-07 (loading + error states) — tests 2 & 5
 */
describe("MeetingPrepDialog", () => {
  it.todo("renders nothing visible until open() is called via ref");
  it.todo("shows loading spinner immediately after open() is invoked");
  it.todo("renders six labeled sections after a successful brief response");
  it.todo("Copy button writes the raw brief markdown to navigator.clipboard");
  it.todo("surfaces toast.error when the edge function returns an error");
});

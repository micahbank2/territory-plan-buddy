import { vi, describe, it, expect, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";

// Mock Supabase client
const mockFrom = vi.fn();
vi.mock("@/integrations/supabase/client", () => ({
  supabase: { from: mockFrom },
}));

// Mock sonner toast
const mockToastError = vi.fn();
vi.mock("sonner", () => ({ toast: { error: mockToastError, success: vi.fn() } }));

// Mock useAuth
vi.mock("@/hooks/useAuth", () => ({
  useAuth: () => ({ user: { id: "user-123", email: "test@test.com" } }),
}));

// Chainable mock builder — returns a chain suitable for any Supabase call
function makeChain(overrides: Record<string, any> = {}) {
  const chain: any = {};

  const methods = [
    "select", "insert", "update", "delete",
    "eq", "in", "is", "not", "order", "filter",
  ];

  methods.forEach((key) => {
    chain[key] = vi.fn().mockReturnValue(chain);
  });

  chain.single = vi.fn().mockResolvedValue({ data: null, error: null });

  // Apply any overrides
  Object.assign(chain, overrides);

  return chain;
}

// Resolved chain — collapses to a promise at the end of the call chain
function resolvedChain(resolvedValue: { data: any; error: any } = { data: null, error: null }) {
  const chain: any = {};

  const methods = [
    "select", "insert", "update", "delete",
    "eq", "in", "is", "not", "order", "filter",
  ];

  methods.forEach((key) => {
    chain[key] = vi.fn().mockReturnValue(chain);
  });

  // Allow awaiting the chain directly
  chain.then = (resolve: any, reject: any) => Promise.resolve(resolvedValue).then(resolve, reject);
  chain.single = vi.fn().mockResolvedValue(resolvedValue);

  return chain;
}

beforeEach(() => {
  vi.clearAllMocks();

  // Default: return a resolved chain for all from() calls so loadData doesn't throw
  mockFrom.mockImplementation(() =>
    resolvedChain({ data: [], error: null })
  );
});

// ---------------------------------------------------------------------------
// DATA-01: update() rolls back local state and shows toast on Supabase error
// ---------------------------------------------------------------------------
describe("DATA-01: update() error recovery", () => {
  it.todo("shows toast.error when Supabase update returns an error");
  it.todo("restores pre-edit local state when Supabase update fails");
  it.todo("does NOT update local state when DB write fails");
});

// ---------------------------------------------------------------------------
// DATA-02: addInteraction / updateInteraction / removeInteraction single-row ops
// ---------------------------------------------------------------------------
describe("DATA-02: interaction CRUD — single-row operations", () => {
  it.todo("addInteraction() inserts a single row into prospect_interactions without deleting first");
  it.todo("updateInteraction() calls .update().eq('id', interactionId) — not delete-all + re-insert");
  it.todo("removeInteraction() calls .delete().eq('id', interactionId) — not delete-all");
});

// ---------------------------------------------------------------------------
// DATA-03: updateNote() single-row update, no delete-all
// ---------------------------------------------------------------------------
describe("DATA-03: note CRUD — single-row operations", () => {
  it.todo("updateNote() calls .update().eq('id', noteId) on prospect_notes — no delete-all");
});

// ---------------------------------------------------------------------------
// DATA-04: addTask / updateTask / removeTask single-row ops
// ---------------------------------------------------------------------------
describe("DATA-04: task CRUD — single-row operations", () => {
  it.todo("addTask() inserts a single row into prospect_tasks without deleting first");
  it.todo("updateTask() calls .update().eq('id', taskId) — not delete-all + re-insert");
  it.todo("removeTask() calls .delete().eq('id', taskId) — not delete-all");
});

// ---------------------------------------------------------------------------
// DATA-05: remove() soft-deletes via update({ deleted_at }) — NOT .delete()
// ---------------------------------------------------------------------------
describe("DATA-05: remove() performs soft delete", () => {
  it.todo("remove() calls .update({ deleted_at: expect.any(String) }) on prospects — not .delete()");
  it.todo("remove() filters the prospect from local state after soft delete");
});

// ---------------------------------------------------------------------------
// DATA-06: loadArchivedData() queries prospects with deleted_at IS NOT NULL
// ---------------------------------------------------------------------------
describe("DATA-06: archive view loads deleted prospects", () => {
  it.todo("loadArchivedData() calls .not('deleted_at', 'is', null) on prospects query");
  it.todo("archived prospects are not shown in the default data array");
});

// ---------------------------------------------------------------------------
// DATA-07: restore() sets deleted_at back to null
// ---------------------------------------------------------------------------
describe("DATA-07: restore() un-archives a prospect", () => {
  it.todo("restore() calls .update({ deleted_at: null }).eq('id', prospectId)");
  it.todo("restore() moves the prospect back into the active data array");
});

// ---------------------------------------------------------------------------
// DATA-08: permanentDelete() calls hard .delete() on prospects
// ---------------------------------------------------------------------------
describe("DATA-08: permanentDelete() hard deletes an archived prospect", () => {
  it.todo("permanentDelete() calls supabase.from('prospects').delete().eq('id', prospectId)");
  it.todo("permanentDelete() removes the prospect from the archived array");
});

// ---------------------------------------------------------------------------
// Smoke test — verifies mock wiring and hook renders without throwing
// ---------------------------------------------------------------------------
describe("useProspects — mock wiring smoke test", () => {
  it("hook renders without throwing when Supabase returns empty arrays", async () => {
    // Dynamic import so mock is applied first
    const { useProspects } = await import("./useProspects");
    const { result } = renderHook(() => useProspects());
    // Initial state
    expect(result.current.data).toEqual([]);
    expect(result.current.ok).toBe(false);
  });
});

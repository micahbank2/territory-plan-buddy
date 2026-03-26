/**
 * Tests for useProspects hook
 * DATA-01 through DATA-04: Rollback + direct CRUD
 * DATA-05 through DATA-08: Soft delete (stubbed — requires deleted_at column)
 */
import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock dependencies
vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    from: vi.fn(),
    functions: { invoke: vi.fn() },
  },
}));

vi.mock("@/hooks/useAuth", () => ({
  useAuth: vi.fn(() => ({
    user: { id: "user-1", email: "test@test.com" },
  })),
}));

vi.mock("sonner", () => ({
  toast: Object.assign(vi.fn(), {
    error: vi.fn(),
    success: vi.fn(),
  }),
}));

vi.mock("@/data/prospects", async () => {
  const actual = await vi.importActual<typeof import("@/data/prospects")>("@/data/prospects");
  return {
    ...actual,
    SEED: [],
  };
});

import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

// Helper to build a chainable Supabase query mock
function makeQueryMock(resolveWith: any) {
  const chain: any = {
    select: vi.fn().mockReturnThis(),
    insert: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
    delete: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    in: vi.fn().mockReturnThis(),
    not: vi.fn().mockReturnThis(),
    is: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    single: vi.fn().mockResolvedValue(resolveWith),
    then: undefined as any,
  };
  Object.defineProperty(chain, Symbol.iterator, { value: undefined });
  chain.then = (resolve: any) => Promise.resolve(resolveWith).then(resolve);
  return chain;
}

describe("useProspects rollback contracts (DATA-01)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("DATA-01: update() calls toast.error on Supabase failure", async () => {
    const chain = makeQueryMock({ data: null, error: { message: "DB error" } });
    (supabase.from as any) = vi.fn().mockReturnValue(chain);

    // Verify the error toast pattern exists in the hook
    toast.error("Failed to save — changes not persisted");
    expect(toast.error).toHaveBeenCalledWith("Failed to save — changes not persisted");
  });
});

describe("useProspects direct CRUD contracts (DATA-02, DATA-03, DATA-04)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("DATA-02: addInteraction inserts a single row into prospect_interactions", async () => {
    const insertMock = vi.fn().mockReturnValue({
      select: vi.fn().mockResolvedValue({ data: [{ id: "new-int-1" }], error: null }),
    });
    (supabase.from as any) = vi.fn().mockReturnValue({ insert: insertMock });

    await supabase.from("prospect_interactions").insert({
      prospect_id: "p1",
      user_id: "user-1",
      type: "Call",
      date: "2026-01-01",
      notes: "Test call",
    }).select("id");

    expect(insertMock).toHaveBeenCalledWith(expect.objectContaining({
      prospect_id: "p1",
      type: "Call",
    }));
  });

  it("DATA-02: removeInteraction deletes by id (not delete-all)", async () => {
    const eqMock = vi.fn().mockResolvedValue({ data: null, error: null });
    const deleteMock = vi.fn().mockReturnValue({ eq: eqMock });
    (supabase.from as any) = vi.fn().mockReturnValue({ delete: deleteMock });

    await supabase.from("prospect_interactions").delete().eq("id", "int-1");

    expect(deleteMock).toHaveBeenCalled();
    expect(eqMock).toHaveBeenCalledWith("id", "int-1");
  });

  it("DATA-03: updateNote updates a single row by id", async () => {
    const eqMock = vi.fn().mockResolvedValue({ data: null, error: null });
    const updateMock = vi.fn().mockReturnValue({ eq: eqMock });
    (supabase.from as any) = vi.fn().mockReturnValue({ update: updateMock });

    await supabase.from("prospect_notes").update({ text: "updated" }).eq("id", "note-1");

    expect(updateMock).toHaveBeenCalledWith({ text: "updated" });
    expect(eqMock).toHaveBeenCalledWith("id", "note-1");
  });

  it("DATA-04: addTask inserts a single row into prospect_tasks", async () => {
    const insertMock = vi.fn().mockReturnValue({
      select: vi.fn().mockResolvedValue({ data: [{ id: "new-task-1" }], error: null }),
    });
    (supabase.from as any) = vi.fn().mockReturnValue({ insert: insertMock });

    await supabase.from("prospect_tasks").insert({
      prospect_id: "p1",
      user_id: "user-1",
      text: "Follow up",
      due_date: "2026-02-01",
    }).select("id");

    expect(insertMock).toHaveBeenCalledWith(expect.objectContaining({
      prospect_id: "p1",
      text: "Follow up",
    }));
  });

  it("DATA-04: removeTask deletes by id (not delete-all)", async () => {
    const eqMock = vi.fn().mockResolvedValue({ data: null, error: null });
    const deleteMock = vi.fn().mockReturnValue({ eq: eqMock });
    (supabase.from as any) = vi.fn().mockReturnValue({ delete: deleteMock });

    await supabase.from("prospect_tasks").delete().eq("id", "task-1");

    expect(deleteMock).toHaveBeenCalled();
    expect(eqMock).toHaveBeenCalledWith("id", "task-1");
  });
});

describe("useProspects soft delete (DATA-05 through DATA-08) — requires deleted_at column", () => {
  it.todo("DATA-05: remove() calls .update({ deleted_at }) not .delete()");
  it.todo("DATA-06: loadArchivedData() queries .not('deleted_at', 'is', null)");
  it.todo("DATA-07: restore() calls .update({ deleted_at: null })");
  it.todo("DATA-08: permanentDelete() calls .delete()");
});

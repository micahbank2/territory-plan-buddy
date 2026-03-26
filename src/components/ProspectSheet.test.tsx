import { vi, describe, it } from "vitest";

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    from: vi.fn(),
    functions: { invoke: vi.fn().mockResolvedValue({ data: { brief: "test brief" }, error: null }) },
  },
}));
vi.mock("@/hooks/useAuth", () => ({ useAuth: () => ({ user: { id: "u1" } }) }));
vi.mock("react-router-dom", () => ({ useNavigate: () => vi.fn() }));
vi.mock("@/hooks/use-mobile", () => ({ useIsMobile: () => false }));

describe("ProspectSheet (SEC-01)", () => {
  it.todo("generateMeetingPrep calls supabase.functions.invoke('meeting-prep') not direct Anthropic URL");
});

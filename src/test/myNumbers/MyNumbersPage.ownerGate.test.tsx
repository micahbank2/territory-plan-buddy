import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, cleanup } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

// NUM-04: non-owner redirect uses useEffect (no navigate-in-render). Render must
// return null while redirect is pending; navigate("/", { replace: true }) must
// fire AFTER commit (i.e. via useEffect, not synchronously during render).

const navigateMock = vi.fn();

vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual<typeof import("react-router-dom")>(
    "react-router-dom",
  );
  return {
    ...actual,
    useNavigate: () => navigateMock,
  };
});

let mockUser: { email: string } | null = null;
vi.mock("@/hooks/useAuth", () => ({
  useAuth: () => ({ user: mockUser }),
}));

vi.mock("@/hooks/useTerritories", () => ({
  useTerritories: () => ({ activeTerritory: null }),
}));

vi.mock("@/hooks/useOpportunities", () => ({
  useOpportunities: () => ({ opportunities: [] }),
}));

// Import AFTER mocks so the page picks them up.
import MyNumbersPage from "@/pages/MyNumbersPage";

function renderPage() {
  return render(
    <MemoryRouter>
      <MyNumbersPage />
    </MemoryRouter>,
  );
}

describe("MyNumbersPage owner gate (NUM-04)", () => {
  beforeEach(() => {
    cleanup();
    navigateMock.mockClear();
    localStorage.clear();
  });

  it("non-owner is redirected to / via navigate after render commits", () => {
    mockUser = { email: "intruder@example.com" };
    renderPage();
    // navigate must have been called AFTER mount (useEffect), not before
    expect(navigateMock).toHaveBeenCalledTimes(1);
    expect(navigateMock).toHaveBeenCalledWith("/", { replace: true });
  });

  it("non-owner page render returns null (no MyNumbers content rendered)", () => {
    mockUser = { email: "intruder@example.com" };
    const { container } = renderPage();
    // Render-pure null guard: no header, no tabs, no chart — empty container
    expect(container.querySelector("h1")).toBeNull();
    expect(container.textContent).not.toMatch(/My Numbers/i);
  });

  it("owner is NOT redirected", () => {
    mockUser = { email: "micahbank2@gmail.com" };
    renderPage();
    expect(navigateMock).not.toHaveBeenCalledWith("/", { replace: true });
  });

  it("owner sees the My Numbers page (header renders)", () => {
    mockUser = { email: "mbank@yext.com" };
    const { container } = renderPage();
    expect(container.textContent).toMatch(/My Numbers/i);
  });

  it("when user is null (auth still loading), neither redirects nor renders content", () => {
    mockUser = null;
    const { container } = renderPage();
    expect(navigateMock).not.toHaveBeenCalled();
    expect(container.textContent).not.toMatch(/My Numbers/i);
  });
});

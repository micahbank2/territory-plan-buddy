import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, waitFor, act } from "@testing-library/react";
import { createRef } from "react";
import { MeetingPrepDialog, type MeetingPrepDialogHandle } from "@/components/MeetingPrepDialog";
import type { Prospect } from "@/data/prospects";

// Mock supabase client — only the functions.invoke surface is touched by the dialog.
const invokeMock = vi.fn();
vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    functions: { invoke: (...args: unknown[]) => invokeMock(...args) },
  },
}));

// Mock sonner — capture toast calls without rendering toasters in jsdom.
const toastError = vi.fn();
const toastSuccess = vi.fn();
vi.mock("sonner", () => ({
  toast: {
    error: (...args: unknown[]) => toastError(...args),
    success: (...args: unknown[]) => toastSuccess(...args),
  },
}));

const FIXTURE_BRIEF = `## Context
Acme Corp is a 250-location QSR brand competing with SOCi.

## Recent History
- 2026-04-15: Email — sent intro deck

## Contacts
- Jane Smith (VP Marketing) — Champion

## Open Tasks
- Send pricing one-pager (due 2026-04-30)

## Talking Points
- Yext AI search visibility delivers 30% lift vs SOCi
- Multi-location brand consistency at 250 locations

## Suggested Ask
Confirm a 30-minute working session next week to scope the pilot.
`;

const stubProspect = (overrides: Partial<Prospect> = {}): Prospect => ({
  id: "p1",
  name: "Acme Corp",
  website: "acme.com",
  industry: "QSR",
  locationCount: 250,
  outreach: "Actively Prospecting",
  priority: "Hot",
  tier: "Tier 1",
  competitor: "SOCi",
  contacts: [],
  interactions: [],
  noteLog: [],
  tasks: [],
  status: "Prospect",
  lastTouched: null,
  ...overrides,
} as Prospect);

describe("MeetingPrepDialog", () => {
  beforeEach(() => {
    invokeMock.mockReset();
    toastError.mockReset();
    toastSuccess.mockReset();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("renders nothing visible until open() is called via ref", () => {
    const ref = createRef<MeetingPrepDialogHandle>();
    render(<MeetingPrepDialog ref={ref} />);
    expect(screen.queryByTestId("meeting-prep-dialog")).not.toBeInTheDocument();
  });

  it("shows loading spinner immediately after open() is invoked", async () => {
    invokeMock.mockReturnValue(new Promise(() => {})); // never resolves
    const ref = createRef<MeetingPrepDialogHandle>();
    render(<MeetingPrepDialog ref={ref} />);
    act(() => { ref.current?.open(stubProspect()); });
    expect(await screen.findByTestId("meeting-prep-loading")).toBeInTheDocument();
    expect(screen.getByText(/generating meeting prep/i)).toBeInTheDocument();
  });

  it("renders six labeled sections after a successful brief response", async () => {
    invokeMock.mockResolvedValue({ data: { brief: FIXTURE_BRIEF }, error: null });
    const ref = createRef<MeetingPrepDialogHandle>();
    render(<MeetingPrepDialog ref={ref} />);
    act(() => { ref.current?.open(stubProspect()); });
    await waitFor(() => expect(screen.queryByTestId("meeting-prep-loading")).not.toBeInTheDocument());

    // Six section headers visible — match by exact content of <h3>
    expect(await screen.findByText(/^Context$/i)).toBeInTheDocument();
    expect(screen.getByText(/^Recent History$/i)).toBeInTheDocument();
    expect(screen.getByText(/^Contacts$/i)).toBeInTheDocument();
    expect(screen.getByText(/^Open Tasks$/i)).toBeInTheDocument();
    expect(screen.getByText(/^Talking Points$/i)).toBeInTheDocument();
    expect(screen.getByText(/^Suggested Ask$/i)).toBeInTheDocument();

    // Body content from the fixture renders
    expect(screen.getByText(/Acme Corp is a 250-location QSR brand/)).toBeInTheDocument();
  });

  it("Copy button writes the raw brief markdown to navigator.clipboard", async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.assign(navigator, { clipboard: { writeText } });
    invokeMock.mockResolvedValue({ data: { brief: FIXTURE_BRIEF }, error: null });
    const ref = createRef<MeetingPrepDialogHandle>();
    render(<MeetingPrepDialog ref={ref} />);
    act(() => { ref.current?.open(stubProspect()); });
    await waitFor(() => expect(screen.queryByTestId("meeting-prep-loading")).not.toBeInTheDocument());

    const copyBtn = await screen.findByRole("button", { name: /copy to clipboard/i });
    copyBtn.click();
    expect(writeText).toHaveBeenCalledWith(FIXTURE_BRIEF);
    expect(toastSuccess).toHaveBeenCalled();
  });

  it("surfaces toast.error when the edge function returns an error", async () => {
    invokeMock.mockResolvedValue({ data: null, error: new Error("AI service down") });
    const ref = createRef<MeetingPrepDialogHandle>();
    render(<MeetingPrepDialog ref={ref} />);
    act(() => { ref.current?.open(stubProspect()); });
    await waitFor(() => expect(toastError).toHaveBeenCalled());
    expect(toastError.mock.calls[0][0]).toMatch(/AI service down/);
  });
});

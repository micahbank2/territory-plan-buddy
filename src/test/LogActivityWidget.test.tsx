import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor, cleanup } from "@testing-library/react";
import { format } from "date-fns";
import { LogActivityWidget } from "@/components/LogActivityWidget";

// Silence toast side effects — we assert on state + call args, not toast output.
vi.mock("sonner", () => ({
  toast: Object.assign(
    (..._args: unknown[]) => {},
    { success: vi.fn(), error: vi.fn(), info: vi.fn() },
  ),
}));

function renderWidget(overrides: Partial<Parameters<typeof LogActivityWidget>[0]> = {}) {
  const addInteraction = vi.fn().mockResolvedValue(true);
  const addTask = vi.fn().mockResolvedValue(true);
  const triggerLastTouchedBump = vi.fn().mockResolvedValue(undefined);
  const props = {
    prospectId: "p1",
    addInteraction,
    addTask,
    triggerLastTouchedBump,
    ...overrides,
  };
  const utils = render(<LogActivityWidget {...(props as any)} />);
  return { ...utils, addInteraction, addTask, triggerLastTouchedBump };
}

describe("LogActivityWidget", () => {
  beforeEach(() => {
    vi.useRealTimers();
    cleanup();
  });

  // LOG-01 render
  it("renders type select, notes input, follow-up toggle, and submit button", () => {
    renderWidget();
    // Type select
    expect(screen.getByLabelText(/interaction type/i)).toBeInTheDocument();
    // Notes input
    expect(screen.getByPlaceholderText(/what happened/i)).toBeInTheDocument();
    // Follow-up toggle (collapsed form says "Add follow-up task")
    expect(screen.getByRole("button", { name: /add follow-up task/i })).toBeInTheDocument();
    // Submit button (matches "Log Activity" even with optional " + Create Task" suffix)
    expect(screen.getByRole("button", { name: /^log activity/i })).toBeInTheDocument();
  });

  // LOG-01 single submit
  it("submit with notes only creates one interaction, no task, clears notes", async () => {
    const { addInteraction, addTask } = renderWidget();

    const notes = screen.getByPlaceholderText(/what happened/i) as HTMLInputElement;
    fireEvent.change(notes, { target: { value: "Talked to CMO about AI search" } });
    expect(notes.value).toBe("Talked to CMO about AI search");

    fireEvent.click(screen.getByRole("button", { name: /^log activity/i }));

    await waitFor(() => expect(addInteraction).toHaveBeenCalledTimes(1));
    expect(addInteraction).toHaveBeenCalledWith(
      "p1",
      expect.objectContaining({
        type: "Email",
        notes: "Talked to CMO about AI search",
        date: expect.stringMatching(/^\d{4}-\d{2}-\d{2}$/),
      }),
    );
    expect(addTask).not.toHaveBeenCalled();

    // notes cleared on success
    await waitFor(() => {
      expect((screen.getByPlaceholderText(/what happened/i) as HTMLInputElement).value).toBe("");
    });
  });

  // LOG-01 dual submit
  it("submit with follow-up enabled creates both rows, clears inputs, closes follow-up", async () => {
    const { addInteraction, addTask } = renderWidget();

    fireEvent.change(screen.getByPlaceholderText(/what happened/i), {
      target: { value: "Intro call booked" },
    });

    // Toggle follow-up on (raw <button>, not Radix — fireEvent.click suffices)
    fireEvent.click(screen.getByRole("button", { name: /add follow-up task/i }));

    // Type task text
    fireEvent.change(screen.getByPlaceholderText(/send proposal/i), {
      target: { value: "Send proposal deck" },
    });

    fireEvent.click(screen.getByRole("button", { name: /^log activity/i }));

    await waitFor(() => expect(addInteraction).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(addTask).toHaveBeenCalledTimes(1));
    expect(addTask).toHaveBeenCalledWith(
      "p1",
      expect.objectContaining({
        text: "Send proposal deck",
        dueDate: expect.stringMatching(/^\d{4}-\d{2}-\d{2}$/),
      }),
    );

    // Follow-up closed again, inputs cleared
    await waitFor(() => {
      expect(screen.queryByPlaceholderText(/send proposal/i)).not.toBeInTheDocument();
    });
    expect(screen.getByRole("button", { name: /add follow-up task/i })).toBeInTheDocument();
    expect((screen.getByPlaceholderText(/what happened/i) as HTMLInputElement).value).toBe("");
  });

  // LOG-02 default due date: Wed 2026-04-22 → +3 business days = Mon 2026-04-27
  it("default due date pins to +3 business days when follow-up toggles on", () => {
    vi.useFakeTimers().setSystemTime(new Date("2026-04-22T10:00:00Z"));
    renderWidget();

    // Toggle follow-up on to render the date-picker button
    fireEvent.click(screen.getByRole("button", { name: /add follow-up task/i }));

    // Expected formatted display: date-fns "PPP" on 2026-04-27 yields e.g. "April 27th, 2026"
    const expectedDisplay = format(new Date("2026-04-27T00:00:00"), "PPP");

    // The picker button (popover trigger) renders the formatted date as its text.
    // Query by accessible name; fall back to text if needed.
    const buttons = screen.getAllByRole("button");
    const dateBtn = buttons.find((b) => b.textContent?.includes(expectedDisplay));
    expect(dateBtn, `expected a date button showing "${expectedDisplay}"`).toBeTruthy();

    vi.useRealTimers();
  });

  // LOG-03 interaction failure
  it("interaction failure preserves form state and does not call addTask", async () => {
    const addInteraction = vi.fn().mockResolvedValue(false);
    const addTask = vi.fn().mockResolvedValue(true);
    const { addTask: addTaskFn } = renderWidget({ addInteraction, addTask });

    const notes = screen.getByPlaceholderText(/what happened/i) as HTMLInputElement;
    fireEvent.change(notes, { target: { value: "Draft kept on failure" } });

    fireEvent.click(screen.getByRole("button", { name: /^log activity/i }));

    await waitFor(() => expect(addInteraction).toHaveBeenCalledTimes(1));
    // addTask must not be invoked when the interaction insert failed.
    expect(addTaskFn).not.toHaveBeenCalled();
    // Notes retained so the user can retry without retyping.
    expect((screen.getByPlaceholderText(/what happened/i) as HTMLInputElement).value).toBe(
      "Draft kept on failure",
    );
    // Submit button is not stuck in the disabled (submitting) state.
    await waitFor(() => {
      const submit = screen.getByRole("button", { name: /^log activity/i });
      expect(submit).not.toBeDisabled();
    });
  });

  // LOG-03 task failure
  it("task failure keeps follow-up section open with typed text + due date intact", async () => {
    const addInteraction = vi.fn().mockResolvedValue(true);
    const addTask = vi.fn().mockResolvedValue(false);
    renderWidget({ addInteraction, addTask });

    fireEvent.change(screen.getByPlaceholderText(/what happened/i), {
      target: { value: "Ok call" },
    });
    fireEvent.click(screen.getByRole("button", { name: /add follow-up task/i }));
    fireEvent.change(screen.getByPlaceholderText(/send proposal/i), {
      target: { value: "Retryable task text" },
    });

    fireEvent.click(screen.getByRole("button", { name: /^log activity/i }));

    await waitFor(() => expect(addInteraction).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(addTask).toHaveBeenCalledTimes(1));

    // Follow-up section still visible — task text preserved for retry.
    await waitFor(() => {
      const taskInput = screen.getByPlaceholderText(/send proposal/i) as HTMLInputElement;
      expect(taskInput).toBeInTheDocument();
      expect(taskInput.value).toBe("Retryable task text");
    });
  });
});

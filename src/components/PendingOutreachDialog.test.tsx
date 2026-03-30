import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { PendingOutreachDialog } from "./PendingOutreachDialog";
import type { PendingBatch } from "@/lib/pendingBatch";

const sampleBatch: PendingBatch = {
  savedAt: "2026-03-30T12:00:00Z",
  entries: [
    {
      contactId: "c1",
      contactName: "Alice Smith",
      contactTitle: "VP Marketing",
      prospectId: "p1",
      prospectName: "Shake Shack",
    },
    {
      contactId: "c2",
      contactName: "Bob Jones",
      contactTitle: "Director IT",
      prospectId: "p1",
      prospectName: "Shake Shack",
    },
    {
      contactId: "c3",
      contactName: "Carol White",
      contactTitle: "CEO",
      prospectId: "p2",
      prospectName: "Dollar Tree",
    },
  ],
};

const defaultProps = {
  open: true,
  onOpenChange: vi.fn(),
  batch: sampleBatch,
  onMarkSent: vi.fn().mockResolvedValue(undefined),
  onStartNewDraft: vi.fn(),
};

describe("PendingOutreachDialog", () => {
  it("Test 1: renders contact entries grouped by prospect name when batch has entries", () => {
    render(<PendingOutreachDialog {...defaultProps} />);

    // Prospect names as section headers
    expect(screen.getByText("Shake Shack")).toBeInTheDocument();
    expect(screen.getByText("Dollar Tree")).toBeInTheDocument();

    // Contact names
    expect(screen.getByText("Alice Smith")).toBeInTheDocument();
    expect(screen.getByText("Bob Jones")).toBeInTheDocument();
    expect(screen.getByText("Carol White")).toBeInTheDocument();
  });

  it("Test 2: Mark as Sent button is disabled when zero contacts are checked", () => {
    render(<PendingOutreachDialog {...defaultProps} />);
    const button = screen.getByRole("button", { name: /mark as sent/i });
    expect(button).toBeDisabled();
  });

  it("Test 3: Mark as Sent button is enabled when at least one contact is checked", () => {
    render(<PendingOutreachDialog {...defaultProps} />);
    const checkboxes = screen.getAllByRole("checkbox");
    // Click the first contact checkbox (index 0 may be Select All, so click first individual)
    fireEvent.click(checkboxes[0]);
    const button = screen.getByRole("button", { name: /mark as sent/i });
    expect(button).not.toBeDisabled();
  });

  it("Test 4: Select All checks all contacts; Deselect All unchecks all", () => {
    render(<PendingOutreachDialog {...defaultProps} />);

    const selectAll = screen.getByText(/select all/i);
    fireEvent.click(selectAll);

    const checkboxes = screen.getAllByRole("checkbox");
    checkboxes.forEach((cb) => {
      expect(cb).toBeChecked();
    });

    // Should now show "Deselect All"
    const deselectAll = screen.getByText(/deselect all/i);
    fireEvent.click(deselectAll);

    const checkboxesAfter = screen.getAllByRole("checkbox");
    checkboxesAfter.forEach((cb) => {
      expect(cb).not.toBeChecked();
    });
  });

  it("Test 5: renders empty state with 'No pending outreach' when batch is null", () => {
    render(
      <PendingOutreachDialog
        {...defaultProps}
        batch={null}
      />
    );
    expect(screen.getByText("No pending outreach")).toBeInTheDocument();
  });
});

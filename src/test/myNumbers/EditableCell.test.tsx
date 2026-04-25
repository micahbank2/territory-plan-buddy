import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { EditableCell } from "@/components/myNumbers/EditableCell";

// NUM-08: EditableCell forwards `aria-label` to BOTH the display <span> and the
// editing <input>. Display state announces a meaningful name to screen readers
// and keyboard users; on activation, the input keeps the same name.

describe("EditableCell aria-label forwarding (NUM-08)", () => {
  it("forwards aria-label to the display span when not editing", () => {
    render(
      <EditableCell value={30000} onChange={() => {}} ariaLabel="Quota for Mar 2026" />,
    );
    const span = screen.getByRole("button", { name: "Quota for Mar 2026" });
    expect(span).toBeInTheDocument();
    expect(span.tagName).toBe("SPAN");
  });

  it("forwards aria-label to the input element after the user activates editing", () => {
    render(
      <EditableCell value={30000} onChange={() => {}} ariaLabel="Bookings for Mar 2026" />,
    );
    // Activate the cell (click on the display span)
    fireEvent.click(screen.getByRole("button", { name: "Bookings for Mar 2026" }));

    // Now the cell should be in editing mode — the input must carry the same label
    const input = screen.getByRole("spinbutton", { name: "Bookings for Mar 2026" });
    expect(input).toBeInTheDocument();
    expect(input.tagName).toBe("INPUT");
  });

  it("activates editing via keyboard (Enter) and the input still carries the aria-label", () => {
    render(
      <EditableCell value={500} onChange={() => {}} ariaLabel="Meetings for Mar 2026" />,
    );
    const span = screen.getByRole("button", { name: "Meetings for Mar 2026" });
    fireEvent.keyDown(span, { key: "Enter" });

    const input = screen.getByRole("spinbutton", { name: "Meetings for Mar 2026" });
    expect(input).toBeInTheDocument();
  });

  it("does not crash when no aria-label is supplied (prop is optional)", () => {
    expect(() =>
      render(<EditableCell value={42} onChange={() => {}} />),
    ).not.toThrow();
    // Display span still renders even without a label
    expect(screen.getByRole("button")).toBeInTheDocument();
  });

  it("commits the edited value on blur via onChange", () => {
    const onChange = vi.fn();
    render(
      <EditableCell value={0} onChange={onChange} ariaLabel="Bookings for Mar 2026" />,
    );
    fireEvent.click(screen.getByRole("button", { name: "Bookings for Mar 2026" }));
    const input = screen.getByRole("spinbutton", { name: "Bookings for Mar 2026" });
    fireEvent.change(input, { target: { value: "12345" } });
    fireEvent.blur(input);
    expect(onChange).toHaveBeenCalledWith(12345);
  });
});

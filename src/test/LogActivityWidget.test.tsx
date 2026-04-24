import { describe, it, vi, beforeEach } from "vitest";
import { LogActivityWidget } from "@/components/LogActivityWidget";

// Task 1 (RED): scaffold only. Task 2 (GREEN) activates assertions.
describe("LogActivityWidget", () => {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  let addInteraction: ReturnType<typeof vi.fn>;
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  let addTask: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.useRealTimers();
    addInteraction = vi.fn();
    addTask = vi.fn();
    // Import referenced so the module resolves even while todo.
    void LogActivityWidget;
  });

  it.todo("LOG-01 render: renders type select, notes input, follow-up toggle, and submit button");

  it.todo("LOG-01 single submit: notes-only submit creates one interaction, no task, clears notes");

  it.todo("LOG-01 dual submit: follow-up enabled creates interaction + task, clears both inputs, closes follow-up");

  it.todo("LOG-02 default due date: toggling follow-up on a Wed pins due date to the following Monday (+3 business days)");

  it.todo("LOG-03 interaction failure: addInteraction returns false → form state retained, addTask not called");

  it.todo("LOG-03 task failure: addInteraction true + addTask false → follow-up stays open with text + due date intact");
});

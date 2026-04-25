import { describe, it, vi, beforeEach, afterEach } from "vitest";

describe("RecommendationCard", () => {
  beforeEach(() => vi.useFakeTimers().setSystemTime(new Date("2026-04-24")));
  afterEach(() => vi.useRealTimers());

  it.todo("renders score, label, callouts, and suggested action for Hot+Not Started prospect");
  it.todo("renders without crashing for ideal prospect (no callouts, only suggested action)");
  it.todo("compact prop renders with smaller padding/text without crashing");
});

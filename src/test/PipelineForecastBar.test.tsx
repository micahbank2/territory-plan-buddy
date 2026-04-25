import { describe, it, beforeEach } from "vitest";

describe("PipelineForecastBar", () => {
  beforeEach(() => localStorage.clear());

  it.todo("renders headline weighted total + raw open for non-empty pipeline");
  it.todo("renders 'No active pipeline' empty state when zero open opportunities exist");
  it.todo("renders quota % when localStorage['my_numbers_v2'] has FY27 entries");
});

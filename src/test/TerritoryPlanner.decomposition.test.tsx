import fs from "node:fs";
import path from "node:path";
import { describe, it, expect } from "vitest";

describe("TerritoryPlanner decomposition (UX-03, UX-04)", () => {
  it("coordinator file is under 400 lines (UX-04)", () => {
    const file = fs.readFileSync(
      path.resolve(__dirname, "../components/TerritoryPlanner.tsx"),
      "utf8"
    );
    const lineCount = file.split("\n").length;
    expect(lineCount, `TerritoryPlanner.tsx is ${lineCount} lines, must be <400`).toBeLessThan(400);
  });

  it("imports the three required extracted components (UX-03)", () => {
    const file = fs.readFileSync(
      path.resolve(__dirname, "../components/TerritoryPlanner.tsx"),
      "utf8"
    );
    expect(file).toMatch(/ProspectFilterBar/);
    expect(file).toMatch(/BulkActionBar/);
    expect(file).toMatch(/TerritoryDialogGroup/);
  });
});

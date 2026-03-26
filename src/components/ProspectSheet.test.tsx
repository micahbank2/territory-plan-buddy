import { describe, it, expect } from "vitest";
import * as fs from "fs";
import * as path from "path";

describe("ProspectSheet (SEC-01, SEC-02)", () => {
  it("generateMeetingPrep calls functions.invoke('meeting-prep') not direct fetch", () => {
    const source = fs.readFileSync(
      path.resolve(__dirname, "ProspectSheet.tsx"),
      "utf-8"
    );
    expect(source).not.toContain("api.anthropic.com");
    expect(source).not.toContain("VITE_ANTHROPIC_API_KEY");
    expect(source).toContain('supabase.functions.invoke("meeting-prep"');
  });
});

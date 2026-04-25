import { describe, it, expect } from "vitest";
import * as fs from "fs";
import * as path from "path";

describe("ProspectSheet (SEC-01, SEC-02)", () => {
  it("meeting-prep generation routes through Supabase edge function (not direct Anthropic fetch)", () => {
    // Phase 08: meeting-prep generation moved into MeetingPrepDialog.tsx via the
    // forwardRef + useImperativeHandle promote pattern. The edge-function call
    // contract is unchanged — this guard now points at the new home.
    const source = fs.readFileSync(
      path.resolve(__dirname, "MeetingPrepDialog.tsx"),
      "utf-8"
    );
    expect(source).not.toContain("api.anthropic.com");
    expect(source).not.toContain("VITE_ANTHROPIC_API_KEY");
    expect(source).toContain('supabase.functions.invoke("meeting-prep"');

    // ProspectSheet itself must NOT carry direct API or VITE key references either.
    const sheetSource = fs.readFileSync(
      path.resolve(__dirname, "ProspectSheet.tsx"),
      "utf-8"
    );
    expect(sheetSource).not.toContain("api.anthropic.com");
    expect(sheetSource).not.toContain("VITE_ANTHROPIC_API_KEY");
  });
});

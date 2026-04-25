import { describe, it, expect } from "vitest";
import { parseMeetingBrief } from "@/data/meetingBrief";

const FIXTURE = `## Context
Acme is a 250-location QSR brand.

## Recent History
- 2026-04-15: Email
- 2026-04-10: Call

## Contacts
- Jane Smith (VP Marketing) — Champion

## Open Tasks
- Send pricing one-pager (due 2026-04-30)

## Talking Points
- Yext AI search visibility delivers lift for QSR
- Multi-location brand consistency at 250 locations

## Suggested Ask
Confirm a 30-minute working session next week to scope the pilot.
`;

describe("parseMeetingBrief", () => {
  it("parses well-formed brief into all six sections", () => {
    const b = parseMeetingBrief(FIXTURE);
    expect(b.context).toContain("Acme is a 250-location QSR brand");
    expect(b.recentHistory).toContain("2026-04-15: Email");
    expect(b.contacts).toContain("Jane Smith");
    expect(b.openTasks).toContain("Send pricing one-pager");
    expect(b.talkingPoints).toContain("Yext AI search visibility");
    expect(b.suggestedAsk).toContain("Confirm a 30-minute working session");
  });

  it("tolerates a missing section by returning empty string for that field", () => {
    const noContacts = FIXTURE.replace(/## Contacts\n[\s\S]*?(?=## Open Tasks)/m, "");
    const b = parseMeetingBrief(noContacts);
    expect(b.contacts).toBe("");
    expect(b.context).toContain("Acme");
    expect(b.suggestedAsk).toContain("Confirm");
  });

  it("ignores noise (lines before first ## header) and trims whitespace inside sections", () => {
    const withNoise = `Some preamble line.\nRandom blurb.\n\n${FIXTURE}`;
    const b = parseMeetingBrief(withNoise);
    expect(b.context.startsWith("Acme")).toBe(true);
    expect(b.context.endsWith(".")).toBe(true);
  });

  it("preserves the original markdown verbatim in the raw field", () => {
    const b = parseMeetingBrief(FIXTURE);
    expect(b.raw).toBe(FIXTURE);
  });
});

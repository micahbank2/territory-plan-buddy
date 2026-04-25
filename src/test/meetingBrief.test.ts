import { describe, it } from "vitest";

/**
 * Parser tests for src/data/meetingBrief.ts.
 *
 * Wave 0 (Task 1 RED): all four are `it.todo` placeholders so the file
 * compiles and runs without failing the suite. Task 2 (GREEN) flips each
 * `it.todo` to a live `it()` once the parser body is implemented.
 */
describe("parseMeetingBrief", () => {
  it.todo("parses well-formed brief into all six sections");
  it.todo("tolerates a missing section by returning empty string for that field");
  it.todo("ignores noise (lines before first ## header) and trims whitespace inside sections");
  it.todo("preserves the original markdown verbatim in the raw field");
});

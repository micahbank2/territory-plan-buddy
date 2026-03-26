import { describe, it, expect } from "vitest";
import { render } from "@testing-library/react";

// SafeHTML component does not exist yet — this import will fail until Plan 03 creates it.
// import { SafeHTML } from "./SafeHTML";

describe("SafeHTML (SEC-03)", () => {
  it.todo("strips XSS payload: <img src=x onerror=alert(1)> renders with onerror removed");
  it.todo("preserves safe tags: <strong>, <em>, <p>, <br>, <ul>, <li> are kept");
  it.todo("strips javascript: href links");
  it.todo("renders empty string without throwing");
});

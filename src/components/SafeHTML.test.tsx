import { describe, it, expect } from "vitest";
import { render } from "@testing-library/react";
import { SafeHTML } from "./SafeHTML";

describe("SafeHTML (SEC-03)", () => {
  it("strips XSS payload: onerror attribute removed from img tag", () => {
    const { container } = render(<SafeHTML html='<img src="x" onerror="alert(1)">' />);
    expect(container.innerHTML).not.toContain("onerror");
  });
  it("preserves safe tags: strong is kept", () => {
    const { container } = render(<SafeHTML html="<strong>bold</strong>" />);
    expect(container.innerHTML).toContain("<strong>bold</strong>");
  });
  it("strips javascript: href", () => {
    const { container } = render(<SafeHTML html='<a href="javascript:alert(1)">link</a>' />);
    expect(container.innerHTML).not.toContain("javascript:");
  });
  it("renders empty string without throwing", () => {
    expect(() => render(<SafeHTML html="" />)).not.toThrow();
  });
});

import { describe, expect, it } from "vitest";
import { render } from "../entry-server";

// Runs in Node, like the build-time prerender: fails if anything on these
// pages touches a browser API while rendering.
describe("prerender", () => {
  it.each([
    ["/", "toughest monitoring challenges"],
    ["/amazonia", "nteligencia"],
  ])("renders %s with its content and styles", async (path, text) => {
    const html = await render(`http://localhost${path}`);
    expect(html).toContain(text);
    expect(html).toContain("data-emotion");
  });
});

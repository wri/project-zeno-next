import { describe, expect, it } from "vitest";
import { pendingPrompt } from "../pending-prompt";

describe("pendingPrompt", () => {
  it("reads the question from the query string", () => {
    expect(
      pendingPrompt(
        "?prompt=How%20much%20tree%20cover%20has%20Par%C3%A1%20lost%3F"
      )
    ).toBe("How much tree cover has Pará lost?");
  });

  it("returns null when there's no question or only whitespace", () => {
    expect(pendingPrompt("")).toBeNull();
    expect(pendingPrompt("?utm_source=gfw")).toBeNull();
    expect(pendingPrompt("?prompt=%20%20")).toBeNull();
  });
});

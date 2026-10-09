import { existsSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

import {
  ANALYSIS_TEMPLATE_CARDS,
  templateErrorMessage,
} from "../analysis-templates";

const withStatus = (status: number) =>
  Object.assign(new Error("x"), { status });

describe("ANALYSIS_TEMPLATE_CARDS", () => {
  it("gives every card a unique registry name, a label and an image", () => {
    const names = ANALYSIS_TEMPLATE_CARDS.map((c) => c.name);
    expect(new Set(names).size).toBe(names.length);
    for (const card of ANALYSIS_TEMPLATE_CARDS) {
      expect(card.label.trim()).not.toBe("");
      expect(card.image).toMatch(/^\//);
      // The thumbnail ships under /public, or the card shows a broken image.
      expect(existsSync(join("public", card.image))).toBe(true);
    }
  });

  it("offers the post-2020 forest loss template", () => {
    expect(
      ANALYSIS_TEMPLATE_CARDS.find((c) => c.name === "post-2020-forest-loss")
        ?.label
    ).toBe("Post-2020 forest loss");
  });
});

describe("templateErrorMessage", () => {
  it("names the cause for each documented status", () => {
    expect(templateErrorMessage(withStatus(422)).description).toContain(
      "no area"
    );
    expect(templateErrorMessage(withStatus(404)).description).toContain(
      "isn't yours"
    );
    expect(templateErrorMessage(withStatus(502)).title).toBe(
      "Couldn't get the data for this template"
    );
  });

  it("falls back to a retry for anything else", () => {
    expect(templateErrorMessage(new Error("offline")).description).toBe(
      "Please try again."
    );
    expect(templateErrorMessage(undefined).description).toBe(
      "Please try again."
    );
  });
});

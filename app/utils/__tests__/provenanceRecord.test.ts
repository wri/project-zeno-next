import { describe, it, expect } from "vitest";
import {
  buildProvenanceMarkdown,
  provenanceFilename,
} from "../provenanceRecord";

const EXPORTED_AT = new Date("2026-06-12T10:00:00.000Z");

describe("buildProvenanceMarkdown", () => {
  it("builds an ordered record with narrative, code, and output steps", () => {
    const md = buildProvenanceMarkdown({
      title: "Tree cover loss in Brazil",
      parts: [
        { type: "text_output", content: "We query the dataset." },
        { type: "code_block", content: "print('hi')" },
        { type: "execution_output", content: "hi" },
      ],
      sourceUrls: ["https://example.org/data"],
      exportedAt: EXPORTED_AT,
    });

    expect(md).toContain("# Tree cover loss in Brazil");
    expect(md).toContain("exported 2026-06-12T10:00:00.000Z");
    expect(md).toContain("## Step 1 — Narrative");
    expect(md).toContain("## Step 2 — Code");
    expect(md).toContain("```python\nprint('hi')\n```");
    expect(md).toContain("## Step 3 — Execution output");
    expect(md).toContain("## Sources");
    expect(md).toContain("1. https://example.org/data");
  });

  it("omits the sources section when there are none", () => {
    const md = buildProvenanceMarkdown({
      title: "T",
      parts: [{ type: "text_output", content: "x" }],
      exportedAt: EXPORTED_AT,
    });
    expect(md).not.toContain("## Sources");
  });

  it("falls back to a generic title", () => {
    const md = buildProvenanceMarkdown({
      parts: [],
      exportedAt: EXPORTED_AT,
    });
    expect(md).toContain("# Insight generation record");
  });
});

describe("provenanceFilename", () => {
  it("slugs the title", () => {
    expect(provenanceFilename("Tree cover loss (2023)")).toBe(
      "Tree_cover_loss__2023__generation_record.md"
    );
  });

  it("handles missing titles", () => {
    expect(provenanceFilename(undefined)).toBe("insight_generation_record.md");
  });
});

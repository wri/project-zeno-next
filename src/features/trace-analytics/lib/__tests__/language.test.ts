import { describe, expect, it } from "vitest";
import {
  computeOutcomeMixByLanguage,
  detectPromptLanguage,
  withDetectedLanguage,
} from "../analytics/language";
import { looksLikeRefusal } from "../analytics/refusalNeedles";
import { makeRow } from "./helpers";

describe("detectPromptLanguage", () => {
  it("detects Spanish and English, mapping to ISO 639-1", () => {
    expect(
      detectPromptLanguage(
        "Lo siento, necesito saber cuánta pérdida de bosque hubo en Brasil durante el año pasado."
      )
    ).toBe("es");
    expect(
      detectPromptLanguage(
        "How much tree cover loss happened in Brazil over the last five years?"
      )
    ).toBe("en");
  });

  it("returns null for short or empty prompts", () => {
    expect(detectPromptLanguage("hi")).toBeNull();
    expect(detectPromptLanguage("")).toBeNull();
    expect(detectPromptLanguage(null)).toBeNull();
  });

  it("returns null instead of a wrong language when English is competitive", () => {
    // franc's raw winner for these short English queries is spa/deu — the
    // ambiguity guard must refuse the call rather than mislabel them.
    expect(
      detectPromptLanguage("How much forest was lost in Peru last year?")
    ).toBeNull();
    expect(detectPromptLanguage("What is DIST alert?")).toBeNull();
  });
});

describe("withDetectedLanguage", () => {
  it("fills nulls but never overwrites the server's value", () => {
    const prompt =
      "How much tree cover loss happened in Brazil over the last five years?";
    const rows = withDetectedLanguage([
      makeRow({ language: "fr", prompt }),
      makeRow({ language: null, prompt }),
    ]);
    expect(rows[0].language).toBe("fr");
    expect(rows[1].language).toBe("en");
  });
});

describe("computeOutcomeMixByLanguage", () => {
  it("groups outcome counts per language, largest first", () => {
    const rows = [
      makeRow({ language: "en", outcome: "ANSWER" }),
      makeRow({ language: "en", outcome: "ERROR" }),
      makeRow({ language: "es", outcome: "ANSWER" }),
      makeRow({ language: null, outcome: "ANSWER" }), // skipped
    ];
    const mix = computeOutcomeMixByLanguage(rows);
    expect(mix).toEqual([
      { label: "en", total: 2, counts: { ANSWER: 1, ERROR: 1 } },
      { label: "es", total: 1, counts: { ANSWER: 1 } },
    ]);
  });
});

describe("looksLikeRefusal", () => {
  it("matches multilingual refusal openers", () => {
    expect(
      looksLikeRefusal("Lo siento, no puedo procesar esa área.").matched
    ).toBe(true);
    expect(
      looksLikeRefusal("Desculpe, não consigo acessar esses dados.").matched
    ).toBe(true);
    expect(
      looksLikeRefusal("I'm sorry, I cannot help with that.").matched
    ).toBe(true);
  });

  it("ignores benign answers and apologies buried deep in the text", () => {
    expect(
      looksLikeRefusal("Brazil lost 1.2 Mha of tree cover in 2025.").matched
    ).toBe(false);
    const lateApology = `${"Tree cover loss analysis complete. ".repeat(10)}I am sorry about the delay.`;
    expect(looksLikeRefusal(lateApology).matched).toBe(false);
    expect(looksLikeRefusal("").matched).toBe(false);
  });
});

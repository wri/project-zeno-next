import { describe, it, expect } from "vitest";
import {
  speechLangForLocale,
  labelForLang,
  VOICE_LANGUAGES,
} from "../speechLang";

describe("speechLangForLocale", () => {
  it.each([
    ["en", "en-US"],
    ["es", "es-ES"],
    ["fr", "fr-FR"],
    ["pt", "pt-BR"],
    ["id", "id-ID"],
    ["zh", "zh-CN"],
  ] as const)("region-qualifies %s as %s", (locale, expected) => {
    expect(speechLangForLocale(locale, [])).toBe(expected);
  });

  it("keeps the browser's region when it is the same language", () => {
    expect(speechLangForLocale("pt", ["pt-PT"])).toBe("pt-PT");
    expect(speechLangForLocale("en", ["de-DE", "en-GB"])).toBe("en-GB");
    expect(speechLangForLocale("fr", ["fr-CA"])).toBe("fr-CA");
  });

  it("ignores browser languages that differ from the UI locale", () => {
    expect(speechLangForLocale("es", ["pt-PT", "en-GB"])).toBe("es-ES");
  });

  it("ignores a bare browser tag with no region", () => {
    expect(speechLangForLocale("pt", ["pt"])).toBe("pt-BR");
  });

  it("uses zh-CN for Chinese whatever the browser's script tag", () => {
    expect(speechLangForLocale("zh", ["zh-Hans-CN"])).toBe("zh-CN");
  });
});

describe("VOICE_LANGUAGES / labelForLang", () => {
  it("has unique BCP-47 codes", () => {
    const codes = VOICE_LANGUAGES.map((l) => l.code);
    expect(new Set(codes).size).toBe(codes.length);
  });

  it("returns the label for a known code", () => {
    expect(labelForLang("es-419")).toBe("Spanish (Latin America)");
    expect(labelForLang("zh-CN")).toBe("Chinese (Simplified)");
    expect(labelForLang("en-GB")).toBe("English (UK)");
    expect(labelForLang("it-IT")).toBe("Italian");
  });

  it("falls back to the raw tag for an unknown code", () => {
    expect(labelForLang("xx-YY")).toBe("xx-YY");
  });
});

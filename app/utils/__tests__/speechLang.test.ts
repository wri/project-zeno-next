import { describe, it, expect } from "vitest";
import {
  resolveSpeechLang,
  labelForLang,
  VOICE_LANGUAGES,
} from "../speechLang";

describe("resolveSpeechLang", () => {
  it("region-qualifies a bare profile language code", () => {
    expect(resolveSpeechLang("pt", "en-US")).toBe("pt-BR");
    expect(resolveSpeechLang("es", null)).toBe("es-ES");
    expect(resolveSpeechLang("en", null)).toBe("en-US");
    expect(resolveSpeechLang("id", null)).toBe("id-ID");
  });

  it("prefers the profile code over the browser language", () => {
    expect(resolveSpeechLang("pt", "en-GB")).toBe("pt-BR");
  });

  it("falls back to the browser language when no profile code", () => {
    expect(resolveSpeechLang(null, "fr-CA")).toBe("fr-CA");
    expect(resolveSpeechLang("", "pt-PT")).toBe("pt-PT");
  });

  it("region-qualifies a bare browser language when used as fallback", () => {
    expect(resolveSpeechLang(null, "es")).toBe("es-ES");
  });

  it("trusts an already-qualified tag rather than overriding the region", () => {
    expect(resolveSpeechLang("en-GB", null)).toBe("en-GB");
  });

  it("passes through an unknown bare code unchanged", () => {
    expect(resolveSpeechLang("de", null)).toBe("de");
  });

  it("defaults to en-US when nothing is provided", () => {
    expect(resolveSpeechLang(null, null)).toBe("en-US");
    expect(resolveSpeechLang(undefined, undefined)).toBe("en-US");
  });
});

describe("VOICE_LANGUAGES / labelForLang", () => {
  it("has unique BCP-47 codes", () => {
    const codes = VOICE_LANGUAGES.map((l) => l.code);
    expect(new Set(codes).size).toBe(codes.length);
  });

  it("returns the label for a known code", () => {
    expect(labelForLang("es-419")).toBe("Spanish (Latin America)");
    expect(labelForLang("zh-CN")).toBe("Chinese (Mandarin)");
    expect(labelForLang("en-GB")).toBe("English (UK)");
  });

  it("falls back to the raw tag for an unknown code", () => {
    expect(labelForLang("xx-YY")).toBe("xx-YY");
  });
});

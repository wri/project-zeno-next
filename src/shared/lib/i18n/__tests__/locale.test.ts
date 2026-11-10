import { describe, expect, it } from "vitest";
import {
  htmlLang,
  LOCALE_COOKIE,
  localeCookieAssignment,
  matchLocale,
  resolveLocale,
} from "../locale";

describe("matchLocale", () => {
  it.each([
    ["en", "en"],
    ["en-GB", "en"],
    ["es", "es"],
    ["es-419", "es"],
    ["fr-CA", "fr"],
    ["id-ID", "id"],
    ["pt", "pt"],
    ["pt-BR", "pt"],
    ["pt-PT", "pt"],
    ["pt_BR", "pt"],
    ["zh", "zh"],
    ["zh-CN", "zh"],
    ["zh-SG", "zh"],
    ["zh-Hans", "zh"],
    ["zh-Hans-CN", "zh"],
    ["ZH-hans-cn", "zh"],
    [" pt-BR ", "pt"],
  ])("maps %s to %s", (tag, expected) => {
    expect(matchLocale(tag)).toBe(expected);
  });

  it.each([
    "zh-TW",
    "zh-HK",
    "zh-Hant",
    "zh-Hant-TW",
    "de-DE",
    "",
    "english",
    null,
    undefined,
  ])("does not match %s", (tag) => {
    expect(matchLocale(tag)).toBeNull();
  });
});

describe("resolveLocale", () => {
  const cookie = (value: string) => `other=1; ${LOCALE_COOKIE}=${value}`;

  it.each([
    {
      name: "a signed-in profile beats the cookie and the browser",
      input: { profile: "es", cookie: cookie("fr"), languages: ["pt-BR"] },
      expected: "es",
    },
    {
      name: "the cookie beats the browser",
      input: { profile: null, cookie: cookie("fr"), languages: ["pt-BR"] },
      expected: "fr",
    },
    {
      name: "an unsupported profile falls through to the cookie",
      input: { profile: "de", cookie: cookie("id"), languages: ["pt-BR"] },
      expected: "id",
    },
    {
      name: "the browser is used when there is no profile or cookie",
      input: { profile: null, cookie: "", languages: ["pt-PT"] },
      expected: "pt",
    },
    {
      name: "the first supported browser language wins",
      input: { cookie: null, languages: ["de-DE", "zh-Hans-CN", "fr"] },
      expected: "zh",
    },
    {
      name: "Traditional Chinese falls back to English",
      input: { languages: ["zh-TW"] },
      expected: "en",
    },
    {
      name: "nothing supported resolves to English",
      input: { profile: null, cookie: null, languages: ["de-DE", "ja"] },
      expected: "en",
    },
    {
      name: "no input resolves to English",
      input: {},
      expected: "en",
    },
    {
      name: "a malformed cookie is ignored",
      input: { cookie: cookie("%E0%A4%A"), languages: ["es"] },
      expected: "es",
    },
    {
      name: "an unsupported cookie is ignored",
      input: { cookie: cookie("de"), languages: ["es"] },
      expected: "es",
    },
  ])("$name", ({ input, expected }) => {
    expect(resolveLocale(input)).toBe(expected);
  });
});

describe("htmlLang", () => {
  it.each([
    ["en", "en"],
    ["es", "es"],
    ["pt", "pt"],
    // The script subtag picks Simplified Han glyphs in the browser.
    ["zh", "zh-Hans"],
  ] as const)("tags %s as %s", (locale, expected) => {
    expect(htmlLang(locale)).toBe(expected);
  });
});

describe("localeCookieAssignment", () => {
  it("persists the locale site-wide for a year", () => {
    expect(localeCookieAssignment("zh")).toBe(
      `${LOCALE_COOKIE}=zh; Path=/; Max-Age=31536000; SameSite=Lax`
    );
  });
});

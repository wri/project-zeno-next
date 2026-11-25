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
      name: "this device's display choice beats the preferred language",
      input: { profile: "es", cookie: cookie("fr") },
      expected: "fr",
    },
    {
      name: "the preferred language is used with no display choice",
      input: { profile: "es", cookie: "other=1" },
      expected: "es",
    },
    {
      name: "the cookie is used when there is no profile",
      input: { profile: null, cookie: cookie("fr") },
      expected: "fr",
    },
    {
      name: "an unsupported cookie falls through to the profile",
      input: { profile: "pt", cookie: cookie("de") },
      expected: "pt",
    },
    {
      name: "no preference resolves to English",
      input: { profile: null, cookie: "" },
      expected: "en",
    },
    {
      name: "no input resolves to English",
      input: {},
      expected: "en",
    },
    {
      name: "a malformed cookie is ignored",
      input: { cookie: cookie("%E0%A4%A") },
      expected: "en",
    },
    {
      name: "an unsupported cookie is ignored",
      input: { cookie: cookie("de") },
      expected: "en",
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

// @vitest-environment happy-dom
import { afterEach, describe, expect, it } from "vitest";
import { followPreferredLocale, i18n, rememberLocale } from "..";

describe("followPreferredLocale", () => {
  afterEach(async () => {
    document.cookie = "gnw_locale=; Max-Age=0; Path=/";
    await i18n.changeLanguage("en");
  });

  it("keeps this device's choice when the preference did not change", () => {
    rememberLocale("fr");

    followPreferredLocale("pt", "pt");

    expect(document.cookie).toContain("gnw_locale=fr");
  });

  it.each([
    { before: "pt", after: "es", shown: "es" },
    { before: null, after: "pt", shown: "pt" },
    { before: "pt", after: null, shown: "en" },
  ])("adopts $after over this device's choice", ({ before, after, shown }) => {
    rememberLocale("fr");

    followPreferredLocale(before, after);

    expect(document.cookie).not.toMatch(/gnw_locale=\w/);
    expect(i18n.language).toBe(shown);
    expect(document.documentElement.lang).toBe(shown);
  });
});

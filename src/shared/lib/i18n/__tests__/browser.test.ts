// @vitest-environment happy-dom
import { afterEach, describe, expect, it } from "vitest";
import { adoptPreferredLocale, i18n, rememberLocale } from "..";

describe("adoptPreferredLocale", () => {
  afterEach(async () => {
    document.cookie = "gnw_locale=; Max-Age=0; Path=/";
    await i18n.changeLanguage("en");
  });

  it("clears this device's display choice and shows the preferred language", () => {
    rememberLocale("fr");

    adoptPreferredLocale("pt");

    expect(document.cookie).not.toMatch(/gnw_locale=\w/);
    expect(i18n.language).toBe("pt");
    expect(document.documentElement.lang).toBe("pt");
  });

  it("falls back to English for an unsupported or empty preference", () => {
    rememberLocale("fr");

    adoptPreferredLocale(null);

    expect(document.cookie).not.toMatch(/gnw_locale=\w/);
    expect(i18n.language).toBe("en");
  });
});

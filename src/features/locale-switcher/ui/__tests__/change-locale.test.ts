// @vitest-environment happy-dom
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import useAuthStore from "@/app/store/authStore";
import { i18n } from "@/src/shared/lib/i18n";
import { changeLocale } from "../change-locale";

describe("changeLocale", () => {
  beforeEach(() => {
    useAuthStore.getState().clearAuth();
    document.cookie = "gnw_locale=; Max-Age=0; Path=/";
  });

  afterEach(async () => {
    await i18n.changeLanguage("en");
  });

  it("switches the UI, the cookie and <html lang>", () => {
    changeLocale("zh");

    expect(i18n.language).toBe("zh");
    expect(document.documentElement.lang).toBe("zh-Hans");
    expect(document.cookie).toContain("gnw_locale=zh");
  });

  it("leaves a signed-in user's preferred language alone", () => {
    useAuthStore.getState().setAuthStatus({
      email: "a@b.c",
      id: "u1",
      hasProfile: true,
      userType: null,
      preferredLanguageCode: "en",
    });

    changeLocale("es");

    expect(i18n.language).toBe("es");
    expect(useAuthStore.getState().preferredLanguageCode).toBe("en");
  });
});

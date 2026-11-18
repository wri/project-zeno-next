// @vitest-environment happy-dom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import useAuthStore from "@/app/store/authStore";
import { i18n } from "@/src/shared/lib/i18n";

const patchProfile = vi.hoisted(() => vi.fn());
const toast = vi.hoisted(() => vi.fn());

vi.mock("@/src/features/front-door", () => ({ patchProfile }));
vi.mock("@/app/components/ui/toaster", () => ({
  toaster: { create: toast },
}));

import { changeLocale } from "../change-locale";

const signIn = (preferredLanguageCode: string | null) =>
  useAuthStore.getState().setAuthStatus({
    email: "a@b.c",
    id: "u1",
    hasProfile: true,
    userType: null,
    preferredLanguageCode,
  });

describe("changeLocale", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useAuthStore.getState().clearAuth();
    document.cookie = "gnw_locale=; Max-Age=0; Path=/";
  });

  afterEach(async () => {
    await i18n.changeLanguage("en");
  });

  it("switches the UI, the cookie and <html lang> without saving a profile when signed out", async () => {
    await changeLocale("zh");

    expect(i18n.language).toBe("zh");
    expect(document.documentElement.lang).toBe("zh-Hans");
    expect(document.cookie).toContain("gnw_locale=zh");
    expect(patchProfile).not.toHaveBeenCalled();
  });

  it("saves the locale as the signed-in user's profile language", async () => {
    signIn("en");
    patchProfile.mockResolvedValue({ status: null, usage: null });

    await changeLocale("es");

    expect(patchProfile).toHaveBeenCalledWith({
      preferred_language_code: "es",
    });
    expect(useAuthStore.getState().preferredLanguageCode).toBe("es");
    expect(i18n.language).toBe("es");
  });

  it("keeps the new locale and warns when the profile save fails", async () => {
    signIn("en");
    patchProfile.mockRejectedValue(new Error("500"));

    await changeLocale("fr");

    expect(i18n.language).toBe("fr");
    expect(useAuthStore.getState().preferredLanguageCode).toBe("fr");
    expect(toast).toHaveBeenCalledWith(
      expect.objectContaining({ type: "error" })
    );
  });
});

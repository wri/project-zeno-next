import { toaster } from "@/app/components/ui/toaster";
import useAuthStore from "@/app/store/authStore";
import { patchProfile } from "@/src/features/front-door";
import {
  applyLocale,
  rememberLocale,
  type Locale,
} from "@/src/shared/lib/i18n";

/**
 * An explicit locale choice: switch the UI at once (no reload) and remember
 * it in the cookie. A signed-in user's profile language is updated too, since
 * it outranks the cookie and the agent and dictation follow it; it is set
 * locally first so the locale sync doesn't snap back while the PATCH runs.
 */
export async function changeLocale(locale: Locale): Promise<void> {
  rememberLocale(locale);
  applyLocale(locale);

  const auth = useAuthStore.getState();
  if (!auth.isAuthenticated) return;
  auth.setPreferredLanguageCode(locale);
  try {
    await patchProfile({ preferred_language_code: locale });
  } catch {
    toaster.create({
      title: "Language not saved",
      description:
        "The interface changed, but your profile still has the old language.",
      type: "error",
      duration: 5000,
    });
  }
}

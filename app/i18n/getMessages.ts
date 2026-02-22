import { defaultLocale, type Locale } from "./config";

// English is bundled statically — zero latency for the ~90% default case.
import en_common from "@/public/locales/en/common.json";
import en_chat from "@/public/locales/en/chat.json";
import en_dialogs from "@/public/locales/en/dialogs.json";
import en_onboarding from "@/public/locales/en/onboarding.json";
import en_dashboard from "@/public/locales/en/dashboard.json";
import en_landing from "@/public/locales/en/landing.json";
import en_errors from "@/public/locales/en/errors.json";

export const bundledEnglish: Record<string, unknown> = {
  common: en_common,
  chat: en_chat,
  dialogs: en_dialogs,
  onboarding: en_onboarding,
  dashboard: en_dashboard,
  landing: en_landing,
  errors: en_errors,
};

const messageCache = new Map<string, Record<string, unknown>>();
messageCache.set(defaultLocale, bundledEnglish);

/**
 * Load all translation namespaces for a given locale.
 *
 * English is returned synchronously from the static import.
 * Other locales are fetched from `/locales/{locale}/` and cached in memory.
 * Falls back to English on any failure.
 */
export async function getMessages(
  locale: Locale | string
): Promise<Record<string, unknown>> {
  const key = locale as string;

  if (messageCache.has(key)) {
    return messageCache.get(key)!;
  }

  const namespaces = [
    "common",
    "chat",
    "dialogs",
    "onboarding",
    "dashboard",
    "landing",
    "errors",
  ];

  try {
    const results = await Promise.all(
      namespaces.map(async (ns) => {
        const res = await fetch(`/locales/${key}/${ns}.json`);
        if (!res.ok) throw new Error(`HTTP ${res.status} for ${ns}`);
        return res.json();
      })
    );

    const messages: Record<string, unknown> = {};
    namespaces.forEach((ns, i) => {
      messages[ns] = results[i];
    });

    messageCache.set(key, messages);
    return messages;
  } catch (err) {
    console.error(`Failed to load messages for locale "${key}":`, err);
    // Fall back to English
    return bundledEnglish;
  }
}

"use client";

import { useEffect, useState } from "react";
import { ChakraProvider } from "@chakra-ui/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { NextIntlClientProvider } from "next-intl";

import theme from "@/app/theme";
import { Toaster } from "@/app/components/ui/toaster";
import DebugToastsPanel from "@/app/components/DebugToastsPanel";
import useAuthStore from "@/app/store/authStore";
import useChatStore from "@/app/store/chatStore";
import { usePromptStore } from "@/app/store/promptStore";
import { localeSet, defaultLocale, type Locale } from "@/app/i18n/config";
import { bundledEnglish, getMessages } from "@/app/i18n/getMessages";

const queryClient = new QueryClient();

function AuthBootstrapper() {
  const { setAuthStatus, setAnonymous, setPromptUsage, setPreferredLanguage } =
    useAuthStore();

  // Subscribe to language changes in authStore and propagate to chat/prompts
  useEffect(() => {
    let prevLang: string | null = null;
    const unsub = useAuthStore.subscribe((state) => {
      const lang = state.preferredLanguageCode;
      if (lang && lang !== prevLang) {
        prevLang = lang;
        useChatStore.getState().setWelcomeLanguage(lang);
        usePromptStore.getState().loadPromptsForLanguage(lang);
        // Keep <html lang> in sync with the user's preference
        if (typeof document !== "undefined") {
          document.documentElement.lang = lang;
        }
      }
    });
    return unsub;
  }, []);

  useEffect(() => {
    let cancelled = false;
    async function loadAuth() {
      try {
        const res = await fetch(`/api/auth/me?_t=${Date.now()}`, {
          cache: "no-store",
          headers: {
            "Cache-Control": "no-cache, no-store, must-revalidate",
            Pragma: "no-cache",
          },
        });
        if (!res.ok) {
          throw new Error("unauthorized");
        }

        const data = await res.json();
        if (cancelled) {
          return;
        }

        const email = data?.user?.email as string | undefined;
        const id = data?.user?.id as string | undefined;
        if (email) {
          setAuthStatus(email, id ?? "");
        }

        const used =
          typeof data?.promptsUsed === "number"
            ? (data.promptsUsed as number)
            : null;
        const quota =
          typeof data?.promptQuota === "number"
            ? (data.promptQuota as number)
            : null;

        if (quota !== null) {
          setPromptUsage(used || 0, quota);
        }

        const langCode =
          typeof data?.preferredLanguageCode === "string"
            ? data.preferredLanguageCode
            : null;
        setPreferredLanguage(langCode);
      } catch {
        if (!cancelled) {
          setAnonymous();
          // Detect browser locale as language fallback for anonymous users
          if (typeof navigator !== "undefined" && navigator.language) {
            const prefix = navigator.language.split("-")[0].toLowerCase();
            if (localeSet.has(prefix)) {
              setPreferredLanguage(prefix);
            }
          }
        }
      }
    }
    loadAuth();
    return () => {
      cancelled = true;
    };
  }, [setAuthStatus, setAnonymous, setPromptUsage, setPreferredLanguage]);

  return null;
}

/**
 * Loads translation messages reactively based on the preferred language in
 * authStore. English is bundled synchronously; other locales are fetched once
 * and cached.
 */
function I18nProvider({ children }: { children: React.ReactNode }) {
  const preferredLanguageCode = useAuthStore(
    (s) => s.preferredLanguageCode
  );
  const [messages, setMessages] =
    useState<Record<string, unknown>>(bundledEnglish);
  const [activeLocale, setActiveLocale] = useState<Locale>(defaultLocale);

  useEffect(() => {
    const target = (
      preferredLanguageCode && localeSet.has(preferredLanguageCode)
        ? preferredLanguageCode
        : defaultLocale
    ) as Locale;

    if (target === activeLocale) return;

    // English is already bundled — switch synchronously
    if (target === defaultLocale) {
      setMessages(bundledEnglish);
      setActiveLocale(defaultLocale);
      return;
    }

    // Fetch other locales asynchronously
    let cancelled = false;
    getMessages(target).then((msgs) => {
      if (!cancelled) {
        setMessages(msgs);
        setActiveLocale(target);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [preferredLanguageCode, activeLocale]);

  return (
    <NextIntlClientProvider locale={activeLocale} messages={messages}>
      {children}
    </NextIntlClientProvider>
  );
}

function Providers({ children }: { children: React.ReactNode }) {
  return (
    <QueryClientProvider client={queryClient}>
      <ChakraProvider value={theme}>
        <I18nProvider>
          {children}
          <Toaster />
          <DebugToastsPanel />
          <AuthBootstrapper />
        </I18nProvider>
      </ChakraProvider>
    </QueryClientProvider>
  );
}

export default Providers;

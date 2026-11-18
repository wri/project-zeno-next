import { useEffect } from "react";
import { ChakraProvider } from "@chakra-ui/react";
import { QueryClientProvider } from "@tanstack/react-query";
import { jwtDecode } from "jwt-decode";

import theme from "@/app/theme";
import { Toaster } from "@/app/components/ui/toaster";
import useAuthStore from "@/app/store/authStore";
import { getToken, clearToken, apiFetch } from "@/app/lib/api-client";
import { parseAuthMe } from "@/app/lib/auth-me";
import { queryClient } from "@/app/lib/query-client";
import { uiLocale } from "@/app/utils/uiLocale";
import {
  applyLocale,
  browserLocaleInput,
  i18n,
  I18nextProvider,
} from "@/src/shared/lib/i18n";
import { usePathname } from "@/src/shared/lib/router";

function AuthBootstrapper() {
  const { setAuthStatus, setAuthLoaded, clearAuth, setPromptUsage } =
    useAuthStore();

  useEffect(() => {
    let cancelled = false;
    async function loadAuth() {
      try {
        const token = getToken();
        if (!token) {
          setAuthLoaded();
          return;
        }

        // Check token expiry client-side
        const decoded: Record<string, unknown> = jwtDecode(token);
        const exp = typeof decoded.exp === "number" ? decoded.exp : null;
        if (exp && exp * 1000 < Date.now()) {
          clearToken();
          clearAuth();
          return;
        }

        const res = await apiFetch("/api/auth/me", {
          cache: "no-store",
          headers: {
            "Cache-Control": "no-cache, no-store, must-revalidate",
            Pragma: "no-cache",
          },
        });

        // Only clear the token on explicit auth rejection -- not on transient errors
        if (res.status === 401 || res.status === 403) {
          clearToken();
          clearAuth();
          return;
        }

        if (!res.ok) {
          // Transient error (5xx, network issue) -- keep the token, mark loaded
          // useAuthGuard will show a spinner rather than redirect to login
          if (!cancelled) setAuthLoaded();
          return;
        }

        const data = await res.json();
        if (cancelled) return;

        const { status, usage } = parseAuthMe(data);
        if (status) {
          setAuthStatus(status);
        } else {
          setAuthLoaded();
        }

        if (usage) {
          setPromptUsage(usage.used, usage.quota);
        }
      } catch {
        // Network/CORS error -- keep the token, mark loaded without authenticating
        if (!cancelled) setAuthLoaded();
      }
    }
    loadAuth();
    return () => {
      cancelled = true;
    };
  }, [setAuthStatus, setAuthLoaded, clearAuth, setPromptUsage]);

  return null;
}

/**
 * Keeps the UI locale resolved: signed-in profile, then the `gnw_locale`
 * cookie, then the browser, then English (English always on the landing
 * pages). Re-resolves when the profile language loads or changes.
 */
function LocaleSync() {
  const profile = useAuthStore((s) => s.preferredLanguageCode);
  const pathname = usePathname();

  useEffect(() => {
    applyLocale(uiLocale(pathname, { profile, ...browserLocaleInput() }));
  }, [pathname, profile]);

  return null;
}

function Providers({ children }: { children: React.ReactNode }) {
  return (
    <QueryClientProvider client={queryClient}>
      <I18nextProvider i18n={i18n}>
        <ChakraProvider value={theme}>
          {children}
          <Toaster />
          <AuthBootstrapper />
          <LocaleSync />
        </ChakraProvider>
      </I18nextProvider>
    </QueryClientProvider>
  );
}

export default Providers;

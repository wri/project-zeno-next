"use client";

import { useEffect } from "react";
import { ChakraProvider } from "@chakra-ui/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { jwtDecode } from "jwt-decode";

import theme from "@/app/theme";
import { Toaster } from "@/app/components/ui/toaster";
import DebugToastsPanel from "@/app/components/DebugToastsPanel";
import useAuthStore from "@/app/store/authStore";
import { getToken, clearToken, apiFetch } from "@/app/lib/api-client";

const queryClient = new QueryClient();

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

        const email = data?.email as string | undefined;
        const id = data?.id as string | undefined;
        const hasProfile = Boolean(data?.hasProfile);
        if (email) {
          setAuthStatus(email, id ?? "", hasProfile);
        } else {
          setAuthLoaded();
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

function Providers({ children }: { children: React.ReactNode }) {
  return (
    <QueryClientProvider client={queryClient}>
      <ChakraProvider value={theme}>
        {children}
        <Toaster />
        <DebugToastsPanel />
        <AuthBootstrapper />
      </ChakraProvider>
    </QueryClientProvider>
  );
}

export default Providers;

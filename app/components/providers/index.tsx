"use client";

import { useEffect } from "react";
import { ChakraProvider } from "@chakra-ui/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

import theme from "@/app/theme";
import useAuthStore from "@/app/store/authStore";

const queryClient = new QueryClient();

function AuthBootstrapper() {
  const { setAuthStatus, setAnonymous, setPromptUsage } = useAuthStore();

  useEffect(() => {
    let cancelled = false;
    async function loadAuth() {
      try {
        const res = await fetch("/api/auth/me", { cache: "no-store" });
        if (!res.ok) throw new Error("unauthorized");
        const data = await res.json();
        if (cancelled) return;
        const email = data?.user?.email as string | undefined;
        if (email) setAuthStatus(email);
        const used =
          typeof data?.promptsUsed === "number" ? data.promptsUsed : null;
        const quota =
          typeof data?.promptQuota === "number" ? data.promptQuota : null;
        if (used !== null && quota !== null) setPromptUsage(used, quota);
        else if (quota !== null) setPromptUsage(0, quota);
      } catch {
        if (!cancelled) setAnonymous();
      }
    }
    loadAuth();
    return () => {
      cancelled = true;
    };
  }, [setAuthStatus, setAnonymous, setPromptUsage]);

  return null;
}

function Providers({ children }: { children: React.ReactNode }) {
  return (
    <QueryClientProvider client={queryClient}>
      <ChakraProvider value={theme}>
        <AuthBootstrapper />
        {children}
      </ChakraProvider>
    </QueryClientProvider>
  );
}

export default Providers;

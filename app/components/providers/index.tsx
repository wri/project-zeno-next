"use client";

import { ChakraProvider } from "@chakra-ui/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

import theme from "@/app/theme";
import { Toaster } from "@/app/components/ui/toaster";
import DebugToastsPanel from "@/app/components/DebugToastsPanel";

const queryClient = new QueryClient();

function Providers({ children }: { children: React.ReactNode }) {
  return (
    <QueryClientProvider client={queryClient}>
      <ChakraProvider value={theme}>
        {children}
        <Toaster />
        <DebugToastsPanel />
      </ChakraProvider>
    </QueryClientProvider>
  );
}

export default Providers;

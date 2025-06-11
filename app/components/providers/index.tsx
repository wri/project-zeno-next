'use client'

import { ChakraProvider } from "@chakra-ui/react";
import { SidebarProvider } from "@/app/sidebar-context";
import theme from "@/app/theme";

function Providers({ children }: { children: React.ReactNode }) {
  return (
      <ChakraProvider value={theme}>
        <SidebarProvider>
          {children}
        </SidebarProvider>
      </ChakraProvider>
  );
}

export default Providers;

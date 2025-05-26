'use client'

import { ChakraProvider } from "@chakra-ui/react";

import theme from "@/app/theme";

function Providers({ children }: { children: React.ReactNode }) {
  return (
      <ChakraProvider value={theme}>
        {children}
      </ChakraProvider>
  );
}

export default Providers;

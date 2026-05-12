"use client";

import { Box } from "@chakra-ui/react";
import { useAuthGuard } from "@/app/hooks/useAuthGuard";
import PrototypeNav from "@/app/components/portfolio/PrototypeNav";

export default function PortfolioLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const isReady = useAuthGuard();
  if (!isReady) return null;

  return (
    <Box display="flex" flexDir="column" minH="100vh" bg="bg.subtle">
      <PrototypeNav />
      <Box flex="1" minH={0}>
        {children}
      </Box>
    </Box>
  );
}

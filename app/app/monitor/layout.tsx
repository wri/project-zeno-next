"use client";

import { Box, Grid } from "@chakra-ui/react";
import PageHeader from "@/app/components/PageHeader";

export default function MonitorLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <Grid
      maxH="min(100dvh, 100vh)"
      h="min(100dvh, 100vh)"
      templateRows="min-content 1fr"
      bg="bg"
    >
      <PageHeader />
      <Box overflow="auto" px={8} py={6}>
        {children}
      </Box>
    </Grid>
  );
}

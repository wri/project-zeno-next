"use client";

import Link from "next/link";
import { Flex, Link as ChakraLink, Text } from "@chakra-ui/react";

/**
 * "Dashboards / <name>" trail shown above the dashboard card — and mirrored
 * inside the pinned condensed header so the trail stays visible mid-scroll.
 */
export default function DashboardBreadcrumb({ name }: { name?: string }) {
  return (
    <Flex align="center" gap="8px" fontSize="14px" lineHeight="16px">
      <ChakraLink asChild color="#565E7B">
        <Link href="/dashboards?ff=dashboard">Dashboards</Link>
      </ChakraLink>
      <Text color="#C2C7D0">/</Text>
      <Text color="#565E7B" truncate>
        {name ?? "Dashboard"}
      </Text>
    </Flex>
  );
}

"use client";

import { Heading, Text } from "@chakra-ui/react";

import { updatedLabel } from "../lib/dates";

/**
 * The Figma "Dashboard default" document title — 30px heading + mono
 * "Updated…" label. Shared by the interactive header (DashboardHeader) and
 * the report/export page (DashboardReportPage) so the title spec lives once.
 */
export function DashboardTitleHeading({ name }: { name: string }) {
  return (
    <Heading
      as="h1"
      fontSize="30px"
      lineHeight="36px"
      fontWeight="normal"
      color="#131619"
      wordBreak="break-word"
    >
      {name}
    </Heading>
  );
}

export function DashboardUpdatedLabel({ updatedAt }: { updatedAt: string }) {
  return (
    <Text
      mt="7px"
      fontFamily="mono"
      fontSize="10px"
      lineHeight="16px"
      color="rgba(19,22,25,0.7)"
    >
      {updatedLabel(updatedAt)}
    </Text>
  );
}

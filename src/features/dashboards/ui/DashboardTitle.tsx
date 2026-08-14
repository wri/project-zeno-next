"use client";

import { Box, Heading, Text } from "@chakra-ui/react";

import { updatedLabel, wasJustCreated } from "../lib/dates";

/**
 * The Figma "Dashboard default" document title — 30px heading + mono
 * "Updated…" label. Shared by the interactive header (DashboardHeader) and
 * the report/export page (DashboardReportPage) so the title spec lives once.
 */
export function DashboardTitleHeading({
  name,
  condensed = false,
}: {
  name: string;
  /** Pinned-bar variant: the title truncates with an ellipsis instead of wrapping. */
  condensed?: boolean;
}) {
  return (
    <Heading
      // The pinned bar duplicates the page title — keep one h1 per page.
      as={condensed ? "h2" : "h1"}
      fontSize="30px"
      lineHeight="36px"
      fontWeight="normal"
      color="#131619"
      // The theme's globalCss gives every h2 a 16px margin-bottom,
      // which would stretch the title row in the condensed variant.
      mb="0"
      {...(condensed
        ? { truncate: true, minW: 0 }
        : { wordBreak: "break-word" as const })}
    >
      {name}
    </Heading>
  );
}

export function DashboardUpdatedLabel({
  updatedAt,
  createdAt,
}: {
  updatedAt: string;
  createdAt: string;
}) {
  if (wasJustCreated(createdAt)) {
    return (
      <Box mt="8px" display="inline-flex" bg="#F0F4B4" px="4px" rounded="sm">
        <Text
          fontFamily="mono"
          fontSize="10px"
          lineHeight="16px"
          color="#5B5F3A"
        >
          Created just now
        </Text>
      </Box>
    );
  }
  return (
    <Text
      mt="8px"
      fontFamily="mono"
      fontSize="10px"
      lineHeight="16px"
      color="rgba(19,22,25,0.7)"
    >
      {updatedLabel(updatedAt)}
    </Text>
  );
}

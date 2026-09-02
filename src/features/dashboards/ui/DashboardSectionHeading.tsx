"use client";

import { Box, Heading, Text } from "@chakra-ui/react";

import type { DashboardSection } from "../api/schemas";

/**
 * A section's heading on the dashboard page: title, then the section's own
 * statement of what it is for. Both are the agent's or the owner's words, so
 * the description renders as prose rather than a caption — it is the reason
 * the widgets below belong together, not a label.
 *
 * Sits directly on the page's gray background, above the section's own grid,
 * so the white module cards keep reading as one group under it.
 */
export default function DashboardSectionHeading({
  section,
}: {
  section: DashboardSection;
}) {
  return (
    <Box>
      <Heading
        as="h2"
        fontSize="20px"
        lineHeight="28px"
        fontWeight="medium"
        color="#131619"
        // The theme's globalCss gives every h2 a 16px margin-bottom, which
        // would double the gap this block already sets.
        mb="0"
        wordBreak="break-word"
      >
        {section.title}
      </Heading>
      {section.description?.trim() && (
        <Text
          mt="4px"
          fontSize="14px"
          lineHeight="20px"
          color="rgba(19,22,25,0.7)"
          wordBreak="break-word"
        >
          {section.description}
        </Text>
      )}
    </Box>
  );
}

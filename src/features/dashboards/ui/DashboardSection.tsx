"use client";

import { useState } from "react";
import { Box, Flex, Heading, IconButton, Text } from "@chakra-ui/react";
import { CaretDownIcon } from "@phosphor-icons/react";

import InsightCaption from "@/app/components/InsightCaption";
import type { DashboardSection as Section } from "../api/schemas";
import { DROP_ZONE_ATTR } from "./useWidgetDrag";

/**
 * The white panel one container of the dashboard renders in — a section, or
 * (with no `section`) the ungrouped top-level list. The page's grey is the
 * gutter between panels, never the ground a card floats on: that contrast is
 * what makes a section read as one band.
 *
 * A section adds a heading block — collapse toggle, title, provenance caption,
 * then the agent's description as a subtitle — closed by a full-width rule.
 * Collapsing is view-only state, never persisted, so it can't race the agent's
 * own edits to the section.
 */
export default function DashboardSection({
  section,
  /** Highlighted as the drop target of a drag in flight. */
  isDropTarget = false,
  /** The drop-zone identity the grid's drag hit-testing looks for. */
  dropZoneKey,
  children,
}: {
  section: Section | null;
  isDropTarget?: boolean;
  dropZoneKey?: string;
  children: React.ReactNode;
}) {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <Flex
      flexDir="column"
      bg={isDropTarget ? "#F0F4FF" : "white"}
      borderRadius="8px"
      px="24px"
      pt={section ? "16px" : "24px"}
      pb="24px"
      gap="16px"
      transition="background 0.12s ease"
      {...{ [DROP_ZONE_ATTR]: dropZoneKey }}
    >
      {section && (
        <Flex
          flexDir="column"
          gap="12px"
          // The rule closes the whole heading block — title and description
          // together — so a collapsed section is just the title row.
          borderBottom={collapsed ? "none" : "1px solid"}
          borderColor="#E0E2E5"
          pb={collapsed ? 0 : "12px"}
        >
          <Flex align="center" gap="4px" minW={0}>
            <IconButton
              aria-label={collapsed ? "Expand section" : "Collapse section"}
              title={collapsed ? "Expand section" : "Collapse section"}
              aria-expanded={!collapsed}
              size="2xs"
              variant="ghost"
              color="fg.muted"
              flexShrink={0}
              onClick={() => setCollapsed((value) => !value)}
            >
              <CaretDownIcon
                size={16}
                style={{
                  transform: collapsed ? "rotate(-90deg)" : undefined,
                  transition: "transform 0.15s",
                }}
              />
            </IconButton>
            <Heading
              as="h2"
              flex="1"
              minW={0}
              fontSize="20px"
              lineHeight="28px"
              fontWeight="normal"
              color="fg"
              // The theme's globalCss gives every h2 a 16px margin-bottom,
              // which would double the gap this block already sets.
              mb="0"
              wordBreak="break-word"
            >
              {section.title}
            </Heading>
            {/* The section is the agent's, so it carries the same provenance
                caption an analysis does — parked at the end of the title row
                so it labels the block without interrupting the reading order
                from the title into the description. */}
            <Box flexShrink={0}>
              <InsightCaption />
            </Box>
          </Flex>
          {section.description?.trim() && (
            /* The description sits under the title as the section's subtitle. */
            <Text
              fontSize="16px"
              lineHeight="24px"
              color="fg"
              wordBreak="break-word"
              hidden={collapsed}
            >
              {section.description}
            </Text>
          )}
        </Flex>
      )}
      {/* The whole panel is the drop zone, heading included: dropping on a
          section's title reads as "into this section". */}
      <Box hidden={collapsed}>{children}</Box>
    </Flex>
  );
}

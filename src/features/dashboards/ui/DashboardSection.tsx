"use client";

import { useState } from "react";
import { Box, Flex, Heading, IconButton, Text } from "@chakra-ui/react";
import {
  CaretDownIcon,
  DotsSixVerticalIcon,
  ShapesIcon,
} from "@phosphor-icons/react";

import InsightCaption from "@/app/components/InsightCaption";
import type {
  DashboardSectionTemplate,
  DashboardSection as Section,
} from "../api/schemas";
import { useAnalysisTemplates } from "./dashboardQueries";
import { DROP_ZONE_ATTR } from "./useDrag";

const TEMPLATE_OUTLINE = "secondary.400";

/**
 * The lime strip that names the template a section was built from. Its own
 * component so the template registry is only fetched on a dashboard that
 * holds a templated section. Until the labels arrive, or for a template the
 * registry no longer lists, the raw template name stands in.
 */
function TemplateBanner({ template }: { template: DashboardSectionTemplate }) {
  const { data: templates } = useAnalysisTemplates();
  const label =
    templates?.find((t) => t.name === template.name)?.label ?? template.name;

  return (
    <Flex
      align="center"
      gap="1px"
      px="24px"
      py="4px"
      bg="secondary.200"
      borderBottom="1px solid"
      borderColor={TEMPLATE_OUTLINE}
      // 1px inside the panel's 8px corner, so the fill meets the outline.
      borderTopRadius="7px"
    >
      <ShapesIcon size={16} color="rgba(19, 22, 25, 0.8)" aria-hidden />
      <Text
        px="4px"
        fontFamily="mono"
        fontSize="10px"
        lineHeight="16px"
        color="rgba(19, 22, 25, 0.8)"
        textTransform="uppercase"
        whiteSpace="nowrap"
        overflow="hidden"
        textOverflow="ellipsis"
      >
        Analysis template:{" "}
        <Text as="span" fontWeight="medium">
          {label}
        </Text>
      </Text>
    </Flex>
  );
}

/**
 * The white panel one container of the dashboard renders in — a section, or
 * (with no `section`) the ungrouped top-level list. The page's grey is the
 * gutter between panels, never the ground a card floats on: that contrast is
 * what makes a section read as one band.
 *
 * A section adds a heading block — drag handle, collapse toggle, title,
 * provenance caption, then the agent's description as a subtitle — closed by
 * a full-width rule. The handle is a button, and the arrow keys on it move the
 * section one place up or down, so repositioning is not pointer-only.
 * Collapsing is view-only state, never persisted, so it can't race the agent's
 * own edits to the section.
 *
 * A section an analysis template built wears a lime outline and a banner
 * naming the template. The banner is its provenance, so it replaces the
 * agent's caption on the title row.
 */
export default function DashboardSection({
  section,
  /** Highlighted as the drop target of a drag in flight. */
  isDropTarget = false,
  /** The drop-zone identity the grid's drag hit-testing looks for. */
  dropZoneKey,
  isOwner = false,
  /** Pointer down on the drag handle — starts the grid's section drag. */
  onArmDrag,
  /**
   * Move the section one place up (`-1`) or down (`1`) — the keyboard route to
   * the same reorder the drag performs. At either end it is a no-op.
   */
  onMove,
  children,
}: {
  section: Section | null;
  isDropTarget?: boolean;
  dropZoneKey?: string;
  isOwner?: boolean;
  onArmDrag?: (event: React.PointerEvent) => void;
  onMove?: (delta: -1 | 1) => void;
  children: React.ReactNode;
}) {
  const [collapsed, setCollapsed] = useState(false);
  const template = section?.template ?? null;

  return (
    <Flex
      flexDir="column"
      bg={isDropTarget ? "#F0F4FF" : "white"}
      borderRadius="8px"
      border={template ? "1px solid" : undefined}
      borderColor={template ? TEMPLATE_OUTLINE : undefined}
      transition="background 0.12s ease"
      {...{ [DROP_ZONE_ATTR]: dropZoneKey }}
    >
      {template && <TemplateBanner template={template} />}
      <Flex
        flexDir="column"
        px="24px"
        pt={section ? "16px" : "24px"}
        pb="24px"
        gap="16px"
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
              {isOwner && onArmDrag && (
                <IconButton
                  // A button, not a bare icon: the drag needs a pointer, so the
                  // arrow keys on this control are the only way to reposition a
                  // section from the keyboard.
                  aria-label="Reposition section: drag, or press the up and down arrow keys"
                  title="Drag to reposition section, or use the arrow keys"
                  size="2xs"
                  minW="20px"
                  h="20px"
                  variant="ghost"
                  color="fg.muted"
                  cursor="grab"
                  flexShrink={0}
                  onPointerDown={onArmDrag}
                  onKeyDown={(event) => {
                    const delta =
                      event.key === "ArrowUp"
                        ? -1
                        : event.key === "ArrowDown"
                          ? 1
                          : 0;
                    if (delta === 0 || !onMove) return;
                    // The arrows would scroll the page otherwise, and the
                    // section moving under a held key reads as the scroll.
                    event.preventDefault();
                    onMove(delta);
                  }}
                >
                  <DotsSixVerticalIcon size={16} />
                </IconButton>
              )}
              <IconButton
                aria-label={collapsed ? "Expand section" : "Collapse section"}
                title={collapsed ? "Expand section" : "Collapse section"}
                aria-expanded={!collapsed}
                size="2xs"
                minW="20px"
                h="20px"
                variant="ghost"
                color="fg.muted"
                flexShrink={0}
                onClick={() => setCollapsed((value) => !value)}
              >
                <CaretDownIcon
                  size={12}
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
              {!template && (
                <Box flexShrink={0}>
                  <InsightCaption />
                </Box>
              )}
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
    </Flex>
  );
}

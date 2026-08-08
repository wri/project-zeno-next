"use client";

import { Flex, IconButton, Menu, Portal, Text } from "@chakra-ui/react";
import {
  ChartLineIcon,
  DotsThreeVerticalIcon,
  FloppyDiskIcon,
  SparkleIcon,
  SquaresFourIcon,
  XIcon,
} from "@phosphor-icons/react";

import { useAoiActions } from "./useAoiActions";

const ITEM_ICON_COLOR = "var(--chakra-colors-primary-solid)";

/**
 * The selected area's chip and its actions menu — the map-side entry point of
 * PZB-1119, sibling to the in-chat nudges.
 *
 * Presentation only: every action comes from `useAoiActions`, which delegates
 * in turn to behaviour that already exists (the analyse CTA, the direct-
 * analysis hook, the dashboards create hook, the custom-areas mutation).
 *
 * Items whose preconditions aren't met are hidden rather than disabled — the
 * same choice `AddToDashboardToggle` makes. A greyed-out row the user can't
 * explain is worse than a shorter menu.
 */
export default function AoiChipMenu() {
  const actions = useAoiActions();
  if (!actions) return null;

  const { areaName } = actions;

  return (
    <Flex
      align="center"
      gap={1}
      bg="primary.solid"
      color="white"
      rounded="md"
      pl={3}
      pr={1}
      py={1}
      boxShadow="0 1px 4px rgba(0,0,0,0.24)"
      pointerEvents="all"
      maxW="100%"
    >
      <Text fontSize="xs" fontWeight="medium" truncate>
        {areaName}
      </Text>
      <IconButton
        aria-label={`Remove ${areaName} from map`}
        size="2xs"
        variant="ghost"
        color="white"
        _hover={{ bg: "whiteAlpha.300" }}
        onClick={actions.removeFromMap}
      >
        <XIcon size={12} weight="bold" />
      </IconButton>
      <Menu.Root positioning={{ strategy: "fixed", hideWhenDetached: true }}>
        <Menu.Trigger asChild>
          <IconButton
            aria-label={`Actions for ${areaName}`}
            size="2xs"
            variant="ghost"
            color="white"
            _hover={{ bg: "whiteAlpha.300" }}
          >
            <DotsThreeVerticalIcon size={14} weight="bold" />
          </IconButton>
        </Menu.Trigger>
        <Portal>
          <Menu.Positioner>
            <Menu.Content minW="14rem">
              {actions.hasDataset && (
                <Menu.ItemGroup>
                  <Menu.ItemGroupLabel fontSize="2xs" color="fg.muted">
                    ANALYSIS
                  </Menu.ItemGroupLabel>
                  <Menu.Item
                    value="generate insights"
                    onSelect={actions.generateInsights}
                  >
                    <SparkleIcon size={16} color={ITEM_ICON_COLOR} />
                    Generate Insights
                  </Menu.Item>
                  <Menu.Item
                    value="view analysis"
                    onSelect={actions.viewAnalysis}
                  >
                    <ChartLineIcon size={16} color={ITEM_ICON_COLOR} />
                    View Analysis
                  </Menu.Item>
                </Menu.ItemGroup>
              )}
              <Menu.ItemGroup>
                <Menu.ItemGroupLabel fontSize="2xs" color="fg.muted">
                  MANAGE
                </Menu.ItemGroupLabel>
                {actions.canUseDashboard && (
                  <Menu.Item
                    value="create dashboard"
                    disabled={actions.isCreatingDashboard}
                    onSelect={actions.openOrCreateDashboard}
                  >
                    <SquaresFourIcon size={16} color={ITEM_ICON_COLOR} />
                    {actions.dashboardLabel}
                  </Menu.Item>
                )}
                {actions.canSaveArea && (
                  <Menu.Item
                    value="save area"
                    disabled={actions.isSavingArea}
                    onSelect={() => void actions.saveArea()}
                  >
                    <FloppyDiskIcon size={16} color={ITEM_ICON_COLOR} />
                    Save Area
                  </Menu.Item>
                )}
                <Menu.Item
                  value="remove from map"
                  onSelect={actions.removeFromMap}
                >
                  <XIcon size={16} />
                  Remove from map
                </Menu.Item>
              </Menu.ItemGroup>
            </Menu.Content>
          </Menu.Positioner>
        </Portal>
      </Menu.Root>
    </Flex>
  );
}

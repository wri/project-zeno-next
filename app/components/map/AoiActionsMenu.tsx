"use client";

import { IconButton, Menu, Portal } from "@chakra-ui/react";
import {
  ChartLineIcon,
  DotsThreeVerticalIcon,
  FloppyDiskIcon,
  SparkleIcon,
  SquaresFourIcon,
  XIcon,
} from "@phosphor-icons/react";

import { useAoiActions, type AoiActionsTarget } from "./useAoiActions";
import {
  AOI_LABEL_BG,
  AOI_LABEL_BG_HOVER,
  AOI_LABEL_HEIGHT,
  AOI_LABEL_RADIUS,
} from "./aoiLabelStyle";

const ITEM_ICON_COLOR = "var(--chakra-colors-primary-solid)";

/**
 * The actions menu on an area's map label — the map-side entry point of
 * PZB-1119, sibling to the in-chat nudges.
 *
 * Renders only the kebab and its menu: the label itself (name, icon, close) is
 * the existing bbox-anchored `Tag` in `GeoJsonLayers`, which already sits on
 * the area and already knows how to remove it. Presentation only — every
 * action comes from `useAoiActions`, which delegates in turn to behaviour that
 * already exists (the analyse CTA, the direct-analysis hook, the dashboards
 * create hook, the custom-areas mutation).
 *
 * Items whose preconditions aren't met are hidden rather than disabled, the
 * same choice `AddToDashboardToggle` makes. A greyed-out row the user can't
 * explain is worse than a shorter menu.
 */
export default function AoiActionsMenu({
  target,
}: {
  target: AoiActionsTarget;
}) {
  const actions = useAoiActions(target);
  if (!actions) return null;

  return (
    <Menu.Root positioning={{ strategy: "fixed", hideWhenDetached: true }}>
      <Menu.Trigger asChild>
        <IconButton
          aria-label={`Actions for ${actions.areaName}`}
          // Its own chip beside the name label, matching it on height, radius
          // and colour. Square, so the width follows the shared height.
          bg={AOI_LABEL_BG}
          color="white"
          boxSize={AOI_LABEL_HEIGHT}
          minW={AOI_LABEL_HEIGHT}
          rounded={AOI_LABEL_RADIUS}
          p="0"
          flexShrink={0}
          _hover={{ bg: AOI_LABEL_BG_HOVER }}
          onClick={(e) => e.stopPropagation()}
        >
          <DotsThreeVerticalIcon size={16} weight="bold" />
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
  );
}

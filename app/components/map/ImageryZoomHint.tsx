"use client";
import { useCallback, useState } from "react";
import { Button, Flex, Text, useBreakpointValue } from "@chakra-ui/react";
import { MagnifyingGlassPlusIcon } from "@phosphor-icons/react";
import useMapStore from "@/app/store/mapStore";
import useSidebarStore from "@/app/store/sidebarStore";
import { useMapWidth } from "@/app/hooks/useMapWidth";
import { useMapZoom } from "@/app/hooks/useMapZoom";
import {
  EXPLORATION_PANEL_GAP_PX,
  getMapControlsLeftPx,
} from "@/app/explorationLayout";
import { imageryZoomTarget } from "@/app/utils/imagery";

/** The legend column's footprint from the map's right edge (Map.tsx: 420px wide, right={3}). */
const LEGEND_COLUMN_FROM_RIGHT_PX = 420 + 12;

/**
 * Map overlay shown while visible satellite imagery is below its minimum zoom
 * (Planet only renders from zoom 10). Without it the agent says the imagery
 * is on the map while the map looks unchanged. "Zoom in" flies to the
 * imagery's floor over the middle of its AOI; the pill goes once it renders.
 *
 * Mounted in the legend column, just above the legend. On desktop it moves out
 * into the gap between the chat panel and the legend when the pill fits there;
 * an open catalog column can narrow that gap to a few pixels, and on mobile
 * there is no gap at all.
 */
export function ImageryZoomHint() {
  const mapRef = useMapStore((s) => s.mapRef);
  const layers = useMapStore((s) => s.layers);
  const target = imageryZoomTarget(layers, useMapZoom());
  const mapWidthPx = useMapWidth();
  const { isChatFullSize, dataCatalogOpen, areasPanelOpen, insightsPanelOpen } =
    useSidebarStore();
  // The pill doesn't wrap, so its width is fixed once rendered.
  const [pillWidthPx, setPillWidthPx] = useState(0);
  const measurePill = useCallback((node: HTMLDivElement | null) => {
    if (node) setPillWidthPx(node.offsetWidth);
  }, []);
  // On desktop the chat panel (and any catalog column) floats over the map's
  // left edge, so the canvas centre sits left of the map the user can see.
  // Mobile's chat is a bottom sheet, leaving the full width visible.
  const isDesktop = useBreakpointValue({ base: false, md: true });
  const coveredLeftPx = isDesktop
    ? getMapControlsLeftPx(
        isChatFullSize,
        dataCatalogOpen || areasPanelOpen || insightsPanelOpen
      )
    : 0;

  if (target === undefined) return null;

  const gapPx =
    (mapWidthPx ?? 0) -
    LEGEND_COLUMN_FROM_RIGHT_PX -
    (coveredLeftPx - EXPLORATION_PANEL_GAP_PX);
  const besideLegend =
    isDesktop && gapPx >= pillWidthPx + 2 * EXPLORATION_PANEL_GAP_PX;

  return (
    <Flex
      // Beside the legend: spans the gap from the chat panel's right edge to
      // the legend column's left edge, so the pill centres between the two,
      // bottom-aligned with the legend. Otherwise it stacks above the legend.
      {...(besideLegend && {
        position: "absolute",
        bottom: 0,
        right: "100%",
        w: `${gapPx}px`,
      })}
      flexShrink={0}
      justifyContent="center"
      pointerEvents="none"
    >
      <Flex
        ref={measurePill}
        flexShrink={0}
        alignItems="center"
        gap={2}
        pl={3}
        pr={1}
        py={1}
        bg="bg"
        rounded="full"
        boxShadow="md"
        whiteSpace="nowrap"
        pointerEvents="all"
        role="status"
      >
        <MagnifyingGlassPlusIcon size={16} />
        <Text fontSize="sm">Zoom in to see the satellite imagery</Text>
        <Button
          size="xs"
          rounded="full"
          colorPalette="primary"
          // offset (not padding, which would persist on the map) lands the
          // AOI centre in the middle of the uncovered map.
          onClick={() =>
            mapRef
              ?.getMap()
              .flyTo({ ...target, offset: [coveredLeftPx / 2, 0] })
          }
        >
          Zoom in
        </Button>
      </Flex>
    </Flex>
  );
}

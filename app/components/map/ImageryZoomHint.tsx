"use client";
import { Button, Flex, Text, useBreakpointValue } from "@chakra-ui/react";
import { MagnifyingGlassPlusIcon } from "@phosphor-icons/react";
import useMapStore from "@/app/store/mapStore";
import useSidebarStore from "@/app/store/sidebarStore";
import { useMapZoom } from "@/app/hooks/useMapZoom";
import {
  EXPLORATION_PANEL_GAP_PX,
  getMapControlsLeftPx,
} from "@/app/explorationLayout";
import { imageryZoomTarget } from "@/app/utils/imagery";

/**
 * Map overlay shown while visible satellite imagery is below its minimum zoom
 * (Planet only renders from zoom 10). Without it the agent says the imagery
 * is on the map while the map looks unchanged. "Zoom in" flies to the
 * imagery's floor over the middle of its AOI; the pill goes once it renders.
 */
export function ImageryZoomHint() {
  const mapRef = useMapStore((s) => s.mapRef);
  const layers = useMapStore((s) => s.layers);
  const target = imageryZoomTarget(layers, useMapZoom());
  const { isChatFullSize, dataCatalogOpen, areasPanelOpen, insightsPanelOpen } =
    useSidebarStore();
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

  return (
    // Spans the gap between the chat panel's right edge and the legend
    // column's left edge (Map.tsx: 420px wide, right={3}), so the pill centres
    // between the two, bottom-aligned with the legend (bottom={7}).
    <Flex
      position="absolute"
      bottom={{ base: "6rem", md: 7 }}
      left={{
        base: 3,
        md: `${coveredLeftPx - EXPLORATION_PANEL_GAP_PX}px`,
      }}
      right={{ base: 3, md: "calc(420px + 0.75rem)" }}
      justifyContent="center"
      zIndex={400}
      pointerEvents="none"
    >
      <Flex
        alignItems="center"
        gap={2}
        pl={3}
        pr={1}
        py={1}
        bg="bg"
        rounded="full"
        boxShadow="md"
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

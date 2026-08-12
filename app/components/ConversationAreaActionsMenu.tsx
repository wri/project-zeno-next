"use client";

import { useMemo } from "react";
import { IconButton, Menu, Portal } from "@chakra-ui/react";
import {
  DotsThreeVerticalIcon,
  FloppyDiskIcon,
  XIcon,
} from "@phosphor-icons/react";
import { useShallow } from "zustand/react/shallow";
import type { Polygon } from "geojson";

import { toaster } from "@/app/components/ui/toaster";
import { useCustomAreasCreate } from "@/app/hooks/useCustomAreasCreate";
import type { GeoJsonEntry, Layer } from "@/app/store/layerManagerSlice";
import useMapStore from "@/app/store/mapStore";
import { toPolygons } from "@/app/utils/selectionPolygons";

/** Matches the Areas panel accent used by the sibling card actions. */
const AREA_LABEL_COLOR = "#2D6BE4";

/** Compact 16px icon styling shared with the card's other title actions. */
const compactIconProps = {
  variant: "ghost" as const,
  color: AREA_LABEL_COLOR,
  boxSize: "16px",
  minW: "16px",
  maxW: "16px",
  minH: "16px",
  maxH: "16px",
  p: 0,
  css: {
    "& svg": {
      width: "16px",
      height: "16px",
    },
  },
};

/** Resolve all Polygon geometries backing an area layer from the registry. */
function collectPolygons(layer: Layer, registry: GeoJsonEntry[]): Polygon[] {
  const polygons: Polygon[] = [];
  for (const ref of layer.featureRefs ?? []) {
    const entry = registry.find(
      (e) => e.ref.name === ref.name && e.ref.source === ref.source
    );
    if (entry) polygons.push(...toPolygons(entry.data));
  }
  return polygons;
}

/**
 * Kebab (⋮) menu for an "in this conversation" area card: save the area to the
 * user's monitored (custom) areas, and remove it from the conversation.
 *
 * "Save area" mirrors the on-map AOI menu (`useAoiActions.saveArea`) — it
 * POSTs the layer's resolved Polygon geometry as a new custom area (see
 * `useCustomAreasCreate`). It only appears when the layer has resolvable
 * polygons in the geojson registry (e.g. not the global "all countries"
 * vector-tile layer) and, matching `useAoiActions.canSaveArea`, never for a
 * `custom`-sourced selection — those are already saved.
 */
export default function ConversationAreaActionsMenu({
  layer,
  onRemove,
}: {
  layer: Layer;
  onRemove: () => void;
}) {
  const registry = useMapStore(useShallow((s) => s.geoJsonRegistry));
  const { createArea, isCreating } = useCustomAreasCreate();

  const name = layer.aoiSelection?.name ?? layer.name;
  const polygons = useMemo(
    () => collectPolygons(layer, registry),
    [layer, registry]
  );
  // A custom-sourced selection is already a saved area (drawn, uploaded, or a
  // monitored area toggled onto the map) — offering Save would duplicate it.
  const alreadySaved = (layer.featureRefs ?? []).some(
    (ref) => ref.source.toLowerCase() === "custom"
  );
  const canSave = !alreadySaved && polygons.length > 0;

  const handleSave = () => {
    if (!canSave || isCreating) return;
    // Errors are surfaced by useCustomAreasCreate's shared error handler; the
    // hook also invalidates ["customAreas"] so the Monitored tab picks it up.
    createArea(
      { name, geometries: polygons },
      {
        onSuccess: () =>
          toaster.create({
            title: "Area saved",
            description: `“${name}” was added to your monitored areas.`,
            type: "success",
            duration: 4000,
          }),
      }
    );
  };

  return (
    <Menu.Root positioning={{ placement: "bottom-end" }}>
      <Menu.Trigger asChild>
        <IconButton
          aria-label={`Actions for ${name}`}
          {...compactIconProps}
          onClick={(e) => e.stopPropagation()}
        >
          <DotsThreeVerticalIcon size={16} color={AREA_LABEL_COLOR} />
        </IconButton>
      </Menu.Trigger>
      <Portal>
        <Menu.Positioner>
          <Menu.Content>
            {canSave && (
              <Menu.Item value="save" color="fg.muted" onSelect={handleSave}>
                <FloppyDiskIcon />
                Save area
              </Menu.Item>
            )}
            <Menu.Item value="remove" color="fg.muted" onSelect={onRemove}>
              <XIcon />
              Remove from conversation
            </Menu.Item>
          </Menu.Content>
        </Menu.Positioner>
      </Portal>
    </Menu.Root>
  );
}

"use client";

import { Menu } from "@chakra-ui/react";
import { FloppyDiskIcon, XIcon } from "@phosphor-icons/react";
import type { Polygon } from "geojson";

import { toaster } from "@/app/components/ui/toaster";
import { useCustomAreasCreate } from "@/app/hooks/useCustomAreasCreate";
import {
  findRegistryEntry,
  type GeoJsonEntry,
  type Layer,
} from "@/app/store/layerManagerSlice";
import useMapStore from "@/app/store/mapStore";
import { toPolygons } from "@/app/utils/selectionPolygons";

import { AreaCardMenu } from "./AreaCardMenu";

/** Resolve all Polygon geometries backing an area layer from the registry. */
function collectPolygons(layer: Layer, registry: GeoJsonEntry[]): Polygon[] {
  return (layer.featureRefs ?? []).flatMap((ref) => {
    const entry = findRegistryEntry(registry, ref);
    return entry ? toPolygons(entry.data) : [];
  });
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
}: {
  layer: Layer;
}) {
  const { createArea, isCreating } = useCustomAreasCreate();

  const name = layer.aoiSelection?.name ?? layer.name;
  // A custom-sourced selection is already a saved area (drawn, uploaded, or a
  // monitored area toggled onto the map) — offering Save would duplicate it.
  const alreadySaved = (layer.featureRefs ?? []).some(
    (ref) => ref.source.toLowerCase() === "custom"
  );
  const canSave = useMapStore(
    (s) => !alreadySaved && collectPolygons(layer, s.geoJsonRegistry).length > 0
  );

  const handleSave = () => {
    if (isCreating) return;
    const polygons = collectPolygons(
      layer,
      useMapStore.getState().geoJsonRegistry
    );
    if (polygons.length === 0) return;
    // Errors are surfaced by useCustomAreasCreate's shared error handler; the
    // hook also invalidates ["customAreas"] so the Monitored tab picks it up.
    createArea(
      { name, geometries: polygons },
      {
        onSuccess: () =>
          toaster.create({
            title: "Area saved",
            description: `"${name}" is now in your areas.`,
            type: "success",
            duration: 3000,
          }),
      }
    );
  };

  const handleRemove = () => {
    const { removeLayer, removeFromRegistry } = useMapStore.getState();
    (layer.featureRefs ?? []).forEach((ref) => removeFromRegistry(ref));
    removeLayer(layer.id);
  };

  return (
    <AreaCardMenu label={`Actions for ${name}`}>
      {canSave && (
        <Menu.Item value="save" color="fg.muted" onSelect={handleSave}>
          <FloppyDiskIcon />
          Save area
        </Menu.Item>
      )}
      <Menu.Item value="remove" color="fg.muted" onSelect={handleRemove}>
        <XIcon />
        Remove from conversation
      </Menu.Item>
    </AreaCardMenu>
  );
}

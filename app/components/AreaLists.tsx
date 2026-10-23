import { useMemo, type ReactNode } from "react";
import { Flex, IconButton } from "@chakra-ui/react";
import { CrosshairIcon } from "@phosphor-icons/react";
import { useShallow } from "zustand/react/shallow";

import { useCustomAreasListSuspense } from "@/app/hooks/useCustomAreasList";
import type { CustomArea } from "@/app/schemas/api/custom_areas/get";
import {
  findRegistryEntry,
  isAreaLayer,
  type Layer,
  type GeoJsonEntry,
} from "@/app/store/layerManagerSlice";
import useMapStore from "@/app/store/mapStore";
import type { AOISelection } from "@/app/types/chat";
import { areaSourceLabel } from "@/app/utils/areaSourceLabel";
import { aoiFlyBounds } from "@/app/utils/bboxUtils";
import { customAreaToFeature } from "@/src/entities/custom-area";
import { ENTITY_KINDS, EntityCard } from "@/src/shared/ui/entity-card";

import { areaActionIconProps } from "./AreaCardMenu";
import { AreaThumbnail } from "./AreaThumbnail";
import ConversationAreaActionsMenu from "./ConversationAreaActionsMenu";
import CustomAreaActionsMenu from "./CustomAreaActionsMenu";
import { PanelEmpty, PanelList } from "./PanelList";
import { Tooltip } from "./ui/tooltip";

/**
 * The Areas panel's own lists and rows: areas on the map ("In this
 * conversation") and saved custom areas ("My areas"). The panel's search
 * results reuse the rows, so a match behaves as it does in its tab.
 */

/** Display name for an area layer. */
function getAreaTitle(layer: Layer): string {
  return layer.aoiSelection?.name ?? layer.name;
}

/**
 * Resolve an area layer to an AOISelection for the thumbnail. Uses the layer's
 * own aoiSelection when present (admin / assistant areas); otherwise rebuilds
 * one from its geojson registry entries (custom drawn / uploaded areas).
 */
function layerToAoiSelection(
  layer: Layer,
  registry: GeoJsonEntry[]
): AOISelection | null {
  if (layer.aoiSelection) return layer.aoiSelection;
  const refs = layer.featureRefs ?? [];
  if (refs.length === 0) return null;
  return {
    name: layer.name,
    aois: refs.map((ref) => {
      const entry = findRegistryEntry(registry, ref);
      return {
        name: ref.name,
        src_id: entry?.srcId ?? ref.name,
        source: ref.source,
        subtype: entry?.subtype ?? "",
      };
    }),
  };
}

export function ConversationAreasList() {
  const areaLayers = useMapStore(
    useShallow((s) => s.layers.filter(isAreaLayer))
  );

  if (areaLayers.length === 0) {
    return (
      <PanelEmpty>
        No areas selected yet. Pick one from Boundaries, upload or draw an area,
        or ask the assistant to find one for you.
      </PanelEmpty>
    );
  }

  return (
    <PanelList>
      {areaLayers.map((layer) => (
        <ConversationAreaCard key={layer.id} layer={layer} />
      ))}
    </PanelList>
  );
}

function ConversationAreaCard({ layer }: { layer: Layer }) {
  const setLayerVisibility = useMapStore((s) => s.setLayerVisibility);
  const flyToGeoJson = useMapStore((s) => s.flyToGeoJson);
  const flyToBounds = useMapStore((s) => s.flyToBounds);
  const geoJsonRegistry = useMapStore((s) => s.geoJsonRegistry);

  const isVisible = layer.visible;
  // The resolved selection recovers `source` from the registry ref; reading
  // `layer.aoiSelection` directly would label every hand-clicked GADM boundary
  // (which carries none) as a custom area.
  const aoiSelection = useMemo(
    () => layerToAoiSelection(layer, geoJsonRegistry),
    [layer, geoJsonRegistry]
  );
  const title = getAreaTitle(layer);

  function handleToggle(checked: boolean) {
    setLayerVisibility(layer.id, checked);
  }

  function handleLocate() {
    const bounds = aoiFlyBounds(layer.aoiSelection?.aois.slice(0, 1) ?? []);
    if (bounds) {
      flyToBounds(bounds);
      return;
    }
    // Fallback: fly to the first resolvable registry geometry.
    for (const ref of layer.featureRefs ?? []) {
      const entry = findRegistryEntry(geoJsonRegistry, ref);
      if (entry) {
        flyToGeoJson(entry.data);
        return;
      }
    }
    if (layer.aoiSelection?.aois[0]?.geometry) {
      flyToGeoJson(layer.aoiSelection.aois[0].geometry);
    }
  }

  return (
    <EntityCard
      kind="area"
      thumbnail={
        aoiSelection && (
          <AreaThumbnail aoiSelection={aoiSelection} alt={title} />
        )
      }
      title={title}
      meta={areaSourceLabel(aoiSelection?.aois[0]?.source ?? "custom")}
      interaction={{
        mode: "toggle",
        checked: isVisible,
        onChange: handleToggle,
        dataPanel: "areas",
      }}
      actions={
        <AreaCardActions
          onLocate={handleLocate}
          menu={<ConversationAreaActionsMenu layer={layer} />}
        />
      }
    />
  );
}

export function MonitoredAreasList() {
  const { customAreas } = useCustomAreasListSuspense();

  const sorted = useMemo(() => {
    return [...customAreas].sort(
      (a, b) => Number(new Date(b.created_at)) - Number(new Date(a.created_at))
    );
  }, [customAreas]);

  if (sorted.length === 0) {
    return (
      <PanelEmpty>
        No saved areas yet. Upload or draw an area to save it here.
      </PanelEmpty>
    );
  }

  return (
    <PanelList>
      {sorted.map((area) => (
        <MonitoredAreaCard key={area.id} area={area} />
      ))}
    </PanelList>
  );
}

export function MonitoredAreaCard({ area }: { area: CustomArea }) {
  const addToRegistry = useMapStore((s) => s.addToRegistry);
  const addLayer = useMapStore((s) => s.addLayer);
  const removeLayer = useMapStore((s) => s.removeLayer);
  const removeFromRegistry = useMapStore((s) => s.removeFromRegistry);
  const setLayerVisibility = useMapStore((s) => s.setLayerVisibility);
  const flyToGeoJsonWithRetry = useMapStore((s) => s.flyToGeoJsonWithRetry);
  const layer = useMapStore(
    useShallow((s) => s.layers.find((l) => l.id === area.id))
  );

  const isVisible = layer?.visible ?? false;

  const feature = useMemo(() => customAreaToFeature(area), [area]);
  const aoiSelection = useMemo(
    (): AOISelection => ({
      name: area.name,
      aois: [
        {
          name: area.name,
          src_id: area.id,
          source: "custom",
          subtype: "custom-area",
        },
      ],
    }),
    [area]
  );

  function handleToggle(checked: boolean) {
    if (checked) {
      if (!layer) {
        // Register geometry and add a visible area layer — the layer IS the
        // scope, so there is no separate context item.
        addToRegistry({
          ref: { name: area.name, source: "custom" },
          data: feature,
          srcId: area.id,
          subtype: "custom-area",
        });
        addLayer({
          id: area.id,
          name: area.name,
          type: "geojson",
          visible: true,
          featureRefs: [{ name: area.name, source: "custom" }],
        });
        flyToGeoJsonWithRetry(feature);
        return;
      }
      // Already added but hidden — just re-show it.
      if (!layer.visible) {
        setLayerVisibility(area.id, true);
      }
      return;
    }
    // Toggle OFF on a monitored card removes it from the map entirely.
    // (Visibility-only hiding is available from the "In this conversation" tab.)
    if (layer) {
      removeFromRegistry({ name: area.name, source: "custom" });
      removeLayer(area.id);
    }
  }

  function handleLocate() {
    flyToGeoJsonWithRetry(feature);
  }

  return (
    <EntityCard
      kind="area"
      thumbnail={
        <AreaThumbnail
          aoiSelection={aoiSelection}
          alt={area.name}
          geometry={feature}
        />
      }
      title={area.name}
      meta={areaSourceLabel("custom")}
      interaction={{
        mode: "toggle",
        checked: isVisible,
        onChange: handleToggle,
        dataPanel: "areas",
      }}
      actions={
        // Rename/delete act on the saved area, so the kebab must show even
        // when the area isn't on the map; the locate button stays on-map only.
        <AreaCardActions
          onLocate={isVisible ? handleLocate : undefined}
          menu={<CustomAreaActionsMenu area={area} />}
        />
      }
    />
  );
}

function AreaCardActions({
  onLocate,
  menu,
}: {
  /** Omit to hide the locate button (e.g. when the area isn't on the map). */
  onLocate?: () => void;
  /** Kebab actions node for the card (per-tab: conversation vs. monitored). */
  menu: ReactNode;
}) {
  return (
    <Flex align="center" gap="16px" flexShrink={0} h="16px">
      {onLocate && (
        <Tooltip
          content="Center on map"
          positioning={{ placement: "top" }}
          showArrow
          variant="dark"
        >
          <IconButton
            aria-label="Center on map"
            {...areaActionIconProps}
            onClick={(e) => {
              e.stopPropagation();
              onLocate();
            }}
          >
            <CrosshairIcon size={16} color={ENTITY_KINDS.area.color} />
          </IconButton>
        </Tooltip>
      )}
      {menu}
    </Flex>
  );
}

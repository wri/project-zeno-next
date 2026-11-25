import { useMemo, useState, type ReactNode } from "react";
import { Flex, IconButton } from "@chakra-ui/react";
import { CrosshairIcon } from "@phosphor-icons/react";
import { useShallow } from "zustand/react/shallow";

import { toaster } from "@/app/components/ui/toaster";
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
import {
  addUserAoiToMap,
  findUserAoiLayer,
  removeUserAoiFromMap,
} from "@/app/utils/userAoiMap";
import { placeMeta } from "@/src/entities/aoi";
import {
  userAoiToAoi,
  useUserAoisSuspense,
  type UserAoi,
} from "@/src/entities/user-aoi";
import { ENTITY_KINDS, EntityCard } from "@/src/shared/ui/entity-card";

import { areaActionIconProps } from "./AreaCardMenu";
import { AreaThumbnail } from "./AreaThumbnail";
import ConversationAreaActionsMenu from "./ConversationAreaActionsMenu";
import UserAoiActionsMenu from "./UserAoiActionsMenu";
import { UserAoiThumbnail } from "./UserAoiThumbnail";
import { PanelEmpty, PanelList } from "./PanelList";
import { Tooltip } from "./ui/tooltip";

/**
 * The Areas panel's own lists and rows: areas on the map ("In this
 * conversation") and the user's areas ("My areas"). The panel's search
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
  const { data: userAois } = useUserAoisSuspense();

  if (userAois.length === 0) {
    return (
      <PanelEmpty>
        No saved areas yet. Upload or draw an area, or save one from the map, to
        keep it here.
      </PanelEmpty>
    );
  }

  return (
    <PanelList>
      {userAois.map((userAoi) => (
        <MonitoredAreaCard key={userAoi.id} userAoi={userAoi} />
      ))}
    </PanelList>
  );
}

export function MonitoredAreaCard({ userAoi }: { userAoi: UserAoi }) {
  const setLayerVisibility = useMapStore((s) => s.setLayerVisibility);
  const flyToBounds = useMapStore((s) => s.flyToBounds);
  const layer = useMapStore((s) => findUserAoiLayer(s.layers, userAoi));
  const [adding, setAdding] = useState(false);

  // A layer hidden from "In this conversation" shows as off here; turning it
  // on shows it again rather than adding a second copy.
  const isVisible = !!layer?.visible;
  const aoi = useMemo(() => userAoiToAoi(userAoi), [userAoi]);

  async function handleToggle(checked: boolean) {
    if (!checked) {
      if (layer) removeUserAoiFromMap(layer, userAoi);
      return;
    }
    if (layer) {
      setLayerVisibility(layer.id, true);
      return;
    }
    setAdding(true);
    try {
      await addUserAoiToMap(userAoi);
    } catch (error) {
      console.error(`Failed to add "${userAoi.name}" to the map:`, error);
      toaster.create({
        type: "error",
        title: "Couldn't add this area",
        description: `"${userAoi.name}" couldn't be loaded. Please try again.`,
      });
    } finally {
      setAdding(false);
    }
  }

  function handleLocate() {
    const bounds = aoiFlyBounds([aoi]);
    if (bounds) {
      flyToBounds(bounds);
      return;
    }
    // Without a bbox, fly to the geometry the layer put on the map.
    const { geoJsonRegistry, flyToGeoJson } = useMapStore.getState();
    for (const ref of layer?.featureRefs ?? []) {
      const entry = findRegistryEntry(geoJsonRegistry, ref);
      if (entry) {
        flyToGeoJson(entry.data);
        return;
      }
    }
  }

  return (
    <EntityCard
      kind="area"
      thumbnail={<UserAoiThumbnail userAoi={userAoi} />}
      title={userAoi.name}
      meta={placeMeta(aoi)}
      interaction={{
        mode: "toggle",
        checked: isVisible || adding,
        onChange: (checked) => void handleToggle(checked),
        status: adding ? "Adding…" : undefined,
        disabled: adding,
        dataPanel: "areas",
      }}
      actions={
        // Rename/delete act on the user AOI, so the kebab must show even
        // when the area isn't on the map; the locate button stays on-map only.
        <AreaCardActions
          onLocate={isVisible ? handleLocate : undefined}
          menu={<UserAoiActionsMenu userAoi={userAoi} />}
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

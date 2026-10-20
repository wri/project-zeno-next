import { Flex, Image } from "@chakra-ui/react";
import { PolygonIcon } from "@phosphor-icons/react";
import { useMemo, useState } from "react";
import type { Feature, FeatureCollection, Geometry } from "geojson";

import useMapStore from "@/app/store/mapStore";
import type { AOISelection } from "@/app/types/chat";
import { buildStaticMapUrl } from "@/app/utils/areaStaticMapUrl";
import {
  ENTITY_CARD_THUMBNAIL_PX,
  ENTITY_KINDS,
} from "@/src/shared/ui/entity-card";

interface AreaThumbnailProps {
  aoiSelection: AOISelection;
  alt: string;
  /** Side of the slot it fills, in CSS px; sizes the static-map request. Defaults to a card's. */
  size?: number;
  /** When geometry isn't in the map registry yet (e.g. monitored custom areas). */
  geometry?: FeatureCollection | Feature | Geometry | null;
}

function resolveGeometry(
  aoiSelection: AOISelection,
  geoJsonRegistry: ReturnType<typeof useMapStore.getState>["geoJsonRegistry"],
  geometryOverride?: FeatureCollection | Feature | Geometry | null
): FeatureCollection | Feature | Geometry | null {
  if (geometryOverride) return geometryOverride;

  const registryEntry = aoiSelection.aois
    .map((aoi) =>
      geoJsonRegistry.find(
        (e) =>
          (e.ref.name === aoi.name && e.ref.source === aoi.source) ||
          (!!aoi.src_id && e.srcId === aoi.src_id)
      )
    )
    .find(Boolean);

  return registryEntry?.data ?? aoiSelection.aois[0]?.geometry ?? null;
}

function AreaThumbnailFallback() {
  return (
    <Flex
      w="100%"
      h="100%"
      bg={ENTITY_KINDS.area.tint}
      alignItems="center"
      justifyContent="center"
    >
      <PolygonIcon size={32} color={ENTITY_KINDS.area.color} />
    </Flex>
  );
}

/** Static map thumbnail for area cards and the picker — same source as chat `AreaCard`. */
export function AreaThumbnail({
  aoiSelection,
  alt,
  size = ENTITY_CARD_THUMBNAIL_PX,
  geometry: geometryOverride,
}: AreaThumbnailProps) {
  const geoJsonRegistry = useMapStore((s) => s.geoJsonRegistry);
  const [imgError, setImgError] = useState(false);

  const geometry = useMemo(
    () => resolveGeometry(aoiSelection, geoJsonRegistry, geometryOverride),
    [aoiSelection, geoJsonRegistry, geometryOverride]
  );

  const staticMapUrl = useMemo(
    () => buildStaticMapUrl(aoiSelection, geometry, size),
    [aoiSelection, geometry, size]
  );

  if (!staticMapUrl || imgError) {
    return <AreaThumbnailFallback />;
  }

  return (
    <Image
      src={staticMapUrl}
      alt={alt}
      w="100%"
      h="100%"
      objectFit="cover"
      onError={() => setImgError(true)}
    />
  );
}

"use client";

import { Flex, Image } from "@chakra-ui/react";
import { PolygonIcon } from "@phosphor-icons/react";
import { useMemo, useState } from "react";
import type { Feature, FeatureCollection, Geometry } from "geojson";

import useMapStore from "@/app/store/mapStore";
import type { AOISelection } from "@/app/types/chat";
import { buildStaticMapUrl } from "@/app/utils/areaStaticMapUrl";

const AREA_LABEL_COLOR = "#2D6BE4";
/** Matches the catalog card thumbnail column width. */
const THUMBNAIL_SIZE_PX = 96;

interface AreaCatalogThumbnailProps {
  aoiSelection: AOISelection;
  alt: string;
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
      bg="rgba(45, 107, 228, 0.08)"
      alignItems="center"
      justifyContent="center"
    >
      <PolygonIcon size={32} color={AREA_LABEL_COLOR} />
    </Flex>
  );
}

/** Static map thumbnail for area catalog cards — same source as chat `AreaCard`. */
export function AreaCatalogThumbnail({
  aoiSelection,
  alt,
  geometry: geometryOverride,
}: AreaCatalogThumbnailProps) {
  const geoJsonRegistry = useMapStore((s) => s.geoJsonRegistry);
  const [imgError, setImgError] = useState(false);

  const geometry = useMemo(
    () => resolveGeometry(aoiSelection, geoJsonRegistry, geometryOverride),
    [aoiSelection, geoJsonRegistry, geometryOverride]
  );

  const staticMapUrl = useMemo(
    () => buildStaticMapUrl(aoiSelection, geometry, THUMBNAIL_SIZE_PX),
    [aoiSelection, geometry]
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

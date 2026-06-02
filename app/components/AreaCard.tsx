"use client";
import { Box, Image } from "@chakra-ui/react";
import { CrosshairIcon, PolygonIcon } from "@phosphor-icons/react";
import { AOISelection } from "@/app/types/chat";
import { Tooltip } from "./ui/tooltip";
import { InfoCard } from "./InfoCard";
import useMapStore from "@/app/store/mapStore";
import { unionAoiBboxes } from "@/app/utils/bboxUtils";
import { FeatureCollection, Feature, Geometry } from "geojson";
import { useState } from "react";

const MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN;
// Same light style the app uses for its basemap
const STATIC_STYLE = "devseed/cmazl5ws500bz01scaa27dqi4";
// Max safe URL length for Mapbox Static API
const MAX_URL_LENGTH = 8192;

/**
 * Round all coordinates in a geometry to `precision` decimal places.
 */
function reduceCoordPrecision(geom: Geometry, precision: number): Geometry {
  const round = (n: number) => parseFloat(n.toFixed(precision));
  const roundRing = (ring: number[][]): number[][] =>
    ring.map((c) => c.map(round));
  const roundPolygon = (coords: number[][][]): number[][][] =>
    coords.map(roundRing);

  switch (geom.type) {
    case "Polygon":
      return { ...geom, coordinates: roundPolygon(geom.coordinates) };
    case "MultiPolygon":
      return { ...geom, coordinates: geom.coordinates.map(roundPolygon) };
    default:
      return geom;
  }
}

/**
 * Subsample a ring to at most `maxPoints` evenly-spaced vertices,
 * always preserving the closing point.
 */
function decimateRing(ring: number[][], maxPoints: number): number[][] {
  if (ring.length <= maxPoints) return ring;
  const step = (ring.length - 1) / (maxPoints - 1);
  const result: number[][] = [];
  for (let i = 0; i < maxPoints - 1; i++) {
    result.push(ring[Math.round(i * step)]);
  }
  result.push(ring[ring.length - 1]);
  return result;
}

/**
 * Reduce geometry to a single exterior ring suitable for a small thumbnail:
 * - MultiPolygon → largest sub-polygon only
 * - Only the exterior ring (holes removed)
 * - Decimated to `maxPoints` vertices
 */
function thumbnailGeometry(geom: Geometry, maxPoints = 200): Geometry {
  if (geom.type === "Polygon") {
    return {
      type: "Polygon",
      coordinates: [decimateRing(geom.coordinates[0], maxPoints)],
    };
  }
  if (geom.type === "MultiPolygon") {
    const largest = geom.coordinates.reduce((best, poly) =>
      poly[0].length > best[0].length ? poly : best
    );
    return {
      type: "Polygon",
      coordinates: [decimateRing(largest[0], maxPoints)],
    };
  }
  return geom;
}

function buildStaticMapUrl(
  aoiSelection: AOISelection,
  geometry: FeatureCollection | Feature | Geometry | null,
  size = 80
): string | null {
  if (!MAPBOX_TOKEN) return null;
  const bbox = unionAoiBboxes(aoiSelection.aois);
  if (!bbox) return null;
  const [west, south, east, north] = bbox;

  const w = Math.max(west, -180).toFixed(4);
  const s = Math.max(south, -85).toFixed(4);
  const e = Math.min(east, 180).toFixed(4);
  const n = Math.min(north, 85).toFixed(4);

  const boundsPath = `[${w},${s},${e},${n}]/${size}x${size}@2x`;
  const qs = `?access_token=${MAPBOX_TOKEN}&attribution=false&logo=false`;
  const baseUrl = `https://api.mapbox.com/styles/v1/${STATIC_STYLE}/static`;

  // Try to add a GeoJSON boundary overlay, aggressively simplified for URL length.
  if (geometry) {
    let rawGeom: Geometry | null | undefined;
    if (geometry.type === "FeatureCollection") {
      rawGeom = (geometry as FeatureCollection).features[0]?.geometry;
    } else if (geometry.type === "Feature") {
      rawGeom = (geometry as Feature).geometry;
    } else {
      // Already a raw Geometry (Polygon, MultiPolygon, etc.)
      rawGeom = geometry as Geometry;
    }
    if (rawGeom) {
      // Decimate + reduce precision; retry with fewer points if still too long
      for (const maxPoints of [200, 100, 50]) {
        const geom = reduceCoordPrecision(
          thumbnailGeometry(rawGeom, maxPoints),
          2
        );
        const overlayGeoJson = {
          type: "Feature",
          properties: {
            stroke: "#0A3785",
            "stroke-width": 1,
            "fill-opacity": 0,
          },
          geometry: geom,
        };
        const encoded = encodeURIComponent(JSON.stringify(overlayGeoJson));
        const withOverlay = `${baseUrl}/geojson(${encoded})/${boundsPath}${qs}`;
        if (withOverlay.length <= MAX_URL_LENGTH) {
          return withOverlay;
        }
      }
    }
  }

  // Fall back to bounds-only (no overlay)
  return `${baseUrl}/${boundsPath}${qs}`;
}

function getAreaTypeLabel(aoiSelection: AOISelection): string {
  const aoi = aoiSelection.aois[0];
  if (!aoi) return "";
  if (aoi.subtype === "custom-area") return "Custom Polygon";
  switch (aoi.source) {
    case "gadm":
      return "Administrative Areas";
    case "kba":
      return "Key Biodiversity Areas";
    case "wdpa":
      return "Protected Areas";
    case "landmark":
      return "Indigenous Territories";
    default:
      return aoi.source
        ? aoi.source.charAt(0).toUpperCase() + aoi.source.slice(1)
        : "";
  }
}

export interface AreaCardProps {
  aoiSelection: AOISelection;
}

export function AreaCard({ aoiSelection }: AreaCardProps) {
  const { flyToBounds, flyToGeoJsonWithRetry, geoJsonRegistry } = useMapStore();
  const [imgError, setImgError] = useState(false);

  // Find the first matching geometry from the map registry
  const registryEntry = aoiSelection.aois
    .map((aoi) =>
      geoJsonRegistry.find(
        (e) => e.ref.name === aoi.name && e.ref.source === aoi.source
      )
    )
    .find(Boolean);
  const geometry =
    registryEntry?.data ?? aoiSelection.aois[0]?.geometry ?? null;

  const staticMapUrl = buildStaticMapUrl(aoiSelection, geometry);
  const showMap = staticMapUrl && !imgError;

  const handleLocate = () => {
    const unionBbox = unionAoiBboxes(aoiSelection.aois);
    if (unionBbox) {
      let east = unionBbox[2];
      if (east > 180) east -= 360;
      flyToBounds([
        [unionBbox[0], unionBbox[1]],
        [east, unionBbox[3]],
      ]);
      return;
    }
    const fallbackGeom = aoiSelection.aois[0]?.geometry;
    if (fallbackGeom) {
      flyToGeoJsonWithRetry(fallbackGeom);
    }
  };

  const areaTypeLabel = getAreaTypeLabel(aoiSelection);

  const thumbnail = showMap ? (
    <Image
      src={staticMapUrl!}
      alt={aoiSelection.name}
      width="80px"
      height="80px"
      objectFit="cover"
      onError={() => setImgError(true)}
    />
  ) : (
    <PolygonIcon size={32} color="#656E7B" />
  );

  const locateAction = (
    <Tooltip
      content="Center on map"
      positioning={{ placement: "top" }}
      showArrow
      variant="dark"
    >
      <Box
        as="button"
        onClick={handleLocate}
        display="inline-flex"
        alignItems="center"
        cursor="pointer"
        flexShrink={0}
      >
        <CrosshairIcon size={16} color="#656E7B" />
      </Box>
    </Tooltip>
  );

  return (
    <InfoCard
      thumbnail={thumbnail}
      thumbnailBg="gray.100"
      typeLabel="AREA"
      typeLabelColor="#2D6BE4"
      title={aoiSelection.name}
      description={areaTypeLabel || undefined}
      titleActions={locateAction}
    />
  );
}

"use client";
import { Image } from "@chakra-ui/react";
import { CrosshairIcon, PolygonIcon } from "@phosphor-icons/react";
import { AOISelection } from "@/app/types/chat";
import { Tooltip } from "./ui/tooltip";
import { InfoCard } from "./InfoCard";
import useMapStore from "@/app/store/mapStore";
import { unionAoiBboxes } from "@/app/utils/bboxUtils";
import { buildStaticMapUrl } from "@/app/utils/areaStaticMapUrl";
import { useState } from "react";

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
      <button
        type="button"
        aria-label="Center on map"
        onClick={handleLocate}
        style={{
          display: "inline-flex",
          alignItems: "center",
          cursor: "pointer",
          flexShrink: 0,
          background: "transparent",
          border: "none",
          padding: 0,
        }}
      >
        <CrosshairIcon size={16} color="#656E7B" />
      </button>
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

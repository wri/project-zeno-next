"use client";
import { useEffect, useState } from "react";
import { Box } from "@chakra-ui/react";
import { MapRef } from "react-map-gl/maplibre";

const NICE_DISTANCES = [
  1, 2, 5, 10, 20, 50, 100, 200, 500, 1_000, 2_000, 5_000, 10_000, 20_000,
  50_000, 100_000, 200_000, 500_000, 1_000_000, 2_000_000, 5_000_000,
  10_000_000,
];
const TARGET_WIDTH_PX = 80;

export function ScaleBar({ mapRef }: { mapRef: MapRef | null }) {
  const [bar, setBar] = useState<{ label: string; width: number } | null>(null);

  useEffect(() => {
    if (!mapRef) return;
    const map = mapRef.getMap();

    const update = () => {
      const zoom = map.getZoom();
      const lat = map.getCenter().lat;
      const metersPerPx =
        (40075016.686 * Math.cos((lat * Math.PI) / 180)) /
        Math.pow(2, zoom + 9);
      const maxMeters = TARGET_WIDTH_PX * metersPerPx;
      const nice =
        NICE_DISTANCES.findLast((d) => d <= maxMeters) ?? NICE_DISTANCES[0];
      const width = nice / metersPerPx;
      const label = nice >= 1000 ? `${nice / 1000} km` : `${nice} m`;
      // Bail out of the re-render when the bar is unchanged — `move` fires
      // every frame during pan/zoom, but the label/width only shift across
      // discrete zoom thresholds.
      setBar((prev) =>
        prev && prev.label === label && prev.width === width
          ? prev
          : { label, width }
      );
    };

    update();
    map.on("move", update);
    return () => {
      map.off("move", update);
    };
  }, [mapRef]);

  if (!bar) return null;

  return (
    <Box
      minW={`${bar.width}px`}
      whiteSpace="nowrap"
      borderBottom="2px solid"
      borderLeft="2px solid"
      borderRight="2px solid"
      borderColor="rgba(0,0,0,0.5)"
      bg="transparent"
      px={1}
      textAlign="center"
      fontSize="0.6rem"
      color="rgba(0,0,0,0.7)"
      lineHeight="1.4"
      _dark={{
        borderColor: "bg.subtle",
        color: "fg",
      }}
    >
      {bar.label}
    </Box>
  );
}

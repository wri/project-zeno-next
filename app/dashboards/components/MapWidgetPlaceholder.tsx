"use client";

import { Box, Image, Text } from "@chakra-ui/react";
import type { DashboardMapWidget } from "@/app/types/dashboard";

// Same custom GNW basemap the production map + AreaCard thumbnails use.
const MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN;
const STATIC_STYLE = "devseed/cmazl5ws500bz01scaa27dqi4";

// Fallback view when a widget doesn't specify one (Amazon basin).
const DEFAULT_CENTER: [number, number] = [-58, -8];
const DEFAULT_ZOOM = 3.5;

// Deterministic pseudo-random so SSR and client agree (Math.random would cause
// hydration mismatches — see the same pattern in chart-debug).
const rand = (i: number, salt: number) =>
  ((i * 9301 + salt * 49297) % 233280) / 233280;

function staticMapUrl(center: [number, number], zoom: number): string {
  const [lng, lat] = center;
  // {lon},{lat},{zoom},{bearing} / {w}x{h}@2x
  return (
    `https://api.mapbox.com/styles/v1/${STATIC_STYLE}/static/` +
    `${lng},${lat},${zoom},0/640x400@2x` +
    `?access_token=${MAPBOX_TOKEN}&attribution=false&logo=false`
  );
}

/**
 * A map widget backed by a real Mapbox static basemap snapshot, with alert
 * points overlaid. Falls back to a stylised gradient when no Mapbox token is
 * configured (so the prototype still renders without one).
 */
export default function MapWidgetPlaceholder({
  map,
  height = "360px",
}: {
  map: DashboardMapWidget;
  height?: string;
}) {
  const dotCount = Math.min(
    70,
    Math.max(8, Math.round((map.alertCount ?? 60) / 4))
  );
  const center = map.center ?? DEFAULT_CENTER;
  const zoom = map.zoom ?? DEFAULT_ZOOM;

  return (
    <Box
      position="relative"
      h={height}
      rounded="md"
      overflow="hidden"
      // Gradient shows while the snapshot loads, or if there's no token.
      bgGradient="to-br"
      gradientFrom="green.700"
      gradientVia="green.600"
      gradientTo="yellow.700"
    >
      {MAPBOX_TOKEN ? (
        <Image
          src={staticMapUrl(center, zoom)}
          alt={map.caption}
          position="absolute"
          inset={0}
          w="100%"
          h="100%"
          objectFit="cover"
          loading="lazy"
        />
      ) : (
        <Box
          position="absolute"
          inset={0}
          opacity={0.25}
          backgroundImage="radial-gradient(circle at 20% 30%, rgba(255,255,255,0.4) 0, transparent 35%), radial-gradient(circle at 70% 60%, rgba(0,0,0,0.3) 0, transparent 40%)"
        />
      )}

      {/* alert points */}
      {Array.from({ length: dotCount }).map((_, i) => (
        <Box
          key={i}
          position="absolute"
          left={`${Math.round(rand(i, 1) * 92) + 2}%`}
          top={`${Math.round(rand(i, 2) * 86) + 6}%`}
          w="6px"
          h="6px"
          rounded="full"
          bg="red.500"
          boxShadow="0 0 0 2px rgba(255,255,255,0.6)"
        />
      ))}

      {/* caption chip */}
      <Box
        position="absolute"
        top={3}
        left={3}
        bg="blackAlpha.700"
        color="white"
        px={3}
        py={1.5}
        rounded="md"
        fontSize="sm"
        fontWeight="medium"
        maxW="80%"
      >
        {map.caption}
      </Box>

      {/* inset legend/title */}
      {map.insetTitle && (
        <Box
          position="absolute"
          bottom={3}
          right={3}
          bg="bg"
          color="fg"
          px={3}
          py={2}
          rounded="md"
          fontSize="xs"
          maxW="60%"
          boxShadow="md"
        >
          <Text fontWeight="medium">{map.insetTitle}</Text>
          <Text color="fg.muted">Mock layer · prototype</Text>
        </Box>
      )}
    </Box>
  );
}

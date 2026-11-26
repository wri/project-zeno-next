import { Box, Flex, Text } from "@chakra-ui/react";
import { Popup, useMap } from "react-map-gl/maplibre";

import type { BoundaryFeatureDetails } from "@/app/utils/boundaryFeatureDetails";

export interface HoverInfo {
  lng: number;
  lat: number;
  name: string;
  /** Rich details for boundary-layer features; omitted → name-only hint. */
  details?: BoundaryFeatureDetails;
}

interface AreaTooltipProps {
  hoverInfo: HoverInfo | undefined;
}

// Colours from the Figma area detail card (GNW Playground, node 3877:7062).
const TOOLTIP = {
  eyebrow: "#4A64CB",
  text: "#3A4048",
  title: "#131619",
  label: "#656E7B",
  divider: "#F4F5F6",
  pillBg: "#F0F9B9",
  pillBorder: "rgba(142, 153, 84, 0.5)",
  pillText: "#23271A",
  sourceBg: "#F0F4FF",
} as const;

const CARD_WIDTH = 264;

// Where the card's corner sits relative to the cursor, per anchor. The card
// prefers below-right ("top-left" anchor), clear of the pointer hand. Not
// `as const`: Popup's `offset` prop does not accept readonly tuples.
const CURSOR_OFFSET = {
  "top-left": [20, 24],
  "top-right": [-20, 24],
  "bottom-left": [20, -12],
  "bottom-right": [-20, -12],
} satisfies Record<string, [number, number]>;

type TooltipAnchor = keyof typeof CURSOR_OFFSET;

// The anchor is chosen before the card renders, so it works from the
// card's expected size. The details card's height depends on the rows, so
// this errs tall.
const EXPECTED_SIZE = {
  details: { width: CARD_WIDTH, height: 280 },
  hint: { width: 200, height: 40 },
} as const;

interface Size {
  width: number;
  height: number;
}

/**
 * Below-right of the cursor by default; flips to the left near the right
 * edge and above near the bottom edge, so the card stays inside the map.
 */
export function pickTooltipAnchor(
  cursor: { x: number; y: number },
  map: Size,
  card: Size
): TooltipAnchor {
  const [rightGap, belowGap] = CURSOR_OFFSET["top-left"];
  const fitsBelow = cursor.y + belowGap + card.height <= map.height;
  const fitsRight = cursor.x + rightGap + card.width <= map.width;
  return `${fitsBelow ? "top" : "bottom"}-${fitsRight ? "left" : "right"}`;
}

function AreaTooltip({ hoverInfo }: AreaTooltipProps) {
  const { current: map } = useMap();

  if (!hoverInfo) return null;

  // The area name is resolved synchronously from vector-tile properties, but a
  // feature's name props aren't always populated the instant it's hovered.
  // Treat an empty name as "still resolving" and show a placeholder rather
  // than a blank or generic label, swapping in the real name once available.
  const resolvedName = hoverInfo.name?.trim();
  const { details } = hoverInfo;

  const anchor: TooltipAnchor = map
    ? pickTooltipAnchor(
        map.project([hoverInfo.lng, hoverInfo.lat]),
        {
          width: map.getContainer().clientWidth,
          height: map.getContainer().clientHeight,
        },
        details ? EXPECTED_SIZE.details : EXPECTED_SIZE.hint
      )
    : "top-left";

  return (
    <Popup
      longitude={hoverInfo.lng}
      latitude={hoverInfo.lat}
      anchor={anchor}
      offset={CURSOR_OFFSET[anchor]}
      closeButton={false}
      maxWidth="none"
      className={details ? "area-tooltip-popup" : undefined}
    >
      {details ? (
        <AreaDetailsCard details={details} />
      ) : (
        <p className="hint">{resolvedName || "..."}</p>
      )}
    </Popup>
  );
}

/**
 * Hover card for a boundary feature, loosely following the Figma area detail
 * card: "AREA · kind" eyebrow, title, status pill, label/value rows and a
 * source footer. Read-only (it follows the cursor), so no close button.
 */
export function AreaDetailsCard({
  details,
}: {
  details: BoundaryFeatureDetails;
}) {
  const { kind, title, status, rows, source } = details;

  return (
    <Flex
      direction="column"
      gap="10px"
      w={`${CARD_WIDTH}px`}
      px="16px"
      py="12px"
      bg="white"
      borderRadius="12px"
      boxShadow="0 2px 4px rgba(0,0,0,0.1), 0 4px 6px rgba(0,0,0,0.1)"
      fontFamily="body"
      data-testid="area-details-card"
    >
      <Box>
        <Text
          fontFamily="mono"
          fontSize="10px"
          lineHeight="14px"
          color={TOOLTIP.text}
          truncate
        >
          <Text as="span" color={TOOLTIP.eyebrow} letterSpacing="0.6px">
            AREA
          </Text>{" "}
          · {kind}
        </Text>
        <Text
          mt="4px"
          fontSize="16px"
          fontWeight="semibold"
          lineHeight="20px"
          color={TOOLTIP.title}
          lineClamp={2}
        >
          {title}
        </Text>
      </Box>

      {(status || rows.length > 0) && (
        <Flex direction="column">
          {status && (
            <DetailRow label="Status">
              <Text
                as="span"
                px="6px"
                py="1px"
                bg={TOOLTIP.pillBg}
                border="1px solid"
                borderColor={TOOLTIP.pillBorder}
                borderRadius="4px"
                fontFamily="mono"
                fontSize="9px"
                lineHeight="12px"
                letterSpacing="0.06em"
                color={TOOLTIP.pillText}
                truncate
              >
                {status}
              </Text>
            </DetailRow>
          )}
          {rows.map(({ label, value }) => (
            <DetailRow key={label} label={label}>
              <Text
                fontSize="12px"
                fontWeight="medium"
                lineHeight="16px"
                color={TOOLTIP.title}
                textAlign="right"
                lineClamp={2}
              >
                {value}
              </Text>
            </DetailRow>
          ))}
        </Flex>
      )}

      <Box px="8px" py="6px" bg={TOOLTIP.sourceBg} borderRadius="4px">
        <Text fontSize="11px" lineHeight="16px" color={TOOLTIP.text}>
          Source: {source}
        </Text>
      </Box>

      <Text fontSize="11px" lineHeight="14px" color={TOOLTIP.label}>
        Click to select this area
      </Text>
    </Flex>
  );
}

function DetailRow({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <Flex
      justify="space-between"
      align="center"
      gap="12px"
      py="6px"
      borderBottom="1px solid"
      borderColor={TOOLTIP.divider}
      _last={{ borderBottom: "none" }}
    >
      <Text
        fontSize="11px"
        lineHeight="16px"
        color={TOOLTIP.label}
        flexShrink={0}
      >
        {label}
      </Text>
      <Flex minW={0} justify="flex-end">
        {children}
      </Flex>
    </Flex>
  );
}

export default AreaTooltip;

import { Box } from "@chakra-ui/react";

import { isPaintReference } from "@/src/shared/lib/paint";

/**
 * Series swatch — an SVG rect when the fill is a hatch pattern (see
 * `isPaintReference`), else a box. Defaults to the legend's 14×10; the
 * tooltip shares it at its own smaller size.
 */
export function Swatch({
  color,
  width = 14,
  height = 10,
}: {
  color: string;
  width?: number;
  height?: number;
}) {
  if (isPaintReference(color)) {
    return (
      <Box
        as="span"
        w={`${width}px`}
        h={`${height}px`}
        flexShrink={0}
        lineHeight={0}
      >
        <svg width={width} height={height} aria-hidden focusable="false">
          <rect width={width} height={height} rx="2" fill={color} />
        </svg>
      </Box>
    );
  }
  return (
    <Box
      w={`${width}px`}
      h={`${height}px`}
      rounded="2px"
      bg={color}
      flexShrink={0}
    />
  );
}

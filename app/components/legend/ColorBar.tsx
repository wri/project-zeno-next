import { Box } from "@chakra-ui/react";
import type { BoxProps } from "@chakra-ui/react";

/**
 * ColorBar component rendering a horizontal color bar (gradient or solid).
 * @param props.color - CSS color or gradient string.
 */
export function ColorBar(props: {
  color: string;
  borderRadius?: BoxProps["borderRadius"];
}) {
  const { color, borderRadius = "full" } = props;

  return (
    <Box
      aria-hidden
      height={2}
      width="100%"
      bg={color}
      borderRadius={borderRadius}
      boxShadow="inset 0 0 0 1px {colors.gray.100}"
      h={2}
    />
  );
}

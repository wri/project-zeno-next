"use client";
import { Flex, IconButton, Text } from "@chakra-ui/react";
import { XIcon } from "@phosphor-icons/react";

export type ParamChipColorScheme = "blue" | "green" | "purple";

// Label text colors mapped from the Figma spec to the nearest theme tokens.
// The legend previously hardcoded the raw Figma hexes (#4A64CB, #A51EC7);
// these tokens are the canonical equivalents and the single source of truth.
//   blue   AREA            #4A64CB → primary.400 (#3361C0)
//   green  DATA            #1AA815 → green.500   (#00A651)
//   purple CANOPY / YEARS  #A51EC7 → purple.500  (#BA4AFF)
const LABEL_COLOR: Record<ParamChipColorScheme, string> = {
  blue: "primary.400",
  green: "green.500",
  purple: "purple.500",
};

export interface ParamChipProps {
  label: string;
  value: string;
  colorScheme?: ParamChipColorScheme;
  /** Render the value in the label color too (used for AREA chips in insights). */
  highlightValue?: boolean;
  /**
   * Chip background; defaults to transparent. The legend AOI chips sit on a
   * tinted strip and pass an opaque background so they read as distinct.
   */
  bg?: string;
  /** When provided, renders a remove (×) button at the end of the chip. */
  onRemove?: () => void;
  /** Accessible label for the remove button; defaults to `Remove {value}`. */
  removeLabel?: string;
  /**
   * Maximum width of the value text before it truncates with an ellipsis.
   * Long AOI/dataset names would otherwise blow the chip out; the full value
   * stays available via the native title tooltip. Defaults to "20ch".
   */
  maxValueWidth?: string;
}

/**
 * Compact monospace "LABEL value" chip used to surface analysis parameters
 * (area, dataset, canopy threshold, year range) across the insight workspace
 * and the map legend. Visual spec: 20px tall, mono 10px, colored uppercase
 * label + value, hairline neutral border.
 */
export function ParamChip({
  label,
  value,
  colorScheme = "blue",
  highlightValue = false,
  bg,
  onRemove,
  removeLabel,
  maxValueWidth = "20ch",
}: ParamChipProps) {
  const labelColor = LABEL_COLOR[colorScheme];
  return (
    <Flex
      align="center"
      gap={1}
      h="20px"
      px="6px"
      rounded="sm"
      border="1px solid"
      borderColor="neutral.300"
      bg={bg}
      flexShrink={0}
    >
      <Text
        fontFamily="mono"
        fontSize="10px"
        fontWeight="400"
        lineHeight="16px"
        letterSpacing="0.5px"
        color={labelColor}
        textTransform="uppercase"
      >
        {label}
      </Text>
      <Text
        fontFamily="mono"
        fontSize="10px"
        fontWeight="500"
        lineHeight="16px"
        color={highlightValue ? labelColor : "fg"}
        maxW={maxValueWidth}
        truncate
        title={value}
      >
        {value}
      </Text>
      {onRemove && (
        <IconButton
          variant="ghost"
          size="xs"
          p={0}
          minW="12px"
          h="12px"
          aria-label={removeLabel ?? `Remove ${value}`}
          onClick={onRemove}
        >
          <XIcon size={10} />
        </IconButton>
      )}
    </Flex>
  );
}

export default ParamChip;

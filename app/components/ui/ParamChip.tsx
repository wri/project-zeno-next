"use client";
import { Flex, IconButton, Text } from "@chakra-ui/react";
import { XIcon } from "@phosphor-icons/react";
import { Tooltip } from "@/components/ui/tooltip";

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

// Matches a `ch`-unit width (e.g. "15ch") so it doubles as a char-count
// truncation threshold. Module-scoped so it isn't recompiled per render.
const CH_UNIT_PATTERN = /^(\d+(?:\.\d+)?)ch$/;

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
   * Long AOI/dataset names would otherwise blow the chip out. Defaults to
   * "15ch". A `ch` value also sets the truncation threshold for the tooltip
   * (mono font ⇒ 1 char ≈ 1ch).
   */
  maxValueWidth?: string;
  /**
   * Full text shown in the hover tooltip. Defaults to `value`. Pass the long
   * form here when `value` is an abbreviation (e.g. the DATA chip shows a
   * dataset short label but tooltips the full dataset name). The tooltip only
   * renders when it would reveal something the chip doesn't already show — a
   * distinct full text, or a value wide enough to be truncated.
   */
  tooltip?: string;
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
  maxValueWidth = "15ch",
  tooltip,
}: ParamChipProps) {
  const labelColor = LABEL_COLOR[colorScheme];

  const tooltipText = tooltip ?? value;
  // Only tooltip when it reveals something not already visible: a distinct
  // full text, or a value wide enough to be truncated. For a `ch` maxWidth and
  // this mono font, 1 char ≈ 1ch, so a char-count threshold is accurate.
  const chMatch = CH_UNIT_PATTERN.exec(maxValueWidth);
  const maxChars = chMatch ? parseFloat(chMatch[1]) : Infinity;
  const showTooltip = tooltipText !== value || value.length > maxChars;

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
      <Tooltip content={tooltipText} disabled={!showTooltip} showArrow>
        <Text
          fontFamily="mono"
          fontSize="10px"
          fontWeight="500"
          lineHeight="16px"
          color={highlightValue ? labelColor : "fg"}
          maxW={maxValueWidth}
          truncate
        >
          {value}
        </Text>
      </Tooltip>
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

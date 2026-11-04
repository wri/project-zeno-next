import { chakra, Flex, Text } from "@chakra-ui/react";
import { CaretDownIcon } from "@phosphor-icons/react";
import { ParamChip } from "@/app/components/ui/ParamChip";
import { ParamChipData } from "./analysis-params-utils";

interface AnalysisParametersToggleProps {
  expanded: boolean;
  onToggle: () => void;
}

/**
 * Disclosure in the widget header row. One label in both states: the chevron
 * and `aria-expanded` say whether the inputs are on show.
 */
export default function AnalysisParametersToggle({
  expanded,
  onToggle,
}: AnalysisParametersToggleProps) {
  return (
    <chakra.button
      type="button"
      onClick={onToggle}
      aria-expanded={expanded}
      display="inline-flex"
      alignItems="center"
      gap="2px"
      bg="transparent"
      fontFamily="mono"
      fontSize="10px"
      fontWeight="400"
      lineHeight="16px"
      color="#4A64CB"
      whiteSpace="nowrap"
      flexShrink={0}
      cursor="pointer"
    >
      <Text as="span" textDecoration="underline" textDecorationStyle="solid">
        What was analysed
      </Text>
      <CaretDownIcon
        size={10}
        weight="bold"
        aria-hidden
        style={{ transform: expanded ? "rotate(180deg)" : undefined }}
      />
    </chakra.button>
  );
}

/** Chips panel rendered below the header row when expanded */
export function AnalysisParamsChips({
  chips,
  maxValueWidth,
}: {
  chips: ParamChipData[];
  /** Passed to each chip; "none" shows full values (print has no tooltips). */
  maxValueWidth?: string;
}) {
  return (
    <Flex gap={1.5} flexWrap="wrap">
      {chips.map((chip, idx) => (
        <ParamChip
          key={`${chip.label}-${idx}`}
          label={chip.label}
          value={chip.value}
          colorScheme={chip.colorScheme}
          highlightValue={chip.highlightValue}
          tooltip={chip.tooltip}
          maxValueWidth={maxValueWidth}
        />
      ))}
    </Flex>
  );
}

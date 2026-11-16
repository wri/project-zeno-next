import { Flex, Text } from "@chakra-ui/react";
import { ParamChip } from "@/app/components/ui/ParamChip";
import { ParamChipData } from "./analysis-params-utils";

/** The collapsed toggle's text. The onboarding tour's copy imports it, so a rename reaches both. */
export const SHOW_PARAMS_LABEL = "Show params";

interface AnalysisParametersToggleProps {
  expanded: boolean;
  onToggle: () => void;
}

/** Toggle button rendered in the widget header row */
export default function AnalysisParametersToggle({
  expanded,
  onToggle,
}: AnalysisParametersToggleProps) {
  return (
    <Text
      as="button"
      onClick={onToggle}
      fontFamily="mono"
      fontSize="10px"
      fontWeight="400"
      lineHeight="16px"
      color="#4A64CB"
      textDecoration="underline"
      textDecorationStyle="solid"
      whiteSpace="nowrap"
      flexShrink={0}
      cursor="pointer"
    >
      {expanded ? "Hide params" : SHOW_PARAMS_LABEL}
    </Text>
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

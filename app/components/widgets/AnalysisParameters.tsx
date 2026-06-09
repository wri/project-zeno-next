"use client";
import { Flex, Text } from "@chakra-ui/react";
import { ParamChip } from "@/app/components/ui/ParamChip";
import { ParamChipData } from "./analysis-params-utils";

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
      {expanded ? "Hide params" : "Show params"}
    </Text>
  );
}

/** Chips panel rendered below the header row when expanded */
export function AnalysisParamsChips({ chips }: { chips: ParamChipData[] }) {
  return (
    <Flex gap={1.5} flexWrap="wrap">
      {chips.map((chip, idx) => (
        <ParamChip
          key={`${chip.label}-${idx}`}
          label={chip.label}
          value={chip.value}
          colorScheme={chip.colorScheme}
          highlightValue={chip.label === "AREA"}
        />
      ))}
    </Flex>
  );
}

"use client";
import { Flex, Text } from "@chakra-ui/react";
import { ParamChip } from "./analysis-params-utils";

// TODO: Extract these colors to a shared util since they're used in DatasetCards too
// Label text colors mapped from Figma spec to nearest theme tokens:
// AREA #4A64CB → primary.400 (#3361C0)
// DATA #1AA815 → green.500  (#00A651)
// CANOPY #A51EC7 → purple.500 (#BA4AFF)
// YEARS #A51EC7 → purple.500 (#BA4AFF)
const chipLabelColor: Record<ParamChip["colorScheme"], string> = {
  blue: "primary.400",
  green: "green.500",
  purple: "purple.500",
};

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
export function AnalysisParamsChips({ chips }: { chips: ParamChip[] }) {
  return (
    <Flex gap={1.5} flexWrap="wrap">
      {chips.map((chip, idx) => (
        <Flex
          key={`${chip.label}-${idx}`}
          align="center"
          gap={1}
          h="20px"
          pt="2px"
          pb="2px"
          pr="6px"
          pl={2}
          rounded="sm"
        >
          <Text
            fontFamily="mono"
            fontSize="10px"
            fontWeight="400"
            lineHeight="16px"
            letterSpacing="0.5px"
            color={chipLabelColor[chip.colorScheme]}
            textTransform="uppercase"
          >
            {chip.label}
          </Text>
          <Text
            fontFamily="mono"
            fontSize="10px"
            fontWeight="500"
            lineHeight="16px"
            color="fg"
          >
            {chip.value}
          </Text>
        </Flex>
      ))}
    </Flex>
  );
}

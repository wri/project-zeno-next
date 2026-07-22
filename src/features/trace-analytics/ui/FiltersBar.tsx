"use client";

/** Shared date-range / environment filter controls (tracey sidebar port). */

import { ReactNode } from "react";
import {
  Box,
  Button,
  Checkbox,
  Flex,
  Input,
  NativeSelect,
  Text,
} from "@chakra-ui/react";
import { ENVIRONMENT_OPTIONS, type EnvironmentOption } from "../model/config";
import {
  DATE_PRESETS,
  useFiltersStore,
  type AnalysisGrain,
  type DatePreset,
} from "../model/filtersStore";

interface FiltersBarProps {
  readonly showExcludeInternal?: boolean;
  /** Show the turns/conversations unit toggle (Analytics view only). */
  readonly showGrain?: boolean;
}

const GRAIN_LABELS: Readonly<Record<AnalysisGrain, string>> = {
  turn: "Turns",
  conversation: "Conversations",
};

/** GNW metadata-label style: small uppercase mono. */
function FieldLabel({ children }: { readonly children: ReactNode }) {
  return (
    <Text
      fontSize="2xs"
      fontFamily="mono"
      textTransform="uppercase"
      letterSpacing="0.05em"
      color="fg.subtle"
      mb={1}
    >
      {children}
    </Text>
  );
}

export function FiltersBar({
  showExcludeInternal = true,
  showGrain = false,
}: FiltersBarProps) {
  const {
    preset,
    startDate,
    endDate,
    environment,
    excludeInternal,
    grain,
    setPreset,
    setCustomRange,
    setEnvironment,
    setExcludeInternal,
    setGrain,
  } = useFiltersStore();

  return (
    <Flex gap={4} wrap="wrap" align="flex-end">
      <Box>
        <FieldLabel>Date preset</FieldLabel>
        <NativeSelect.Root size="sm" width="150px">
          <NativeSelect.Field
            value={preset}
            onChange={(e) => setPreset(e.currentTarget.value as DatePreset)}
          >
            {DATE_PRESETS.map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </NativeSelect.Field>
          <NativeSelect.Indicator />
        </NativeSelect.Root>
      </Box>

      <Box>
        <FieldLabel>Start date</FieldLabel>
        <Input
          size="sm"
          type="date"
          width="150px"
          value={startDate}
          max={endDate}
          onChange={(e) => setCustomRange(e.currentTarget.value, endDate)}
        />
      </Box>

      <Box>
        <FieldLabel>End date</FieldLabel>
        <Input
          size="sm"
          type="date"
          width="150px"
          value={endDate}
          min={startDate}
          onChange={(e) => setCustomRange(startDate, e.currentTarget.value)}
        />
      </Box>

      <Box>
        <FieldLabel>Environment</FieldLabel>
        <NativeSelect.Root size="sm" width="140px">
          <NativeSelect.Field
            value={environment}
            onChange={(e) =>
              setEnvironment(e.currentTarget.value as EnvironmentOption)
            }
          >
            {ENVIRONMENT_OPTIONS.map((env) => (
              <option key={env} value={env}>
                {env}
              </option>
            ))}
          </NativeSelect.Field>
          <NativeSelect.Indicator />
        </NativeSelect.Root>
      </Box>

      {showGrain ? (
        <Box>
          <FieldLabel>Analyse by</FieldLabel>
          <Flex gap={1}>
            {(["turn", "conversation"] as const).map((g) => (
              <Button
                key={g}
                size="sm"
                variant={grain === g ? "solid" : "outline"}
                onClick={() => setGrain(g)}
              >
                {GRAIN_LABELS[g]}
              </Button>
            ))}
          </Flex>
        </Box>
      ) : null}

      {showExcludeInternal ? (
        <Checkbox.Root
          size="sm"
          checked={excludeInternal}
          onCheckedChange={(e) => setExcludeInternal(!!e.checked)}
          pb={1}
        >
          <Checkbox.HiddenInput />
          <Checkbox.Control />
          <Checkbox.Label>Exclude internal users</Checkbox.Label>
        </Checkbox.Root>
      ) : null}
    </Flex>
  );
}

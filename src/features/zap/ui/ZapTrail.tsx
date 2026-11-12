"use client";
import { Box, Flex, Stack, Text } from "@chakra-ui/react";
import { LightningIcon } from "@phosphor-icons/react";
import type { ReactNode } from "react";

import useZapStore from "../model/zap-store";
import { isZapBusy, showZapRow } from "./run-zap";
import { stateChips } from "./state-chips";

function Chip({ children }: { children: string }) {
  return (
    <Box
      as="span"
      px={1.5}
      rounded="sm"
      bg="bg.muted"
      color="fg.muted"
      whiteSpace="nowrap"
    >
      {children}
    </Box>
  );
}

function TrailRow({
  index,
  current,
  disabled,
  children,
}: {
  index: number;
  current: boolean;
  disabled: boolean;
  children: ReactNode;
}) {
  return (
    <Box
      as="button"
      onClick={() => void showZapRow(index)}
      aria-current={current ? "step" : undefined}
      aria-disabled={disabled}
      textAlign="left"
      px={2}
      py={1}
      rounded="md"
      borderLeftWidth="2px"
      borderColor={current ? "primary.solid" : "transparent"}
      bg={current ? "primary.50" : undefined}
      cursor={disabled ? "default" : "pointer"}
      _hover={disabled ? undefined : { bg: "bg.subtle" }}
    >
      {children}
    </Box>
  );
}

/**
 * The trail of zap requests: one row for each request, with the prompt and
 * the map state after it as chips. A click on a row puts the map in that
 * state. The first row is the map before the first request.
 */
export function ZapTrail() {
  const { rows, index, status } = useZapStore();
  const busy = isZapBusy(status);
  if (rows.length === 0) return null;

  return (
    <Stack gap={0.5} aria-label="Zap history">
      <TrailRow index={-1} current={index === -1} disabled={busy}>
        <Text color="fg.subtle">Map before zap</Text>
      </TrailRow>
      {rows.map((row, i) => (
        <TrailRow key={row.id} index={i} current={i === index} disabled={busy}>
          <Flex align="center" gap={1.5}>
            <LightningIcon size={12} weight="fill" />
            <Text truncate fontWeight={i === index ? "medium" : "normal"}>
              {row.prompt}
            </Text>
          </Flex>
          <Flex gap={1} wrap="wrap" pl={4} pt={0.5}>
            {stateChips(row.state).map((chip) => (
              <Chip key={chip}>{chip}</Chip>
            ))}
          </Flex>
        </TrailRow>
      ))}
    </Stack>
  );
}

import type { ReactNode } from "react";
import { Box, Flex, Heading, HStack, Text } from "@chakra-ui/react";
import { Tooltip } from "@/components/ui/tooltip";
import type { GroupStats } from "../model/types";
import { pct } from "../lib/format";
import { TIER_LEGEND, tiersOf, type TierKey } from "../lib/tiers";
import { PASS_COLOR, TIER_OPACITY } from "./palette";

export function Eyebrow({ children }: { readonly children: ReactNode }) {
  return (
    <Text
      fontFamily="mono"
      fontSize="xs"
      fontWeight="semibold"
      letterSpacing="0.08em"
      textTransform="uppercase"
      color="primary.solid"
    >
      {children}
    </Text>
  );
}

/** A dashboard section: eyebrow, heading, one-line explanation. */
export function Section({
  id,
  eyebrow,
  title,
  sub,
  action,
  children,
}: {
  readonly id: string;
  readonly eyebrow: string;
  readonly title: string;
  readonly sub: ReactNode;
  readonly action?: ReactNode;
  readonly children: ReactNode;
}) {
  return (
    <Box
      as="section"
      id={id}
      aria-labelledby={`${id}-title`}
      py={{ base: 8, md: 12 }}
    >
      <Flex mb={5} gap={4} align="flex-end" justify="space-between" wrap="wrap">
        <Box maxW="760px">
          <Eyebrow>{eyebrow}</Eyebrow>
          <Heading
            as="h2"
            id={`${id}-title`}
            size="xl"
            mt={1}
            textWrap="balance"
          >
            {title}
          </Heading>
          <Text mt={2} color="fg.muted" fontSize="sm">
            {sub}
          </Text>
        </Box>
        {action}
      </Flex>
      {children}
    </Box>
  );
}

export function tierSwatchStyle(key: TierKey) {
  const opacity = TIER_OPACITY[key];
  return opacity
    ? { bg: PASS_COLOR, opacity }
    : {
        bg: "bg.muted",
        boxShadow: "inset 0 0 0 1px var(--chakra-colors-border)",
      };
}

export function TierLegend() {
  return (
    <HStack gap={4} wrap="wrap" fontSize="xs" color="fg.muted">
      {TIER_LEGEND.map((t) => (
        <HStack key={t.key} gap={1.5}>
          <Box
            w="10px"
            h="10px"
            borderRadius="2px"
            {...tierSwatchStyle(t.key)}
          />
          <span>{t.label}</span>
        </HStack>
      ))}
    </HStack>
  );
}

/** Tier summary in words, for labels and tooltips. */
export function tierSummary(stats: GroupStats): string {
  const n = stats.scored;
  return tiersOf(stats)
    .map(
      (t) =>
        `${pct(n ? t.count / n : null)} ${t.label.toLowerCase()} (${t.count})`
    )
    .join(", ");
}

function TierSegments({
  stats,
  height,
}: {
  readonly stats: GroupStats;
  readonly height: string;
}) {
  return (
    <Flex
      gap="2px"
      h={height}
      borderRadius="4px"
      overflow="hidden"
      w="100%"
      aria-hidden
    >
      {tiersOf(stats).map((t) =>
        t.count ? (
          <Box
            key={t.key}
            flex={`${t.count} 1 0`}
            minW="2px"
            {...tierSwatchStyle(t.key)}
          />
        ) : null
      )}
    </Flex>
  );
}

/**
 * The four reliability tiers of a group as one stacked bar. Inside a
 * button (`decorative`) it is a plain picture and the button carries the
 * words; standalone it is focusable with a tooltip.
 */
export function TierBar({
  stats,
  label,
  height = "12px",
  decorative = false,
}: {
  readonly stats: GroupStats;
  readonly label: string;
  readonly height?: string;
  readonly decorative?: boolean;
}) {
  if (decorative) return <TierSegments stats={stats} height={height} />;
  const n = stats.scored;
  return (
    <Tooltip
      content={
        <Box fontSize="xs">
          <Text fontWeight="semibold">{label}</Text>
          {tiersOf(stats).map((t) => (
            <Text key={t.key}>
              {pct(n ? t.count / n : null)} {t.label.toLowerCase()} ({t.count})
            </Text>
          ))}
        </Box>
      }
    >
      <Box
        role="img"
        aria-label={`${label}: ${tierSummary(stats)}`}
        tabIndex={0}
        w="100%"
      >
        <TierSegments stats={stats} height={height} />
      </Box>
    </Tooltip>
  );
}

/** Tier counts as inline facts, e.g. "Accurate every time 38". */
export function TierFacts({ stats }: { readonly stats: GroupStats }) {
  return (
    <>
      {tiersOf(stats).map((t) => (
        <Text as="span" key={t.key}>
          {t.label} <b>{t.count}</b>
        </Text>
      ))}
    </>
  );
}

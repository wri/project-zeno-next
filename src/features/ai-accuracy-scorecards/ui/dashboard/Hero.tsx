import {
  Badge,
  Box,
  Flex,
  Grid,
  Link as ChakraLink,
  Text,
} from "@chakra-ui/react";
import { Link } from "@/src/shared/lib/router";
import type { BenchmarkPage, GroupStats, TrendPoint } from "../../model/types";
import { formatDay, pct } from "../../lib/format";
import { TIERS, tiersOf, type Tier, type TierKey } from "../../lib/tiers";
import { PASS_COLOR, TIER_OPACITY } from "../palette";
import {
  FADE,
  MOTION_SAFE,
  TipKey,
  TipNote,
  TipRule,
  TipValue,
  useChartHover,
} from "../chart-hover";
import {
  Eyebrow,
  Legend,
  Panel,
  TierSegments,
  tierSwatchStyle,
} from "../parts";
import { TrendChart } from "./TrendChart";

/** A tier's tooltip: its share, then the running total it brings. */
function TierTip({
  tier,
  stats,
}: {
  readonly tier: Tier;
  readonly stats: GroupStats;
}) {
  const running =
    tier.key === "most"
      ? `${pct(stats.majority, 1)} accurate at least most of the time`
      : tier.key === "some" || tier.key === "never"
        ? `${pct(stats.anyTime, 1)} accurate at least once`
        : null;
  return (
    <>
      <TipValue>
        {pct(tier.share, 1)} · {tier.count} questions
      </TipValue>
      <TipKey
        color={tier.key === "never" ? "currentColor" : PASS_COLOR}
        opacity={TIER_OPACITY[tier.key] || 0.5}
      >
        {tier.label} ({tier.attempts})
      </TipKey>
      {running ? (
        <>
          <TipRule />
          <TipNote>{running}</TipNote>
        </>
      ) : null}
    </>
  );
}

export function Hero({
  page,
  trend,
  methodologyHref,
}: {
  readonly page: BenchmarkPage;
  readonly trend: readonly TrendPoint[];
  readonly methodologyHref: string;
}) {
  const { summary, benchmark } = page;
  const { draft } = page.run;
  const tiers = tiersOf(summary);
  const hover = useChartHover<TierKey>();
  return (
    <Grid
      as="section"
      id="headline"
      aria-label="Reliable AI accuracy on priority use cases"
      templateColumns={{ base: "1fr", lg: "minmax(0, 1fr) minmax(0, 1.1fr)" }}
      gap={{ base: 8, lg: 12 }}
      py={{ base: 8, md: 12 }}
      alignItems="start"
    >
      <Box minW={0}>
        <Eyebrow>Reliable AI accuracy on priority use cases</Eyebrow>
        <Text
          as="p"
          fontSize={{ base: "6xl", md: "7xl" }}
          fontWeight="semibold"
          lineHeight="1"
          mt={3}
          letterSpacing="-0.02em"
          fontVariantNumeric="tabular-nums"
        >
          {pct(summary.everyTime, 1).replace("%", "")}
          <Text as="span" fontSize="0.45em" ml={1} color="fg.muted">
            %
          </Text>
        </Text>
        <Text mt={3} fontSize="lg" maxW="34ch">
          For {pct(summary.everyTime, 1)} of questions across priority use
          cases, users can expect an accurate answer every time they ask.
        </Text>

        <Box mt={6} role="group" aria-label="How often answers were accurate">
          <TierSegments
            stats={summary}
            height="14px"
            hover={hover}
            tip={(t) => <TierTip tier={t} stats={summary} />}
          />
          {hover.tooltip}
          <Box as="ul" listStyleType="none" mt={3} display="grid" gap={1.5}>
            {tiers.map((t) => (
              <Grid
                as="li"
                key={t.key}
                templateColumns="12px 52px minmax(0, 1fr)"
                gap={2.5}
                alignItems="baseline"
                fontSize="sm"
                color="fg.muted"
                px={1.5}
                mx={-1.5}
                py={0.5}
                borderRadius="sm"
                bg={hover.active === t.key ? "bg.muted" : undefined}
                opacity={hover.dimmed(t.key) ? 0.45 : 1}
                transition={`${FADE}, background 140ms`}
                css={MOTION_SAFE}
                {...hover.target(t.key)}
              >
                <Box
                  w="12px"
                  h="12px"
                  borderRadius="3px"
                  alignSelf="start"
                  mt="3px"
                  {...tierSwatchStyle(t.key)}
                />
                <Text
                  as="span"
                  fontWeight="semibold"
                  color="fg"
                  textAlign="right"
                  fontVariantNumeric="tabular-nums"
                >
                  {pct(t.share, 1)}
                </Text>
                <Text as="span">
                  <Text as="b" color="fg">
                    {t.label}
                  </Text>{" "}
                  <Text
                    as="span"
                    display="block"
                    fontSize="xs"
                    color="fg.subtle"
                  >
                    {t.attempts} · {t.count} questions
                  </Text>
                </Text>
              </Grid>
            ))}
          </Box>
          <Text mt={3} fontSize="sm" color="fg.muted">
            Together, {pct(summary.majority, 1)} of questions get an accurate
            answer at least most of the time.
          </Text>
        </Box>

        <Text mt={5} fontSize="sm" color="fg.muted" maxW="60ch">
          We ask Horizon each question 3 times. An answer is accurate only if it
          passes every check; one miss and it counts as wrong.{" "}
          <ChakraLink asChild color="primary.solid">
            <Link href={methodologyHref}>How we score this →</Link>
          </ChakraLink>
        </Text>

        <Flex as="dl" mt={6} gap={{ base: 5, md: 8 }} wrap="wrap" fontSize="sm">
          <Box>
            <Text as="dt" color="fg.subtle" fontSize="xs">
              Benchmark Set
            </Text>
            <Text as="dd" fontWeight="semibold">
              v{benchmark.set}{" "}
              {draft ? (
                <Badge size="sm" colorPalette="yellow" variant="subtle">
                  Draft
                </Badge>
              ) : null}
            </Text>
          </Box>
          <Box>
            <Text as="dt" color="fg.subtle" fontSize="xs">
              Questions
            </Text>
            <Text as="dd" fontWeight="semibold">
              {benchmark.members}, asked {page.run.numTrials} times
            </Text>
          </Box>
          <Box>
            <Text as="dt" color="fg.subtle" fontSize="xs">
              Last run
            </Text>
            <Text as="dd" fontWeight="semibold">
              {formatDay(page.run.started)}
            </Text>
          </Box>
        </Flex>
      </Box>

      <Panel minW={0}>
        <Text fontWeight="semibold" mb={2}>
          Accuracy over time
        </Text>
        <TrendChart points={trend} />
        <Box mt={2}>
          <Legend
            items={[
              {
                key: "every",
                label: "Accurate every time",
                swatch: (
                  <Box
                    w="10px"
                    h="10px"
                    borderRadius="full"
                    {...tierSwatchStyle("every")}
                  />
                ),
              },
              ...TIERS.filter((t) => t.key === "most" || t.key === "some").map(
                (t) => ({
                  key: t.key,
                  label: `+ ${t.label.toLowerCase()}`,
                  swatch: (
                    <Box
                      w="10px"
                      h="10px"
                      borderRadius="2px"
                      {...tierSwatchStyle(t.key)}
                    />
                  ),
                })
              ),
            ]}
          />
        </Box>
        {draft ? (
          <Text fontSize="xs" color="fg.muted" mt={2}>
            <b>Draft run:</b> expected answers for new questions are still under
            review.
          </Text>
        ) : null}
      </Panel>
    </Grid>
  );
}

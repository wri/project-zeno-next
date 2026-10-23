import { useRef, useState, type Ref } from "react";
import {
  Box,
  Button,
  chakra,
  Flex,
  Grid,
  HStack,
  Text,
} from "@chakra-ui/react";
import {
  ATTRIBUTION_ORDER,
  STAGE_LABELS,
  checkLabel,
} from "../../model/config";
import type {
  AttributionKey,
  BenchmarkPage,
  MeasuredType,
} from "../../model/types";
import { pct } from "../../lib/format";
import { PASS_COLOR, STAGE_COLORS } from "../palette";
import {
  revealIfAbove,
  Section,
  TierBar,
  TierFacts,
  TierLegend,
  tierSummary,
} from "../parts";

type BarView = "rate" | "modes";
type ModeKey = "pass" | AttributionKey;

const MODE_KEYS: readonly ModeKey[] = ["pass", ...ATTRIBUTION_ORDER];

function modeColor(key: ModeKey): string {
  return key === "pass" ? PASS_COLOR : STAGE_COLORS[key];
}

function modeLabel(key: ModeKey): string {
  return key === "pass" ? "Accurate" : STAGE_LABELS[key];
}

function modeCount(t: MeasuredType, key: ModeKey): number {
  return key === "pass" ? t.stats.passed : (t.stats.failureModes[key] ?? 0);
}

function failureList(t: MeasuredType): string {
  return ATTRIBUTION_ORDER.filter((k) => t.stats.failureModes[k])
    .map(
      (k) => `${t.stats.failureModes[k]} at ${STAGE_LABELS[k].toLowerCase()}`
    )
    .join(", ");
}

function ModesBar({ t }: { readonly t: MeasuredType }) {
  return (
    <Flex
      h="22px"
      borderRadius="4px"
      overflow="hidden"
      gap="1px"
      aria-hidden
      w="100%"
    >
      {MODE_KEYS.filter((k) => modeCount(t, k)).map((k) => {
        const count = modeCount(t, k);
        return (
          <Flex
            key={k}
            flex={`${count} 1 0`}
            bg={modeColor(k)}
            color="white"
            fontSize="2xs"
            fontWeight="semibold"
            align="center"
            justify="center"
            minW="3px"
            title={`${t.label} · ${modeLabel(k)}: ${count} of ${t.stats.scored} questions${k === "pass" ? " answered accurately" : " failed here first"}`}
          >
            {count >= 2 ? count : null}
          </Flex>
        );
      })}
    </Flex>
  );
}

function TypeDetail({
  t,
  detailRef,
}: {
  readonly t: MeasuredType;
  readonly detailRef: Ref<HTMLDivElement>;
}) {
  const fails = t.stats.scored - t.stats.passed;
  return (
    <Box
      ref={detailRef}
      scrollMarginTop={4}
      borderWidth="1px"
      borderColor="border"
      borderRadius="lg"
      bg="bg.panel"
      p={{ base: 4, md: 5 }}
      aria-live="polite"
    >
      <Text
        fontSize="xs"
        color="fg.subtle"
        fontFamily="mono"
        textTransform="uppercase"
        letterSpacing="0.06em"
      >
        If a user asks a question like this, how likely are they to be misled?
      </Text>
      <Text fontSize="lg" mt={2}>
        For <b>{t.label.toLowerCase()}</b> questions ({t.description}), users
        can expect an accurate answer every time on{" "}
        <b>{pct(t.stats.everyTime)} of questions</b>, and at least most of the
        time on {pct(t.stats.majority)}.
      </Text>
      <Grid
        mt={3}
        gap={5}
        templateColumns={{ base: "1fr", md: "repeat(2, minmax(0, 1fr))" }}
        fontSize="sm"
        color="fg.muted"
      >
        <Box minW={0}>
          <Text
            fontFamily="mono"
            fontSize="xs"
            color="fg.subtle"
            textTransform="uppercase"
          >
            Got right
          </Text>
          <Text>
            {t.examplePass ? (
              <>&ldquo;{t.examplePass}&rdquo;</>
            ) : (
              "None in this run."
            )}
          </Text>
        </Box>
        <Box minW={0}>
          <Text
            fontFamily="mono"
            fontSize="xs"
            color="fg.subtle"
            textTransform="uppercase"
          >
            Got wrong
          </Text>
          {t.exampleFail ? (
            <Text>
              &ldquo;{t.exampleFail.query}&rdquo;
              <br />
              Failed: {t.exampleFail.failedChecks.map(checkLabel).join("; ")}
            </Text>
          ) : (
            <Text>None in this run.</Text>
          )}
        </Box>
      </Grid>
      <Flex mt={4} gap={4} wrap="wrap" fontSize="xs" color="fg.muted">
        <TierFacts stats={t.stats} />
        {fails ? (
          <Text as="span">
            Failed: <b>{failureList(t)}</b>
          </Text>
        ) : null}
      </Flex>
    </Box>
  );
}

export function QuestionTypesSection({
  page,
}: {
  readonly page: BenchmarkPage;
}) {
  const [view, setView] = useState<BarView>("rate");
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const detailRef = useRef<HTMLDivElement>(null);
  const selected =
    page.types.find((t) => t.key === selectedKey) ?? page.types[0];
  if (!selected) return null;
  return (
    <Section
      id="types"
      eyebrow="By question type"
      title="Accuracy by question type"
      sub="Each question type has its own definition of a right answer. Select a type for examples."
      action={
        <HStack
          gap={0}
          role="group"
          aria-label="Bar view"
          borderWidth="1px"
          borderColor="border"
          borderRadius="md"
          p="2px"
        >
          {(["rate", "modes"] as const).map((v) => (
            <Button
              key={v}
              size="xs"
              variant={view === v ? "solid" : "ghost"}
              aria-pressed={view === v}
              onClick={() => setView(v)}
            >
              {v === "rate" ? "Pass rate" : "Where it failed"}
            </Button>
          ))}
        </HStack>
      }
    >
      <TypeDetail t={selected} detailRef={detailRef} />
      <Box mt={4} mb={2}>
        {view === "rate" ? (
          <TierLegend />
        ) : (
          <HStack gap={4} wrap="wrap" fontSize="xs" color="fg.muted">
            {MODE_KEYS.map((k) => (
              <HStack key={k} gap={1.5}>
                <Box w="10px" h="10px" borderRadius="2px" bg={modeColor(k)} />
                <span>{modeLabel(k)}</span>
              </HStack>
            ))}
          </HStack>
        )}
      </Box>
      <Box display="grid" gap={2}>
        {page.types.map((t) => {
          const isSelected = t.key === selected.key;
          return (
            <chakra.button
              key={t.key}
              type="button"
              onClick={() => {
                setSelectedKey(t.key);
                revealIfAbove(detailRef.current);
              }}
              aria-pressed={isSelected}
              aria-label={`${t.label}, ${t.stats.scored} questions: ${tierSummary(t.stats)}`}
              display="grid"
              gridTemplateColumns={{
                base: "minmax(0, 1fr) 5rem",
                md: "minmax(0, 16rem) 6rem minmax(0, 1fr)",
              }}
              gap={{ base: 2, md: 4 }}
              alignItems="center"
              textAlign="left"
              cursor="pointer"
              p={3}
              borderWidth="1px"
              borderColor={isSelected ? "primary.solid" : "border"}
              borderRadius="md"
              bg={isSelected ? "bg.subtle" : "bg.panel"}
              _hover={{ borderColor: "primary.solid" }}
              _focusVisible={{
                outline: "2px solid",
                outlineColor: "primary.solid",
                outlineOffset: "2px",
              }}
            >
              <Box minW={0}>
                <Text fontWeight="semibold">{t.label}</Text>
                <Text fontSize="xs" color="fg.subtle">
                  {t.description} · {t.stats.scored}
                </Text>
              </Box>
              <Box textAlign={{ base: "right", md: "left" }}>
                <Text fontWeight="semibold" fontVariantNumeric="tabular-nums">
                  {view === "rate"
                    ? pct(t.stats.everyTime)
                    : pct(t.stats.majority)}
                </Text>
                <Text fontSize="xs" color="fg.subtle">
                  {view === "rate" ? "every time" : "2 of 3 tries"}
                </Text>
              </Box>
              <Box gridColumn={{ base: "1 / -1", md: "auto" }} minW={0}>
                {view === "rate" ? (
                  <TierBar stats={t.stats} label={t.label} />
                ) : (
                  <ModesBar t={t} />
                )}
              </Box>
            </chakra.button>
          );
        })}
      </Box>
      <Text mt={3} fontSize="xs" color="fg.subtle">
        Types with fewer than 20 questions can swing a lot between runs.
        {page.unmeasuredTypes.length
          ? ` Not yet measured: ${page.unmeasuredTypes.map((t) => t.label.toLowerCase()).join(", ")}.`
          : ""}
      </Text>
    </Section>
  );
}

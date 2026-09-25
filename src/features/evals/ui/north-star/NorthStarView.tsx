"use client";

/**
 * The North Star narrative for CHALLENGE (and, once frozen, BENCHMARK),
 * after the Zeno North Star v2 wireframe: the single number and its
 * history, the question behind it, the five checks and their compound
 * effect, then the intent x dataset matrix. Every layer reads the same
 * composed rows (latest eligible run per intent).
 */

import { Box, Button, Flex, Text } from "@chakra-ui/react";
import { usePathname, useRouter, useSearchParams } from "@/app/lib/router";
import { HEADLINE_SOURCE } from "../../model/benchmark";
import type { HeadlineSource } from "../../model/benchmark";
import { InlineAlert } from "../primitives/InlineAlert";
import { QueryState } from "../primitives/QueryState";
import { AccuracyMatrix } from "./AccuracyMatrix";
import { CheckPipeline } from "./CheckPipeline";
import {
  CHECKS_SECTION,
  MATRIX_SECTION,
  METHODOLOGY,
  scaleLine,
  STORY,
} from "./copy";
import { NorthStarHero } from "./NorthStarHero";
import { Panel, Section } from "./Section";
import { SurvivalFunnel } from "./SurvivalFunnel";
import { useNorthStar } from "./use-north-star";
import { WorkedExample } from "./WorkedExample";

const RANGE_PARAM = "range";

function useRangeToggle(): [boolean, (show: boolean) => void] {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const show = searchParams?.get(RANGE_PARAM) === "1";
  function setShow(next: boolean) {
    const params = new URLSearchParams(searchParams?.toString() ?? "");
    if (next) params.set(RANGE_PARAM, "1");
    else params.delete(RANGE_PARAM);
    router.replace(`${pathname}?${params.toString()}`, { scroll: false });
  }
  return [show, setShow];
}

export function NorthStarView({
  onOpenMethodology,
  source = HEADLINE_SOURCE,
}: {
  readonly onOpenMethodology: () => void;
  readonly source?: HeadlineSource;
}) {
  const { model, headlineRun, hasRuns, isLoading, error } =
    useNorthStar(source);
  const [showRange, setShowRange] = useRangeToggle();

  if (isLoading || error) {
    return (
      <QueryState
        isLoading={isLoading}
        error={error}
        what="the North Star data"
      />
    );
  }
  if (!hasRuns || !model || model.star.stat.rate === null) {
    return (
      <InlineAlert
        status="info"
        message={
          source.kind === "benchmark"
            ? "No 3-trial runs of this benchmark yet."
            : "No committed CHALLENGE runs yet."
        }
      />
    );
  }

  const { star } = model;
  const rate = star.stat.rate!;
  const footnote = `Each intent reads its latest eligible run: ${model.sources
    .map((s) => `${s.intent} ← ${s.runId}`)
    .join(", ")}.`;

  return (
    <Box maxW="72rem">
      <Section id="north-star">
        <NorthStarHero
          rate={rate}
          ciLow={star.stat.ciLow}
          ciHigh={star.stat.ciHigh}
          scale={scaleLine({
            source,
            questions: star.stat.n,
            datasets: star.datasets,
            lastRun: model.lastRun,
            trials: model.trials,
            casesetVersion: model.casesetVersion,
          })}
          headlineRun={headlineRun}
          trend={model.trend}
          showRange={showRange}
          onShowRangeChange={setShowRange}
          onOpenMethodology={onOpenMethodology}
        />
      </Section>

      <Section id="the-question" eyebrow={STORY.eyebrow} title={STORY.title}>
        <WorkedExample />
      </Section>

      <Section
        id="five-checks"
        eyebrow={CHECKS_SECTION.eyebrow}
        title={CHECKS_SECTION.title}
        sub={CHECKS_SECTION.sub}
      >
        <CheckPipeline
          checks={model.checks}
          history={model.checkHistory}
          showRange={showRange}
        />
        <SurvivalFunnel survival={model.survival} headline={rate} />
      </Section>

      <Section
        id="matrix"
        eyebrow={MATRIX_SECTION.eyebrow}
        title={MATRIX_SECTION.title}
        sub={MATRIX_SECTION.sub}
      >
        <AccuracyMatrix
          matrix={model.matrix}
          showRange={showRange}
          footnote={footnote}
        />
      </Section>

      <Section id="methodology-pointer">
        <Panel px={5} py={4}>
          <Flex align="center" justify="space-between" gap={3} wrap="wrap">
            <Text color="fg.muted">{METHODOLOGY.pointer}</Text>
            <Button
              size="sm"
              colorPalette="primary"
              onClick={onOpenMethodology}
            >
              {METHODOLOGY.pointerCta} →
            </Button>
          </Flex>
        </Panel>
      </Section>
    </Box>
  );
}

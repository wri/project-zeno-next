import { useMemo, useState } from "react";
import { Grid, HStack, Text } from "@chakra-ui/react";
import { InfoTooltip } from "@/src/shared/ui/InfoTooltip";
import { STAGE_COPY, STAGE_LABELS } from "../../model/config";
import type { BenchmarkPage } from "../../model/types";
import { failureFlow, STANDARDS, type Standard } from "../../lib/failures";
import { STAGE_COLORS } from "../palette";
import { Panel, Section, Segmented } from "../parts";
import {
  FailureFlowChart,
  flowHeight,
  flowStages,
  STANDARD_COPY,
} from "./FailureFlowChart";

// "Checked" comes from the checks that ran, so a step can check fewer
// questions than the flow carries through it; and a question wrong at two
// steps counts only at the first, so this is not the step's own failure
// rate (AJ, 2026-10-29).
const FAILED_FIRST_INFO =
  "Of the questions where this step had something to check, how many went wrong here first. A question with nothing to check at a step counts as passing it. A question already wrong at an earlier step is counted there, not here.";

const STANDARD_OPTIONS = STANDARDS.map(
  (s) => [s, STANDARD_COPY[s].option] as const
);

export function FailureFlowSection({ page }: { readonly page: BenchmarkPage }) {
  // The headline's measure by default, so the two agree on first read.
  const [standard, setStandard] = useState<Standard>("every");
  const flows = useMemo(
    () => ({
      every: failureFlow(page.questions, "every"),
      most: failureFlow(page.questions, "most"),
      some: failureFlow(page.questions, "some"),
    }),
    [page.questions]
  );
  const stages = useMemo(() => flowStages(flows), [flows]);
  const height = useMemo(() => flowHeight(stages, flows), [stages, flows]);
  const flow = flows[standard];
  const firstFailures = new Map(flow.modes.map((m) => [m.key, m.count]));
  return (
    <Section
      id="fail"
      title="Where answers fail"
      sub="Horizon answers in five steps. Each wrong answer is counted once, at the step where it first went wrong."
      action={
        <Segmented
          label="Count a question as accurate when it is right"
          options={STANDARD_OPTIONS}
          value={standard}
          onChange={setStandard}
        />
      }
    >
      <Panel>
        <Text fontWeight="semibold">
          Where the {flow.scored} scored questions end up
        </Text>
        <Text fontSize="sm" color="fg.muted" mb={1}>
          A question counts as accurate when it was right on{" "}
          {STANDARD_COPY[standard].tries}
          {standard === "every" ? ", the same measure as the headline" : ""}. A
          wrong question stays at the same step whichever measure you pick; a
          stricter measure only adds questions.
        </Text>
        <Text fontSize="sm" color="fg.muted" mb={3}>
          Not every check applies to every question. Questions skip checks that
          don&rsquo;t apply to them, and count as passing those steps.
        </Text>
        <FailureFlowChart
          flow={flow}
          stages={stages}
          height={height}
          standard={standard}
        />
      </Panel>
      <Grid
        mt={4}
        gap={3}
        templateColumns={{
          base: "1fr",
          sm: "repeat(2, minmax(0, 1fr))",
          lg: "repeat(5, minmax(0, 1fr))",
        }}
      >
        {page.stages.map((s, i) => (
          <Panel
            key={s.key}
            borderTopWidth="3px"
            borderTopColor={STAGE_COLORS[s.key]}
            borderRadius="md"
            p={3}
            display="flex"
            flexDirection="column"
            gap={1}
            fontSize="sm"
          >
            <Text fontFamily="mono" fontSize="xs" color="fg.subtle">
              Check {i + 1}
            </Text>
            <Text fontWeight="semibold">{STAGE_LABELS[s.key]}</Text>
            <Text color="fg.muted" fontSize="xs" flex="1">
              {STAGE_COPY[s.key].card}
            </Text>
            {/* Label and count stacked: side by side they wrap into each
                other on the five-column cards. */}
            <HStack gap={1} fontSize="xs" mt={1}>
              Failed here first
              <InfoTooltip
                size={12}
                about={`"Failed here first" for ${STAGE_LABELS[s.key]}`}
              >
                {FAILED_FIRST_INFO}
              </InfoTooltip>
            </HStack>
            <Text fontSize="xs">
              <b>{firstFailures.get(s.key) ?? 0}</b> of {s.checked} checked
            </Text>
          </Panel>
        ))}
      </Grid>
    </Section>
  );
}

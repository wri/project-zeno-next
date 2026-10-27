import { useMemo, useState } from "react";
import { Grid, Text } from "@chakra-ui/react";
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

const STANDARD_OPTIONS = STANDARDS.map(
  (s) => [s, STANDARD_COPY[s].option] as const
);

export function FailureFlowSection({ page }: { readonly page: BenchmarkPage }) {
  // The headline's measure by default, so the two agree on first read.
  const [standard, setStandard] = useState<Standard>("every");
  const flows = useMemo(
    () =>
      Object.fromEntries(
        STANDARDS.map((s) => [s, failureFlow(page.questions, s)])
      ) as Record<Standard, ReturnType<typeof failureFlow>>,
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
        <Text fontSize="sm" color="fg.muted" mb={3}>
          <b>
            A question counts as accurate when it was right on{" "}
            {STANDARD_COPY[standard].tries}
          </b>
          {standard === "every" ? ", the same measure as the headline" : ""}. A
          wrong question stays at the same step whichever measure you pick; a
          stricter measure only adds questions.
        </Text>
        <Text fontWeight="semibold" mb={2}>
          Where the {flow.scored} scored questions end up
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
              {STAGE_COPY[s.key].question}
            </Text>
            <Text display="flex" justifyContent="space-between" fontSize="xs">
              <span>Applies to</span>
              <b>
                {s.checked} of {flow.scored}
              </b>
            </Text>
            <Text display="flex" justifyContent="space-between" fontSize="xs">
              <span>Failed here first</span>
              <b>{firstFailures.get(s.key) ?? 0}</b>
            </Text>
          </Panel>
        ))}
      </Grid>
    </Section>
  );
}

"use client";
import { Box, Button, Flex, Spinner, Stack, Text } from "@chakra-ui/react";
import { LightningIcon } from "@phosphor-icons/react";
import { useEffect } from "react";

import useZapDashboardStore from "../model/zap-dashboard-store";
import {
  editSummary,
  previewText,
  type ZapDashboardRow,
} from "../model/zap-dashboard-trail";
import type { ZapDecision, ZapDecisionOption } from "../model/zap-plan";
import {
  affectedWidgets,
  dashboardStepsOf,
  hasDestructiveStep,
  previewDecisions,
  previewQuestion,
} from "../model/zap-preview";
import { isZapBusy } from "./run-zap";
import {
  applyDashboardPlan,
  cancelDashboardPlan,
  chooseDashboardOption,
  runDashboardZap,
} from "./run-dashboard-zap";
import { ZapDecisionChip } from "./ZapDecisionChip";
import { ZapStepIcon } from "./ZapStepIcon";

const EXAMPLES = [
  "Add a chart of tree cover loss since 2015",
  "Add a map of tree cover loss due to fires",
  "Add the analysis of forest loss and its drivers",
  "Add recent Sentinel-2 imagery with less than 10% clouds",
  "Add a section called Fire season",
];

/**
 * Sends a selected option: with `choose` when the decision and the option
 * have ids (a dashboard edit), else its label as a new request.
 */
function selectOption(
  row: ZapDashboardRow,
  decision: ZapDecision,
  option: ZapDecisionOption,
  dashboardId: string,
  fromPreview: boolean
): void {
  if (decision.key && option.value) {
    void chooseDashboardOption(row.id, decision.key, option.value, fromPreview);
  } else {
    void runDashboardZap(option.label, dashboardId);
  }
}

/**
 * The preview of a plan that waits for a confirmation: what will change, a
 * warning when it cannot be taken back, the decisions to check with their
 * options as chips, and Apply and Cancel. A click on a chip selects that
 * option and applies the edit.
 */
function ZapPreview({
  row,
  busy,
  dashboardId,
}: {
  row: ZapDashboardRow;
  busy: boolean;
  dashboardId: string;
}) {
  const { plan } = row;
  const asks = previewDecisions(plan);
  const unsure = plan.decisions.some((d) => d.clear === false);
  return (
    <Stack
      gap={2}
      p={2.5}
      rounded="md"
      borderWidth="1px"
      borderColor="border.warning"
      bg="bg.warning"
      aria-label="Zap preview"
    >
      <Text fontWeight="medium">
        {unsure
          ? "Zap is not sure of this edit. Check it before zap applies it."
          : "Check this edit before zap applies it."}
      </Text>
      {dashboardStepsOf(plan).map((step, i) => (
        <Box key={`${row.id}-preview-${i}`}>
          <Text fontSize="sm">{previewText(step)}</Text>
          {step.detail && <Text color="fg.muted">{step.detail}</Text>}
          {affectedWidgets(step).map((label) => (
            <Text key={label} color="fg.muted" pl={2}>
              · {label}
            </Text>
          ))}
        </Box>
      ))}
      {hasDestructiveStep(plan) && (
        <Text color="fg.error" fontWeight="medium">
          Zap has no undo. To get it back, make a new request or use the
          controls of the dashboard.
        </Text>
      )}
      {asks.map((d) => (
        <Flex
          key={`${row.id}-ask-${d.question}`}
          gap={1.5}
          wrap="wrap"
          align="center"
        >
          <Text>{previewQuestion(d, plan)}</Text>
          {(d.options ?? []).map((option) => (
            <Box
              as="button"
              key={option.value ?? option.label}
              aria-disabled={busy}
              onClick={() =>
                !busy && selectOption(row, d, option, dashboardId, true)
              }
              px={2}
              rounded="full"
              borderWidth="1px"
              borderColor="border.emphasized"
              bg="bg"
              cursor={busy ? "default" : "pointer"}
              _hover={busy ? undefined : { borderColor: "primary.solid" }}
            >
              {option.label}
            </Box>
          ))}
        </Flex>
      ))}
      <Flex gap={2}>
        <Button
          size="xs"
          colorPalette="primary"
          disabled={busy}
          onClick={() => void applyDashboardPlan(row.id)}
        >
          Apply
        </Button>
        <Button
          size="xs"
          variant="outline"
          disabled={busy}
          onClick={() => cancelDashboardPlan(row.id)}
        >
          Cancel
        </Button>
      </Flex>
    </Stack>
  );
}

/**
 * The zap popup on a dashboard: examples when the trail is empty; then the
 * trail of edits, and the steps and decisions of the selected row. A plan
 * that needs a confirmation shows a preview (`ZapPreview`). A dashboard edit
 * has no undo: a new request or the page controls take it back.
 */
export function ZapDashboardPanel({ dashboardId }: { dashboardId: string }) {
  const { prompt, status, rows, index, error, open, select, reset } =
    useZapDashboardStore();
  useEffect(() => open(dashboardId), [open, dashboardId]);

  const busy = isZapBusy(status);
  const row = index >= 0 ? rows[index] : undefined;
  const plan = row?.plan;
  const waiting = row?.outcome === "confirm";
  const run = (text: string) => void runDashboardZap(text, dashboardId);

  return (
    <Stack gap={3} px={4} py={3} fontSize="xs" maxH="50vh" overflowY="auto">
      <Flex align="center" gap={1.5} color="fg.muted">
        <LightningIcon size={14} weight="fill" />
        <Text fontWeight="medium">Zap on this dashboard</Text>
        {rows.length > 0 && (
          <Button
            ml="auto"
            size="2xs"
            variant="ghost"
            onClick={reset}
            disabled={busy}
            fontWeight="normal"
          >
            Clear
          </Button>
        )}
      </Flex>

      {rows.length === 0 && status !== "planning" && (
        <>
          <Text color="fg.muted">
            One request adds a chart, a map, an analysis, imagery or a section
            to this dashboard, or moves, resizes, renames, removes or changes
            the period of an item. No conversation. There is no undo: make a new
            request or use the controls of the dashboard.
          </Text>
          <Flex gap={1.5} wrap="wrap">
            {EXAMPLES.map((example) => (
              <Box
                as="button"
                key={example}
                onClick={() => run(example)}
                px={2.5}
                py={1}
                rounded="full"
                borderWidth="1px"
                borderColor="border.emphasized"
                bg="bg"
                cursor="pointer"
                _hover={{ bg: "primary.50", borderColor: "primary.solid" }}
              >
                {example}
              </Box>
            ))}
          </Flex>
        </>
      )}

      {rows.length > 0 && (
        <Stack gap={0.5} aria-label="Zap history of this dashboard">
          {rows.map((r, i) => (
            <Box
              as="button"
              key={r.id}
              onClick={() => select(i)}
              aria-current={i === index ? "step" : undefined}
              textAlign="left"
              px={2}
              py={1}
              rounded="md"
              borderLeftWidth="2px"
              borderColor={i === index ? "primary.solid" : "transparent"}
              bg={i === index ? "primary.50" : undefined}
              cursor="pointer"
              _hover={{ bg: "bg.subtle" }}
            >
              <Flex align="center" gap={1.5}>
                <LightningIcon size={12} weight="fill" />
                <Text truncate fontWeight={i === index ? "medium" : "normal"}>
                  {r.prompt}
                </Text>
              </Flex>
              <Text
                pl={4}
                pt={0.5}
                color={r.outcome === "failed" ? "fg.error" : "fg.muted"}
              >
                {editSummary(r)}
              </Text>
            </Box>
          ))}
        </Stack>
      )}

      {status === "planning" && (
        <Flex align="center" gap={2} color="fg.muted">
          <Spinner size="xs" />
          Planning “{prompt}”…
        </Flex>
      )}

      {row && plan && (
        <Stack gap={2}>
          {/* A waiting plan shows its steps in the preview. */}
          {!waiting &&
            plan.steps.map((step, i) => (
              <Flex key={`${row.id}-${i}`} gap={2} align="flex-start">
                <Box pt="1px">
                  <ZapStepIcon status={row.stepStatus[i] ?? "pending"} />
                </Box>
                <Box>
                  <Text fontSize="sm">{step.title}</Text>
                  <Text color="fg.muted">{step.detail}</Text>
                </Box>
              </Flex>
            ))}
          {waiting && (
            <ZapPreview row={row} busy={busy} dashboardId={dashboardId} />
          )}
          {row.error && <Text color="fg.error">{row.error}</Text>}
          {[...plan.notes, ...row.warnings].map((note) => (
            <Text key={note} color="fg.warning">
              {note}
            </Text>
          ))}
          {plan.decisions.length > 0 && (
            <Stack gap={0.5} pt={1} borderTopWidth="1px" color="fg.subtle">
              {plan.decisions.map((d) => (
                <ZapDecisionChip
                  key={`${row.id}-${d.question}`}
                  decision={d}
                  busy={busy}
                  onSelect={(option) =>
                    selectOption(row, d, option, dashboardId, false)
                  }
                />
              ))}
            </Stack>
          )}
        </Stack>
      )}

      {error && <Text color="fg.error">{error}</Text>}
    </Stack>
  );
}

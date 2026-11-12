"use client";
import {
  Box,
  Button,
  Flex,
  IconButton,
  Spinner,
  Stack,
  Text,
} from "@chakra-ui/react";
import {
  ArrowArcLeftIcon,
  ArrowArcRightIcon,
  CheckCircleIcon,
  CircleIcon,
  LightningIcon,
  MinusCircleIcon,
  XCircleIcon,
} from "@phosphor-icons/react";
import { AnimatePresence, motion } from "framer-motion";

import type { ZapStepStatus } from "../model/zap-plan";
import useZapStore from "../model/zap-store";
import { isZapBusy, redoZap, runZap, undoZap } from "./run-zap";
import { ZapDecisionChip } from "./ZapDecisionChip";
import { ZapTrail } from "./ZapTrail";

const EXAMPLES = [
  "Deforestation in Huelva, Spain since 2015",
  "Fires in Amazonas, Brazil in 2024",
  "Tree cover loss in primary forest in Pará",
  "Disturbance alerts in Central Kalimantan",
  "Land cover in Kenya",
  "Grassland in Mongolia",
];

function StepIcon({ status }: { status: ZapStepStatus }) {
  switch (status) {
    case "running":
      return <Spinner size="xs" color="primary.solid" />;
    case "done":
      return (
        <CheckCircleIcon
          size={16}
          weight="fill"
          color="var(--chakra-colors-primary-solid)"
        />
      );
    case "skipped":
      return (
        <MinusCircleIcon size={16} color="var(--chakra-colors-fg-subtle)" />
      );
    case "failed":
      return <XCircleIcon size={16} color="var(--chakra-colors-fg-error)" />;
    default:
      return <CircleIcon size={16} color="var(--chakra-colors-fg-subtle)" />;
  }
}

/**
 * The zap popup: examples when the trail is empty; then the trail of
 * requests with undo and redo, and the steps and decisions of the selected
 * row, each step marked done as it runs.
 */
export function ZapPanel() {
  const { prompt, status, rows, index, error, reset } = useZapStore();
  const busy = isZapBusy(status);
  const row = index >= 0 ? rows[index] : undefined;
  const plan = row?.plan;

  return (
    <Stack gap={3} px={4} py={3} fontSize="xs" maxH="50vh" overflowY="auto">
      <Flex align="center" gap={1.5} color="fg.muted">
        <LightningIcon size={14} weight="fill" />
        <Text fontWeight="medium">Zap</Text>
        {rows.length > 0 && (
          <Flex ml="auto" gap={0.5}>
            <IconButton
              aria-label="Undo"
              title="Undo"
              size="2xs"
              variant="ghost"
              disabled={busy || index < 0}
              onClick={() => void undoZap()}
            >
              <ArrowArcLeftIcon />
            </IconButton>
            <IconButton
              aria-label="Redo"
              title="Redo"
              size="2xs"
              variant="ghost"
              disabled={busy || index >= rows.length - 1}
              onClick={() => void redoZap()}
            >
              <ArrowArcRightIcon />
            </IconButton>
            <Button
              size="2xs"
              variant="ghost"
              onClick={reset}
              disabled={busy}
              fontWeight="normal"
            >
              Clear
            </Button>
          </Flex>
        )}
      </Flex>

      {rows.length === 0 && status !== "planning" && (
        <>
          <Text color="fg.muted">
            One request, straight to the map: the dataset, the area and its
            charts. No conversation.
          </Text>
          <Flex gap={1.5} wrap="wrap">
            {EXAMPLES.map((example) => (
              <Box
                as="button"
                key={example}
                onClick={() => void runZap(example)}
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

      <ZapTrail />

      {status === "planning" && (
        <Flex align="center" gap={2} color="fg.muted">
          <Spinner size="xs" />
          Planning “{prompt}”…
        </Flex>
      )}

      {row && plan && (
        <Stack gap={2}>
          <AnimatePresence initial={true}>
            {plan.steps.map((step, i) => (
              <motion.div
                key={`${row.id}-${step.kind}-${i}`}
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.18, delay: i * 0.08 }}
              >
                <Flex gap={2} align="flex-start">
                  <Box pt="1px">
                    <StepIcon status={row.stepStatus[i] ?? "pending"} />
                  </Box>
                  <Box>
                    <Text
                      fontSize="sm"
                      color={
                        row.stepStatus[i] === "skipped" ? "fg.subtle" : "fg"
                      }
                    >
                      {step.title}
                    </Text>
                    <Text color="fg.muted">
                      {row.stepStatus[i] === "skipped"
                        ? "No chart for this area type"
                        : step.detail}
                    </Text>
                  </Box>
                </Flex>
              </motion.div>
            ))}
          </AnimatePresence>
          {plan.steps.length === 0 && (
            <Text color="fg.muted">
              Nothing to change on the map. Name a topic or a place, e.g. “fires
              in Bolivia”.
            </Text>
          )}
          {plan.notes.map((note) => (
            <Text key={note} color="fg.warning">
              {note}
            </Text>
          ))}
          <Stack gap={0.5} pt={1} borderTopWidth="1px" color="fg.subtle">
            {plan.decisions.map((d) => (
              <ZapDecisionChip key={d.question} decision={d} />
            ))}
          </Stack>
        </Stack>
      )}

      {error && <Text color="fg.error">{error}</Text>}
    </Stack>
  );
}

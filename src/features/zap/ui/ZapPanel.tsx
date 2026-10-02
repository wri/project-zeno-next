"use client";
import { Box, Button, Flex, Spinner, Stack, Text } from "@chakra-ui/react";
import {
  CheckCircleIcon,
  CircleIcon,
  LightningIcon,
  MinusCircleIcon,
  XCircleIcon,
} from "@phosphor-icons/react";
import { AnimatePresence, motion } from "framer-motion";

import type { ZapStepStatus } from "../model/zap-plan";
import useZapStore from "../model/zap-store";
import { runZap } from "./run-zap";

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
 * The zap popup: examples when idle, then the plan (jev's decisions as
 * steps), each step marked done as it runs.
 */
export function ZapPanel() {
  const { prompt, status, plan, stepStatus, error, reset } = useZapStore();
  const busy = status === "planning" || status === "running";

  return (
    <Stack gap={3} px={4} py={3} fontSize="xs" maxH="50vh" overflowY="auto">
      <Flex align="center" gap={1.5} color="fg.muted">
        <LightningIcon size={14} weight="fill" />
        <Text fontWeight="medium">Zap</Text>
        {status !== "idle" && !busy && (
          <Button
            size="2xs"
            variant="ghost"
            ml="auto"
            onClick={reset}
            fontWeight="normal"
          >
            Clear
          </Button>
        )}
      </Flex>

      {status === "idle" && (
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

      {status !== "idle" && (
        <Text fontSize="sm" fontWeight="medium">
          “{prompt}”
        </Text>
      )}

      {status === "planning" && (
        <Flex align="center" gap={2} color="fg.muted">
          <Spinner size="xs" />
          Planning…
        </Flex>
      )}

      {plan && (
        <Stack gap={2}>
          <AnimatePresence initial={true}>
            {plan.steps.map((step, i) => (
              <motion.div
                key={`${step.kind}-${i}`}
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.18, delay: i * 0.08 }}
              >
                <Flex gap={2} align="flex-start">
                  <Box pt="1px">
                    <StepIcon status={stepStatus[i] ?? "pending"} />
                  </Box>
                  <Box>
                    <Text
                      fontSize="sm"
                      color={stepStatus[i] === "skipped" ? "fg.subtle" : "fg"}
                    >
                      {step.title}
                    </Text>
                    <Text color="fg.muted">
                      {stepStatus[i] === "skipped"
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
              <Flex key={d.question} gap={2}>
                <Text w="20" flexShrink={0}>
                  {d.question}
                </Text>
                <Text truncate flex="1">
                  {d.label}
                </Text>
                <Text>{Math.round(d.probability * 100)}%</Text>
              </Flex>
            ))}
          </Stack>
        </Stack>
      )}

      {error && <Text color="fg.error">{error}</Text>}
    </Stack>
  );
}

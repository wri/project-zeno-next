"use client";
import { useState, useEffect } from "react";
import {
  Box,
  Flex,
  Text,
  Heading,
  IconButton,
  Button,
  useDisclosure,
} from "@chakra-ui/react";
import {
  SparkleIcon,
  ArrowArcLeftIcon,
  ArrowArcRightIcon,
} from "@phosphor-icons/react";
import Markdown from "react-markdown";
import remarkBreaks from "remark-breaks";
import useInsightStore from "@/app/store/insightStore";
import WidgetMessage from "./WidgetMessage";
import InsightProvenanceDrawer from "./InsightProvenanceDrawer";
import AnalysisParametersToggle, {
  AnalysisParamsChips,
} from "./widgets/AnalysisParameters";
import { buildChips } from "./widgets/analysis-params-utils";

export default function InsightWorkspace() {
  const { insights } = useInsightStore();
  const [currentIndex, setCurrentIndex] = useState(0);
  const { open, onOpen, onClose } = useDisclosure();
  const [paramsExpanded, setParamsExpanded] = useState(false);

  useEffect(() => {
    setCurrentIndex(0);
  }, [insights.length]);

  const total = insights.length;
  if (total === 0) return null;

  // currentIndex 0 = newest, total-1 = oldest
  const widget = insights[total - 1 - currentIndex];
  const chips = widget.analysisParams ? buildChips(widget.analysisParams) : [];
  const hasChips = chips.length > 0;
  const canGoPrev = currentIndex < total - 1;
  const canGoNext = currentIndex > 0;

  return (
    <Box
      position="absolute"
      top={4}
      right={4}
      w="420px"
      maxH="calc(100vh - 6rem)"
      overflowY="auto"
      zIndex={400}
      bg="primary.25"
      border="2px solid"
      borderColor="primary.solid"
      borderRadius="md"
      boxShadow="0 4px 20px -4px {colors.primary.solid/40}"
      pointerEvents="all"
    >
      {/* Title row */}
      <Flex px={4} pt={3} pb={2} justify="space-between" align="flex-start">
        <Heading
          size="sm"
          fontWeight="semibold"
          color="#172B7A"
          flex={1}
          mr={2}
          mb={0}
        >
          {widget.title}
        </Heading>
        {total > 1 && (
          <Flex gap={1} flexShrink={0}>
            <IconButton
              size="xs"
              variant="ghost"
              aria-label="Previous insight"
              border="1px solid #E0E2E5"
              disabled={!canGoPrev}
              onClick={() => setCurrentIndex((i) => i + 1)}
            >
              <ArrowArcLeftIcon size={14} />
            </IconButton>
            <IconButton
              size="xs"
              variant="ghost"
              aria-label="Next insight"
              disabled={!canGoNext}
              border="1px solid #E0E2E5"
              onClick={() => setCurrentIndex((i) => i - 1)}
            >
              <ArrowArcRightIcon size={14} />
            </IconButton>
          </Flex>
        )}
      </Flex>

      {/* Sub-header row */}
      <Flex
        px={4}
        justify="space-between"
        align="center"
        borderBottom="1px dashed"
        borderColor="border"
      >
        <Flex align="center" gap={1.5}>
          <SparkleIcon size={12} weight="fill" />
          <Text
            fontSize="10px"
            fontFamily="mono"
            textTransform="uppercase"
            letterSpacing="wider"
            color="fg.muted"
          >
            AI-Assisted Analysis
          </Text>
        </Flex>
        {hasChips && (
          <AnalysisParametersToggle
            expanded={paramsExpanded}
            onToggle={() => setParamsExpanded((v) => !v)}
          />
        )}
        {/* {widget.generation && (
          <Button
            size="xs"
            variant="ghost"
            color="fg.muted"
            h={5}
            px={1}
            fontWeight="normal"
            textDecoration="underline"
            onClick={onOpen}
          >
            Parameters
          </Button>
        )} */}
      </Flex>

      {/* Inner chart card */}
      <Box px={2} pb={3} pt={1}>
        {hasChips && paramsExpanded && <AnalysisParamsChips chips={chips} />}
        <WidgetMessage widget={widget} inWorkspace />
      </Box>

      <InsightProvenanceDrawer
        isOpen={open}
        onClose={onClose}
        generation={widget.generation}
        title="Parameters"
      />
    </Box>
  );
}

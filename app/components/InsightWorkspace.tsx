"use client";
import { useState, useEffect } from "react";
import { Box, Flex, Text, Heading, IconButton, Link } from "@chakra-ui/react";
import {
  CaretDownIcon,
  CaretUpIcon,
  ArrowArcLeftIcon,
  ArrowArcRightIcon,
} from "@phosphor-icons/react";
import useInsightStore from "@/app/store/insightStore";
import WidgetMessage from "./WidgetMessage";
import { WidgetIcons } from "@/app/ChatPanelHeader";
import AnalysisParametersToggle, {
  AnalysisParamsChips,
} from "./widgets/AnalysisParameters";
import { buildChips } from "./widgets/analysis-params-utils";

export default function InsightWorkspace() {
  const { insights } = useInsightStore();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isCollapsed, setIsCollapsed] = useState(false);
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
      right={3}
      zIndex={400}
      pointerEvents="none"
    >
      {/* Panel */}
      <Box
        w="420px"
        maxH="calc(100vh - 6rem)"
        overflowY="auto"
        bg="primary.25"
        border="1px solid"
        borderColor="#DDE2F5"
        borderRadius="md"
        boxShadow="0 4px 20px -4px {colors.primary.solid/40}"
        pointerEvents="all"
      >
        {/* Header row */}
        <Flex
          px={4}
          py={2}
          justify="space-between"
          align="center"
          borderBottom="1px solid"
          borderColor="#DDE2F5"
        >
          <Flex align="center" gap={1.5} flexWrap="nowrap" overflow="hidden">
            {WidgetIcons[widget.type]}
            <Text
              fontSize="10px"
              fontFamily="mono"
              textTransform="uppercase"
              letterSpacing="wider"
              color="fg.muted"
              whiteSpace="nowrap"
            >
              AI-Assisted Analysis{" · "}
              <Link
                href="https://help.globalnaturewatch.org"
                target="_blank"
                rel="noopener noreferrer"
                fontSize="10px"
                fontFamily="mono"
                textDecoration="underline"
                textTransform="none"
              >
                learn more
              </Link>
            </Text>
          </Flex>
          <IconButton
            size="xs"
            variant="ghost"
            aria-label={isCollapsed ? "Expand insight" : "Collapse insight"}
            flexShrink={0}
            onClick={() => setIsCollapsed((v) => !v)}
          >
            {isCollapsed ? (
              <CaretDownIcon size={14} />
            ) : (
              <CaretUpIcon size={14} />
            )}
          </IconButton>
        </Flex>

        {!isCollapsed && (
          <>
            {/* Title row */}
            <Flex
              px={4}
              pt={3}
              pb={2}
              justify="space-between"
              align="flex-start"
              borderBottom="1px solid"
              borderColor="#DDE2F5"
            >
              <Heading
                size="sm"
                fontWeight="semibold"
                color="primary.fg"
                flex={1}
                mr={2}
                mb={0}
              >
                {widget.title}
              </Heading>
              {hasChips && (
                <AnalysisParametersToggle
                  expanded={paramsExpanded}
                  onToggle={() => setParamsExpanded((v) => !v)}
                />
              )}
            </Flex>

            {/* Params chips section */}
            {hasChips && paramsExpanded && (
              <Box px={4} py={2} borderBottom="1px solid" borderColor="#DDE2F5">
                <AnalysisParamsChips chips={chips} />
              </Box>
            )}

            {/* Inner chart card */}
            <Box px={2} py={2}>
              <WidgetMessage widget={widget} inWorkspace />
            </Box>

            {/* Navigation footer */}
            {total > 1 && (
              <Flex
                px={4}
                py={2}
                borderTop="1px solid"
                borderColor="#DDE2F5"
                justify="space-between"
                align="center"
              >
                <IconButton
                  size="xs"
                  variant="ghost"
                  border="1px solid"
                  borderColor="border.emphasized"
                  aria-label="Previous insight"
                  disabled={!canGoPrev}
                  onClick={() => setCurrentIndex((i) => i + 1)}
                >
                  <ArrowArcLeftIcon size={14} />
                </IconButton>
                <Text fontSize="xs" color="neutral.500">
                  {currentIndex + 1} of {total} available analyses
                </Text>
                <IconButton
                  size="xs"
                  variant="ghost"
                  border="1px solid"
                  borderColor="border.emphasized"
                  aria-label="Next insight"
                  disabled={!canGoNext}
                  onClick={() => setCurrentIndex((i) => i - 1)}
                >
                  <ArrowArcRightIcon size={14} />
                </IconButton>
              </Flex>
            )}
          </>
        )}
      </Box>
    </Box>
  );
}

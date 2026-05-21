"use client";
import { useState, useEffect } from "react";
import { Box, Flex, Text, Heading, IconButton } from "@chakra-ui/react";
import {
  CaretDownIcon,
  CaretUpIcon,
  ArrowArcLeftIcon,
  ArrowArcRightIcon,
} from "@phosphor-icons/react";
import useInsightStore from "@/app/store/insightStore";
import WidgetMessage from "./WidgetMessage";
import { Tooltip } from "./ui/tooltip";
import { WidgetIconComponent } from "@/app/utils/widgetIcons";
import AnalysisParametersToggle, {
  AnalysisParamsChips,
} from "./widgets/AnalysisParameters";
import { buildChips } from "./widgets/analysis-params-utils";

const AI_DISCLAIMER =
  "This visualization includes AI-generated charts and data summaries. AI models may produce incomplete or incorrect information. Please verify all outputs before using them in your work.";

const aiDisclaimerTooltip = (
  <Box display="flex" flexDirection="column" gap="2px" maxW="296px">
    <Text
      fontFamily="body"
      fontSize="12px"
      lineHeight="150%"
      fontWeight="medium"
      color="#FFFFFF"
    >
      AI-Assisted Analysis
    </Text>
    <Text
      fontFamily="body"
      fontSize="12px"
      lineHeight="150%"
      fontWeight="normal"
      color="#B2B6BD"
    >
      {AI_DISCLAIMER}
    </Text>
  </Box>
);

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
  const HeaderIcon = WidgetIconComponent[widget.type];

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
        rounded="4px"
        pointerEvents="all"
        display="flex"
        flexDirection="column"
      >
        {/* Header row — 28px section header */}
        <Flex
          h="28px"
          px="16px"
          py="6px"
          gap="8px"
          justify="space-between"
          align="center"
          borderBottom="1px solid"
          borderColor="#DDE2F5"
        >
          <Flex
            align="center"
            gap="8px"
            h="16px"
            flexWrap="nowrap"
            overflow="hidden"
          >
            <HeaderIcon size={12} color="#0049AA" />
            <Text
              fontSize="10px"
              fontFamily="mono"
              fontWeight="normal"
              lineHeight="16px"
              letterSpacing="0.03em"
              color="fg.muted"
              whiteSpace="nowrap"
            >
              AI-Assisted Analysis
              {" · "}
              <Tooltip
                variant="dark"
                content={aiDisclaimerTooltip}
                showArrow
                positioning={{ placement: "bottom" }}
                openDelay={100}
                closeDelay={100}
              >
                <Box
                  as="span"
                  color="#4A64CB"
                  textDecoration="underline"
                  cursor="help"
                  tabIndex={0}
                  aria-label="Learn more about AI-Assisted Analysis"
                >
                  learn more
                </Box>
              </Tooltip>
            </Text>
          </Flex>
          <IconButton
            size="2xs"
            variant="ghost"
            h="16px"
            minW="16px"
            w="16px"
            color="#656E7B"
            aria-label={isCollapsed ? "Expand insight" : "Collapse insight"}
            flexShrink={0}
            onClick={() => setIsCollapsed((v) => !v)}
          >
            {isCollapsed ? (
              <CaretDownIcon size={12} weight="bold" />
            ) : (
              <CaretUpIcon size={12} weight="bold" />
            )}
          </IconButton>
        </Flex>

        {!isCollapsed && (
          <>
            {/* Title row */}
            <Flex
              px={4}
              py={1}
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

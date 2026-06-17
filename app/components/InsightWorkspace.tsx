"use client";
import { useState, useEffect } from "react";
import { Box, Flex, Text, Heading, IconButton } from "@chakra-ui/react";
import {
  CaretDownIcon,
  CaretUpIcon,
  ArrowArcLeftIcon,
  ArrowArcRightIcon,
  SpinnerGapIcon,
} from "@phosphor-icons/react";
import useInsightStore from "@/app/store/insightStore";
import useChatStore from "@/app/store/chatStore";
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
      AI-ASSISTED ANALYSIS
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
  const isLoading = useChatStore((state) => state.isLoading);
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
  // currentIndex 0 = newest (shown as "1 of N"). The Left/Prev arrow
  // disables at 1/N; Right/Next advances through the stack to older entries.
  const canGoPrev = currentIndex > 0;
  const canGoNext = currentIndex < total - 1;
  const HeaderIcon = WidgetIconComponent[widget.type];

  return (
    /* Card is the scroll container: grows to content, scrolls when flex-shrunk */
    <Box
      flex="0 1 auto"
      minH="0"
      overflowY="auto"
      w="100%"
      bg="primary.25"
      border="1px solid"
      borderColor="#DDE2F5"
      rounded="4px"
      pointerEvents="all"
      display="flex"
      flexDirection="column"
    >
      {/* Header — sticky so it never scrolls away */}
      <Flex
        position="sticky"
        top={0}
        zIndex={1}
        bg="primary.25"
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
            AI-ASSISTED ANALYSIS
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
        <Flex align="center" gap="8px" flexShrink={0}>
          {isLoading && (
            <Flex align="center" gap="4px">
              <Box
                animation="spin 1s infinite"
                animationTimingFunction="steps(8, end)"
              >
                <SpinnerGapIcon
                  size={12}
                  color="var(--chakra-colors-fg-muted)"
                />
              </Box>
              <Text
                fontSize="10px"
                fontFamily="mono"
                lineHeight="16px"
                letterSpacing="0.03em"
                color="fg.muted"
                whiteSpace="nowrap"
              >
                INSIGHTS LOADING
              </Text>
            </Flex>
          )}
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

          {/* Navigation footer — sticky so it never scrolls away */}
          {total > 1 && (
            <Flex
              position="sticky"
              bottom={0}
              zIndex={1}
              bg="primary.25"
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
                onClick={() => setCurrentIndex((i) => i - 1)}
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
                onClick={() => setCurrentIndex((i) => i + 1)}
              >
                <ArrowArcRightIcon size={14} />
              </IconButton>
            </Flex>
          )}
        </>
      )}
    </Box>
  );
}

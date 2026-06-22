"use client";
import { useState, useEffect } from "react";
import {
  Box,
  Flex,
  Text,
  Heading,
  IconButton,
  Skeleton,
  SkeletonText,
  Progress,
} from "@chakra-ui/react";
import {
  CaretDownIcon,
  CaretUpIcon,
  ArrowArcLeftIcon,
  ArrowArcRightIcon,
  SpinnerGapIcon,
  ChartLineIcon,
} from "@phosphor-icons/react";
import useInsightStore from "@/app/store/insightStore";
import useChatStore from "@/app/store/chatStore";
import WidgetMessage from "./WidgetMessage";
import { Tooltip } from "./ui/tooltip";
import AnalysisParametersToggle, {
  AnalysisParamsChips,
} from "./widgets/AnalysisParameters";
import { buildChips } from "./widgets/analysis-params-utils";

/**
 * Placeholder shown while the very first analysis is generating (no chart in
 * the store yet). Mirrors the real card's layout — indeterminate top bar,
 * title, summary lines, toolbar, chart body and nav — so the panel doesn't
 * jump when the chart replaces it.
 */
function WorkspaceSkeleton() {
  return (
    <Box
      flex="0 1 auto"
      minH="0"
      overflowY="auto"
      w="100%"
      bg="bg.panel"
      border="1px solid"
      borderColor="#DDE2F5"
      rounded="4px"
      pointerEvents="all"
      display="flex"
      flexDirection="column"
      overflow="hidden"
      // Lighten the skeleton tiling to the neutral palette (the default
      // bg.muted→bg.emphasized gradient reads too dark against the white card).
      css={{
        "& .chakra-skeleton": {
          "--start-color": "colors.neutral.200",
          "--end-color": "colors.neutral.300",
        },
      }}
    >
      {/* Indeterminate loading bar pinned to the top edge */}
      <Progress.Root value={null} size="xs" colorPalette="primary">
        <Progress.Track bg="transparent" h="3px">
          <Progress.Range />
        </Progress.Track>
      </Progress.Root>

      {/* Title placeholder */}
      <Box px={4} pt={4} pb={2}>
        <Skeleton h="16px" w="55%" rounded="sm" />
      </Box>

      {/* Summary lines placeholder */}
      <Box px={4} pb={3}>
        <SkeletonText noOfLines={2} gap="3" />
      </Box>

      {/* Toolbar placeholder — segmented toggle + full-screen button */}
      <Flex px={4} pb={3} gap={3} align="center">
        <Flex gap={0}>
          <Skeleton h="24px" w="64px" roundedLeft="md" />
          <Skeleton h="24px" w="64px" roundedRight="md" />
        </Flex>
        <Skeleton h="24px" w="150px" rounded="md" />
      </Flex>

      <Box borderTop="1px solid" borderColor="#DDE2F5" />

      {/* Chart body placeholder */}
      <Box px={4} py={3}>
        <Skeleton h="320px" w="100%" rounded="md" />
      </Box>

      {/* Nav footer placeholder */}
      <Flex px={4} py={2} justify="space-between" align="center">
        <Skeleton boxSize="32px" rounded="md" />
        <Skeleton boxSize="32px" rounded="md" />
      </Flex>
    </Box>
  );
}

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
  // First analysis still generating: no chart to show yet, so present a
  // skeleton card instead of an empty gap. Once a chart lands (total > 0),
  // the normal card renders and the header "INSIGHTS LOADING" indicator
  // covers any subsequent regeneration.
  if (total === 0) {
    if (!isLoading) return null;
    return <WorkspaceSkeleton />;
  }

  // currentIndex 0 = newest, total-1 = oldest
  const widgetIndex = total - 1 - currentIndex;
  const widget = insights[widgetIndex];
  const chips = widget.analysisParams ? buildChips(widget.analysisParams) : [];
  const hasChips = chips.length > 0;
  // currentIndex 0 = newest (shown as "1 of N"). The Left/Prev arrow
  // disables at 1/N; Right/Next advances through the stack to older entries.
  const canGoPrev = currentIndex > 0;
  const canGoNext = currentIndex < total - 1;

  // Arrow keys page through insights while focus is anywhere in the card,
  // mirroring the prev/next buttons. Charts/menus don't consume arrows, so
  // this doesn't conflict with inner widgets.
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (total <= 1) return;
    if (e.key === "ArrowLeft" && canGoPrev) {
      e.preventDefault();
      setCurrentIndex((i) => i - 1);
    } else if (e.key === "ArrowRight" && canGoNext) {
      e.preventDefault();
      setCurrentIndex((i) => i + 1);
    }
  };

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
      onKeyDown={handleKeyDown}
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
          <ChartLineIcon size={12} color="#0049AA" weight="thin" />
          <Text
            fontSize="10px"
            fontFamily="mono"
            fontWeight="normal"
            lineHeight="16px"
            letterSpacing="0.03em"
            color="fg.muted"
            whiteSpace="nowrap"
          >
            ANALYSIS
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
          {/* Keyed on the active insight so switching re-runs the entry
              animation; the media query keeps it off under reduced motion. */}
          <Box
            key={widget.id ?? widgetIndex}
            css={{
              "@media (prefers-reduced-motion: no-preference)": {
                animationName: "fadeSlideIn",
                animationDuration: "240ms",
                animationTimingFunction: "ease-out",
              },
            }}
          >
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
              <Tooltip content="Previous insight (←)" openDelay={400}>
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
              </Tooltip>
              <Text
                fontSize="xs"
                color="neutral.500"
                aria-live="polite"
                css={{ fontVariantNumeric: "tabular-nums" }}
              >
                {currentIndex + 1} of {total} available analyses
              </Text>
              <Tooltip content="Next insight (→)" openDelay={400}>
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
              </Tooltip>
            </Flex>
          )}
        </>
      )}
    </Box>
  );
}

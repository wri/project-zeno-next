"use client";
import { useState, useEffect } from "react";
import { Box, Flex, Text, IconButton, Link, Separator } from "@chakra-ui/react";
import {
  CaretDownIcon,
  CaretUpIcon,
  ArrowLeftIcon,
  ArrowRightIcon,
} from "@phosphor-icons/react";
import useInsightStore from "@/app/store/insightStore";
import WidgetMessage from "./WidgetMessage";

export default function InsightWorkspace() {
  const { insights } = useInsightStore();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isCollapsed, setIsCollapsed] = useState(false);

  // Jump to the most recent insight whenever a new one arrives
  useEffect(() => {
    setCurrentIndex(0);
  }, [insights.length]);

  const total = insights.length;
  if (total === 0) return null;

  // currentIndex 0 = newest, total-1 = oldest
  const widget = insights[total - 1 - currentIndex];
  const canGoPrev = currentIndex < total - 1;
  const canGoNext = currentIndex > 0;

  return (
    <Box
      position="absolute"
      top={4}
      right={4}
      w="380px"
      maxH="calc(100vh - 6rem)"
      overflowY="auto"
      zIndex={400}
      bg="bg"
      border="1px solid"
      borderColor="border"
      borderRadius="md"
      boxShadow="md"
      pointerEvents="all"
    >
      {/* Header */}
      <Flex
        px={3}
        py={2}
        justify="space-between"
        align="center"
        borderBottom="1px solid"
        borderColor="border"
      >
        <Text
          fontSize="xs"
          color="fg.muted"
          textTransform="uppercase"
          letterSpacing="wider"
          fontWeight="medium"
        >
          AI-Assisted Analysis
          {" · "}
          <Link
            href="https://help.globalnaturewatch.org"
            target="_blank"
            rel="noopener noreferrer"
            fontSize="xs"
            color="primary.solid"
            textDecoration="underline"
          >
            learn more
          </Link>
        </Text>
        <IconButton
          size="xs"
          variant="ghost"
          aria-label={isCollapsed ? "Expand insight" : "Collapse insight"}
          onClick={() => setIsCollapsed((prev) => !prev)}
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
          {/* Widget body — reuses WidgetMessage as-is */}
          <WidgetMessage widget={widget} />

          {/* Navigation footer */}
          {total > 1 && (
            <>
              <Separator />
              <Flex px={3} py={2} justify="space-between" align="center">
                <IconButton
                  size="xs"
                  variant="ghost"
                  aria-label="Previous insight"
                  disabled={!canGoPrev}
                  onClick={() => setCurrentIndex((i) => i + 1)}
                >
                  <ArrowLeftIcon size={14} />
                </IconButton>
                <Text fontSize="xs" color="fg.muted">
                  {currentIndex + 1} of {total} available analyses
                </Text>
                <IconButton
                  size="xs"
                  variant="ghost"
                  aria-label="Next insight"
                  disabled={!canGoNext}
                  onClick={() => setCurrentIndex((i) => i - 1)}
                >
                  <ArrowRightIcon size={14} />
                </IconButton>
              </Flex>
            </>
          )}
        </>
      )}
    </Box>
  );
}

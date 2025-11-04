"use client";
import { Box, Button, Flex, Icon, Text } from "@chakra-ui/react";
import { CopyIcon, SparkleIcon } from "@phosphor-icons/react";
import React, { useCallback, useEffect, useRef, useState } from "react";

interface CopySelectionTooltipProps {
  children: React.ReactNode;
  /** Optional: limit tooltip to render only when true */
  enabled?: boolean;
  /** Message shown inside the tooltip */
  notice?: string;
}

/**
 * Wrap content with a listener that surfaces a tooltip when the user selects text.
 * The tooltip includes a notice about AI-generated content and a Copy button
 * that copies the current selection to the clipboard.
 */
export default function CopySelectionTooltip({
  children,
  enabled = true,
  notice = "This is AI-generated text. Please verify before using it in your work.",
}: CopySelectionTooltipProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const tooltipRef = useRef<HTMLDivElement | null>(null);
  const [visible, setVisible] = useState(false);
  const [position, setPosition] = useState<{ top: number; left: number }>({
    top: 0,
    left: 0,
  });

  const isSelectionInside = useCallback(
    (root: HTMLElement, sel: Selection | null) => {
      if (!sel || sel.rangeCount === 0) return false;
      const range = sel.getRangeAt(0);
      const commonAncestor = range.commonAncestorContainer as Node;
      return root.contains(
        commonAncestor.nodeType === Node.ELEMENT_NODE
          ? (commonAncestor as Element)
          : (commonAncestor.parentElement as Element)
      );
    },
    []
  );

  const updateFromSelection = useCallback(() => {
    if (!enabled) return;
    const root = containerRef.current;
    if (!root) return;
    const sel = window.getSelection();
    if (!sel || sel.rangeCount === 0 || sel.isCollapsed) {
      setVisible(false);
      return;
    }
    // Ensure selection is inside our container and not inside inputs/textareas
    if (!isSelectionInside(root, sel)) {
      setVisible(false);
      return;
    }
    const range = sel.getRangeAt(0);
    const rect = range.getBoundingClientRect();
    if (!rect || (rect.width === 0 && rect.height === 0)) {
      setVisible(false);
      return;
    }
    const rootRect = root.getBoundingClientRect();
    const tooltipHeight = tooltipRef.current?.offsetHeight || 0;
    const gap = 8; // space between selection and tooltip
    const top =
      rect.top - rootRect.top - (tooltipHeight > 0 ? tooltipHeight + gap : 48);
    const left = Math.max(0, rect.left - rootRect.left);
    setPosition({ top, left });
    setVisible(true);
  }, [enabled, isSelectionInside]);

  useEffect(() => {
    const onScroll = () => setVisible(false);
    document.addEventListener("selectionchange", updateFromSelection);
    window.addEventListener("scroll", onScroll, true);
    window.addEventListener("resize", onScroll);
    return () => {
      document.removeEventListener("selectionchange", updateFromSelection);
      window.removeEventListener("scroll", onScroll, true);
      window.removeEventListener("resize", onScroll);
    };
  }, [updateFromSelection]);

  const handleCopy = useCallback(async () => {
    const sel = window.getSelection();
    const text = sel?.toString() ?? "";
    if (!text) return;
    try {
      await navigator.clipboard.writeText(text);
      // Hide after copy
      setVisible(false);
    } catch {
      // noop: copying may be blocked; we simply leave the tooltip
    }
  }, []);

  return (
    <Box position="relative" ref={containerRef}>
      {children}
      {enabled && visible && (
        <Box
          position="absolute"
          top={`${position.top}px`}
          left={`${position.left}px`}
          zIndex="tooltip"
          bg="bg"
          color="fg"
          borderRadius="md"
          shadow="md"
          borderWidth="1px"
          borderColor="border"
          maxW={{ base: "calc(100% - 16px)", md: "560px" }}
          p="2.5"
          ref={tooltipRef}
        >
          <Flex align="center" gap="2">
            <Icon as={SparkleIcon} color="fg.muted" />
            <Text fontSize="xs" flex="1">
              {notice}
            </Text>
            <Button
              size="xs"
              onClick={handleCopy}
              colorPalette="primary"
              variant="solid"
              display="inline-flex"
              gap="1"
            >
              <CopyIcon />
              Copy
            </Button>
          </Flex>
        </Box>
      )}
    </Box>
  );
}

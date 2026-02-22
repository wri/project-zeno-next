"use client";
import { Box, Button, Flex, Text, chakra } from "@chakra-ui/react";
import { CopyIcon, SparkleIcon } from "@phosphor-icons/react";
const Sparkle = chakra(SparkleIcon);

import React, { useCallback, useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";

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
  notice,
}: CopySelectionTooltipProps) {
  const t = useTranslations("chat");
  const tc = useTranslations("common");
  const displayNotice = notice ?? t("copyTooltip.notice");
  const containerRef = useRef<HTMLDivElement | null>(null);
  const tooltipRef = useRef<HTMLDivElement | null>(null);
  const [visible, setVisible] = useState(false);
  const [position, setPosition] = useState<{ top: number; left: number }>({
    top: 0,
    left: 0,
  });
  const isTouchingRef = useRef(false);

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
    // Center horizontally within the container; clamp with 8px padding
    const containerWidth = rootRect.width;
    const estimatedWidth = tooltipRef.current?.offsetWidth || 320; // fallback before first paint
    const centeredLeft = Math.max(
      8,
      Math.min(
        containerWidth - estimatedWidth - 8,
        (containerWidth - estimatedWidth) / 2
      )
    );
    setPosition({ top, left: centeredLeft });
    setVisible(true);
    // After first paint, re-center using the actual measured width
    requestAnimationFrame(() => {
      const realWidth = tooltipRef.current?.offsetWidth;
      const currentRoot = containerRef.current;
      if (!realWidth || !currentRoot) return;
      const cw = currentRoot.getBoundingClientRect().width;
      const left = Math.max(
        8,
        Math.min(cw - realWidth - 8, (cw - realWidth) / 2)
      );
      setPosition((prev) => ({ ...prev, left }));
    });
  }, [enabled, isSelectionInside]);

  useEffect(() => {
    const onScroll = () => setVisible(false);
    const onKeyDown = (e: KeyboardEvent) => {
      if (!visible) return;
      if (
        (e.metaKey || e.ctrlKey) &&
        (e.key === "c" || e.key === "C" || e.code === "KeyC")
      ) {
        // Dismiss tooltip but do not interfere with native copy
        const root = containerRef.current;
        const sel = window.getSelection();
        if (root && isSelectionInside(root, sel)) setVisible(false);
      }
    };
    const onTouchStart = (e: TouchEvent) => {
      const target = e.target as Node | null;
      if (
        containerRef.current &&
        target &&
        containerRef.current.contains(target)
      ) {
        isTouchingRef.current = true;
        setVisible(false);
      }
    };
    const onTouchEnd = () => {
      if (!isTouchingRef.current) return;
      isTouchingRef.current = false;
      setTimeout(() => updateFromSelection(), 50);
    };
    document.addEventListener("selectionchange", updateFromSelection);
    window.addEventListener("scroll", onScroll, true);
    window.addEventListener("resize", onScroll);
    document.addEventListener("keydown", onKeyDown, true);
    document.addEventListener("touchstart", onTouchStart, true);
    document.addEventListener("touchend", onTouchEnd, true);
    return () => {
      document.removeEventListener("selectionchange", updateFromSelection);
      window.removeEventListener("scroll", onScroll, true);
      window.removeEventListener("resize", onScroll);
      document.removeEventListener("keydown", onKeyDown, true);
      document.removeEventListener("touchstart", onTouchStart, true);
      document.removeEventListener("touchend", onTouchEnd, true);
    };
  }, [updateFromSelection, isSelectionInside, visible]);

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
    <Box position="relative" ref={containerRef} userSelect="text">
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
            <Sparkle color="secondary.500" weight="fill" />
            <Text fontSize="xs" flex="1">
              {displayNotice}
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
              {tc("buttons.copy")}
            </Button>
          </Flex>
        </Box>
      )}
    </Box>
  );
}

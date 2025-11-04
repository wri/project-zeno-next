"use client";
import { useState, useEffect, RefObject } from "react";
import { useClipboard } from "@chakra-ui/react";
import { sendGAEvent } from "@next/third-parties/google";

export function useSelectionTooltip(containerRef: RefObject<HTMLDivElement | null>) {
  const [selection, setSelection] = useState("");
  const [isTooltipOpen, setTooltipOpen] = useState(false);
  const [tooltipTarget, setTooltipTarget] = useState<DOMRect | null>(null);
  const clipboard = useClipboard({ value: selection });

  const handleMouseUp = () => {
    const selectedText = window.getSelection()?.toString() || "";
    if (selectedText && containerRef.current) {
      setSelection(selectedText);
      setTooltipOpen(true);
      const selection = window.getSelection();
      if (selection && selection.rangeCount > 0) {
        const range = selection.getRangeAt(0);
        const rect = range.getBoundingClientRect();
        const containerRect = containerRef.current.getBoundingClientRect();

        // Calculate position relative to the container
        const relativeTop = rect.top - containerRect.top + containerRef.current.scrollTop;
        const relativeLeft = rect.left - containerRect.left;

        // Create a DOMRect-like object with container-relative coordinates
        const adjustedRect = {
          top: relativeTop,
          left: relativeLeft,
          width: rect.width,
          height: rect.height,
          bottom: relativeTop + rect.height,
          right: relativeLeft + rect.width,
          x: relativeLeft,
          y: relativeTop,
        } as DOMRect;

        setTooltipTarget(adjustedRect);
      }
    } else {
      setTooltipOpen(false);
    }
  };

  const handleCopy = () => {
    clipboard.copy();
    sendGAEvent("event", "response_text_copied", {
      copied_text: selection,
    });
  };

  const onClose = () => {
    setTooltipOpen(false);
  };

  useEffect(() => {
    const handleDocumentCopy = () => {
      if (isTooltipOpen) {
        setTooltipOpen(false);
      }
    };

    document.addEventListener("copy", handleDocumentCopy);

    return () => {
      document.removeEventListener("copy", handleDocumentCopy);
    };
  }, [isTooltipOpen]);

  return {
    isTooltipOpen,
    tooltipTarget,
    handleMouseUp,
    handleCopy,
    onClose,
  };
}

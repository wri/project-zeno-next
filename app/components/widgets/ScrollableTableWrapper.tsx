"use client";
import { useRef, useState, useEffect, useCallback } from "react";
import { Box } from "@chakra-ui/react";

interface ScrollableTableWrapperProps {
  children: React.ReactNode;
}

/**
 * Wraps a table in a horizontally scrollable container that shows
 * gradient fade indicators on the left/right edges when content
 * overflows, giving users a visual cue that they can scroll.
 */
export default function ScrollableTableWrapper({
  children,
}: ScrollableTableWrapperProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  const checkScroll = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    const tolerance = 2; // account for sub-pixel rounding
    setCanScrollLeft(el.scrollLeft > tolerance);
    setCanScrollRight(
      el.scrollLeft + el.clientWidth < el.scrollWidth - tolerance
    );
  }, []);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;

    checkScroll();

    el.addEventListener("scroll", checkScroll, { passive: true });
    const observer = new ResizeObserver(checkScroll);
    observer.observe(el);

    return () => {
      el.removeEventListener("scroll", checkScroll);
      observer.disconnect();
    };
  }, [checkScroll]);

  return (
    <Box position="relative" maxW="100%">
      {/* Left fade */}
      {canScrollLeft && (
        <Box
          position="absolute"
          left={0}
          top={0}
          bottom={0}
          w="32px"
          zIndex={1}
          pointerEvents="none"
          bgGradient="to-r"
          gradientFrom="bg"
          gradientTo="transparent"
        />
      )}
      {/* Right fade */}
      {canScrollRight && (
        <Box
          position="absolute"
          right={0}
          top={0}
          bottom={0}
          w="32px"
          zIndex={1}
          pointerEvents="none"
          bgGradient="to-l"
          gradientFrom="bg"
          gradientTo="transparent"
        />
      )}
      <Box ref={scrollRef} overflowX="auto" maxW="100%">
        {children}
      </Box>
    </Box>
  );
}

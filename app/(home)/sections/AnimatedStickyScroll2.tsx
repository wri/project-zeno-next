"use client";

import React, { useRef, useEffect, useState } from "react";
import { Box, Flex } from "@chakra-ui/react";
import { motion, useScroll, useTransform } from "framer-motion";

const MotionBox = motion(Box);

interface StickyScrollSection {
  textContent: React.ReactNode;
  imageContent: React.ReactNode;
}

interface AnimatedStickyScrollProps {
  sections: StickyScrollSection[];
}

export const AnimatedStickyScroll: React.FC<AnimatedStickyScrollProps> = ({ sections }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [activeSection, setActiveSection] = useState(0);

  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start start", "end end"],
  });

  useEffect(() => {
    return scrollYProgress.on("change", (latest) => {
      const sectionHeight = 1 / sections.length;
      const currentSection = Math.min(
        Math.floor(latest / sectionHeight),
        sections.length - 1
      );
      setActiveSection(currentSection);
    });
  }, [scrollYProgress, sections.length]);

  // Calculate opacity for each text section with better replacement effect
  const getTextOpacity = (sectionIndex: number) => {
    return useTransform(scrollYProgress, (latest) => {
      const totalNonLastSections = sections.length - 1; // Exclude last section
      const sectionHeight = 1 / totalNonLastSections;
      const sectionStart = sectionIndex * sectionHeight;
      const sectionEnd = (sectionIndex + 1) * sectionHeight;
      const fadeRange = sectionHeight * 0.15; // 15% of section for fade

      if (latest < sectionStart) {
        return 0;
      } else if (latest < sectionStart + fadeRange) {
        // Fade in quickly
        return (latest - sectionStart) / fadeRange;
      } else if (latest < sectionEnd - fadeRange) {
        // Fully visible
        return 1;
      } else if (latest < sectionEnd) {
        // Fade out quickly
        return (sectionEnd - latest) / fadeRange;
      } else {
        return 0;
      }
    });
  };

  return (
    <Box position="relative">
      {/* Fixed text container */}
      <Box
        position="fixed"
        top="50%"
        // left={{ base: "20px", md: "max(50px, calc((100vw - 1200px) / 2))" }}
        transform="translateY(-50%)"
        width={{ base: "calc(100vw - 40px)", md: "415px" }}
        maxWidth="lg"
        zIndex={10}
        pointerEvents="none"
      >
        {sections.slice(0, -1).map((section, index) => (
          <MotionBox
            key={index}
            position="absolute"
            top={0}
            left={0}
            width="100%"
            style={{ opacity: getTextOpacity(index) }}
          >
            {section.textContent}
          </MotionBox>
        ))}
      </Box>

      {/* Scrolling images container */}
      <Box ref={containerRef} position="relative">
        {sections.map((section, index) => (
          <ScrollingImageSection
            key={index}
            imageContent={section.imageContent}
            textContent={index === sections.length - 1 ? section.textContent : null}
            sectionIndex={index}
            totalSections={sections.length}
            isLast={index === sections.length - 1}
          />
        ))}
      </Box>
    </Box>
  );
};

interface ScrollingImageSectionProps {
  imageContent: React.ReactNode;
  textContent?: React.ReactNode;
  sectionIndex: number;
  totalSections: number;
  isLast: boolean;
}

const ScrollingImageSection: React.FC<ScrollingImageSectionProps> = ({
  imageContent,
  textContent,
  sectionIndex,
  isLast,
}) => {
  const sectionRef = useRef<HTMLDivElement>(null);
  const isFirst = sectionIndex === 0;

  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ["start end", "end start"],
  });

  // Image opacity based on position
  const imageOpacity = useTransform(
    scrollYProgress,
    [0, 0.3, 0.5, 0.7, 1],
    isFirst
      ? [1, 1, 1, 0.5, 0.1] // First image: fully visible until center, then fades
      : [0.1, 0.5, 1, 0.5, 0.1] // Other images: fade in/out around center
  );

  // Text opacity for last section (scrolls up naturally)
  const lastTextOpacity = useTransform(
    scrollYProgress,
    [0, 0.2, 0.8, 1],
    [0, 1, 1, 1]
  );

  return (
    <Flex
      ref={sectionRef}
      height="50vh"
      alignItems="center"
      gap={{ base: "10", md: "16" }}
      flexDir={{ base: "column-reverse", md: "row" }}
      position="relative"
      px={{ base: 4, md: 8 }}
    >
      {/* Last section text that scrolls */}
      {isLast && textContent && (
        <MotionBox
          maxW="lg"
          width={{ base: "100%", md: "auto" }}
          style={{ opacity: lastTextOpacity }}
        >
          {textContent}
        </MotionBox>
      )}

      {/* Image content */}
      <MotionBox
        width={{ base: "100%", md: "50%" }}
        height="72"
        position="relative"
        ml={isLast ? { base: 0, md: "auto" } : "auto"}
        style={{ opacity: imageOpacity }}
      >
        {imageContent}
      </MotionBox>
    </Flex>
  );
};


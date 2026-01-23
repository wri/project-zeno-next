"use client";

import React, { useRef, useEffect, useState } from "react";
import { Box, Flex } from "@chakra-ui/react";
import { motion, useScroll, useTransform } from "framer-motion";

const MotionBox = motion(Box);

export const AnimatedSection = ({
  children,
  isFirst = false,
  isLast = false,
}: {
  children: React.ReactNode;
  isFirst?: boolean;
  isLast?: boolean;
} ) => {
  const ref = useRef(null);
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start end", "end start"], 
  });

  const imageOpacity = useTransform(
    scrollYProgress,
    [0, 0.5, 1],
    [isLast ? 1 : 0.1, 1, isFirst ? 1 : 0.1]
  );
  const textOpacity = useTransform(
    scrollYProgress,
    [0, 0.5, 1],
    [isLast ? 1 : 0, 1, isFirst ? 1 : 0]
  );

  const [isTextAbsolute, setIsTextAbsolute] = useState(false);

  useEffect(() => {
    return scrollYProgress.on("change", (latest) => {
      if (isFirst) {
        setIsTextAbsolute(latest >= 0.5);
      } else if (isLast) {
        setIsTextAbsolute(latest <= 0.5);
      } else {
        setIsTextAbsolute(latest > 0.25 && latest < 0.75);
      }
    });
  }, [scrollYProgress, isFirst, isLast]);

  const textContainerStyles = isTextAbsolute
    ? {
        position: "fixed", 
        top: "50%",
        transform: "translateY(-50%)",
        width: { base: "90%", md: "415px" },
      }
    : {
        position: "relative",
        width: { base: "100%", md: "auto" },
      };
  const [leftText, rightImage] = React.Children.toArray(children);

  return (
    <Flex
      ref={ref}
      h="110vh"
      align="center"
      justify="space-between"
      pos="relative"
    >
      <MotionBox css={textContainerStyles} style={{ opacity: textOpacity }}>
        {leftText}
      </MotionBox>
      <MotionBox
        w={{ base: "100%", md: "50%" }}
        ml="auto"
        style={{ opacity: imageOpacity }}
      >
        {rightImage}
      </MotionBox>
    </Flex>
  );
};

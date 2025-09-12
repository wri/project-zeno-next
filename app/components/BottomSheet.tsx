"use client";

import React, { useEffect, useState, useMemo } from "react";
import { motion, useAnimation, PanInfo } from "framer-motion";
import { Box, Flex, chakra } from "@chakra-ui/react";

const MotionBox = chakra(motion.div);

interface DraggableBottomSheetProps {
  children: React.ReactNode;
  // The onHeightChange prop is now optional.
  onHeightChange?: (height: number) => void;
}

export default function DraggableBottomSheet({
  children,
  onHeightChange = () => {},
}: DraggableBottomSheetProps) {
  const controls = useAnimation();
  const [activeSnapPoint, setActiveSnapPoint] = useState<number>(1);

  // Memoize snap points to prevent recalculation on every render.
  const snapPoints = useMemo(() => {
    // Ensure this code runs only on the client where `window` is available.
    if (typeof window === "undefined") {
      return [200, 400, 700]; // Default SSR values
    }
    return [200, 400, window.innerHeight * 0.85];
  }, []);

  // Set initial height and notify parent on mount
  useEffect(() => {
    const initialHeight = snapPoints[activeSnapPoint];
    controls.set({ height: initialHeight });
    onHeightChange(initialHeight);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [snapPoints]); // Run only when snapPoints are calculated

  const onDrag = (
    _event: MouseEvent | TouchEvent | PointerEvent,
    info: PanInfo
  ) => {
    const currentHeight = snapPoints[activeSnapPoint];
    // Calculate new height based on drag offset (upward drag is negative)
    const newHeight = currentHeight - info.offset.y;

    // Clamp the new height between the min and max snap points
    const clampedHeight = Math.max(
      snapPoints[0],
      Math.min(newHeight, snapPoints[snapPoints.length - 1])
    );

    // Update the sheet's height visually in real-time during the drag
    controls.set({ height: clampedHeight });
    // Notify the parent component of the height change for map resizing
    onHeightChange(clampedHeight);
  };

  const onDragEnd = (
    _event: MouseEvent | TouchEvent | PointerEvent,
    info: PanInfo
  ) => {
    const { offset, velocity } = info;
    const currentHeight = snapPoints[activeSnapPoint] - offset.y;

    let nextSnapPointIndex = activeSnapPoint;
    if (velocity.y > 500 && activeSnapPoint > 0) {
      nextSnapPointIndex = activeSnapPoint - 1; // Snapped down
    } else if (velocity.y < -500 && activeSnapPoint < snapPoints.length - 1) {
      nextSnapPointIndex = activeSnapPoint + 1; // Snapped up
    } else {
      // Find the closest snap point based on final position
      nextSnapPointIndex = snapPoints.reduce((closestIndex, point, index) => {
        const distance = Math.abs(currentHeight - point);
        const closestDistance = Math.abs(
          currentHeight - snapPoints[closestIndex]
        );
        return distance < closestDistance ? index : closestIndex;
      }, activeSnapPoint);
    }

    const finalHeight = snapPoints[nextSnapPointIndex];
    setActiveSnapPoint(nextSnapPointIndex);

    // Animate to the final snap position
    controls.start({
      height: finalHeight,
      transition: { type: "spring", damping: 30, stiffness: 300 },
    });
    // Ensure the parent gets the final snapped height
    onHeightChange(finalHeight);
  };

  return (
    <MotionBox
      drag="y"
      onDrag={onDrag}
      onDragEnd={onDragEnd}
      animate={controls}
      dragConstraints={{ top: 0, bottom: 0 }}
      dragElastic={{ top: 0.1, bottom: 0.1 }}
      pos="absolute"
      zIndex={200}
      bottom={0}
      left={0}
      right={0}
      bg="bg"
      borderTopRadius="xl"
      boxShadow="lg"
      display="flex"
      flexDirection="column"
      // Prevent page scroll on mobile while dragging
      css={{ touchAction: "none" }}
    >
      <Flex
        justifyContent="center"
        alignItems="center"
        py={3}
        w="100%"
        cursor="grab"
        borderBottom="1px solid"
        borderColor="border"
      >
        <Box w="40px" h="5px" bg="gray.400" borderRadius="full" />
      </Flex>

      <Box flex="1" overflow="hidden" css={{ touchAction: "auto" }}>
        {children}
      </Box>
    </MotionBox>
  );
}

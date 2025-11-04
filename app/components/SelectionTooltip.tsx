"use client";
import { Box, Button, HStack, Text } from "@chakra-ui/react";
import { SparkleIcon } from "@phosphor-icons/react";
import { useState, useEffect } from "react";

interface SelectionTooltipProps {
  isOpen: boolean;
  onClose: () => void;
  target: DOMRect | null;
  onCopy: () => void;
  containerRef: React.RefObject<HTMLDivElement | null>;
}

export function SelectionTooltip({ isOpen, onClose, target, onCopy, containerRef }: SelectionTooltipProps) {
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setCopied(false);
    }
  }, [isOpen]);

    useEffect(() => {
    if (isOpen) {
      window.addEventListener("resize", onClose);
      return () => {
        window.removeEventListener("resize", onClose);
      };
    }
  }, [isOpen, onClose]);

  const handleCopy = () => {
    onCopy();
    setCopied(true);
  };

  if (!isOpen || !target) return null;

  return (
    <Box
      position="absolute"
      top={`${target.bottom + 8}px`}
      left="5%"
      zIndex={1000}
      bg="white"
      border="1px solid"
      borderColor="gray.200"
      borderRadius="md"
      boxShadow="sm"
      py={1}
      px={2}
      w="fit-content"
      maxW="90%"
    >
      <HStack gap={3} alignItems="center">
        <SparkleIcon color="var(--chakra-colors-lime-500)" size={18} weight="fill" style={{ flexShrink: 0 }} />
        <Text fontSize="sm" color="gray.600" flex={1}>
          This is AI-generated text. Verify before using in your work.
        </Text>
        <Button
          size={{ base: "xs", md: "sm" }}
          onClick={handleCopy}
          variant="outline"
          colorScheme="gray"
          bg="white"
          color="blue.500"
          flexShrink={0}
        >
          {copied ? "Copied" : "Copy"}
        </Button>
      </HStack>
    </Box>
  );
}

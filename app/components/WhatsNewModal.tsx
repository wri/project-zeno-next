"use client";

import { Box, Button, Flex, HStack, Portal, Text } from "@chakra-ui/react";
import {
  CaretDownIcon,
  CaretUpIcon,
  ShootingStarIcon,
  XIcon,
} from "@phosphor-icons/react";
import { useEffect, useState } from "react";

const STORAGE_KEY = "whats-new-v1-dismissed";

// TODO: Download and host these images in /public before Figma asset URLs expire (~7 days from 2026-03-25)
const FEATURE_IMAGES: Record<number, string> = {
  1: "https://www.figma.com/api/mcp/asset/9dcf39f2-e59e-4863-920d-ea0d2051d31d",
};

interface Feature {
  step: number;
  title: string;
  description: string;
}

const FEATURES: Feature[] = [
  {
    step: 1,
    title: "Compare multiple areas",
    description:
      'Select multiple areas at once and ask questions like "Which Brazilian state has the most cropland?" The assistant and the charts handle the rest.',
  },
  {
    step: 2,
    title: "See the AI's reasoning",
    description:
      "Expand the reasoning panel to see the agent's chain of thought and tool calls as they happen, step by step. More transparency, more trust.",
  },
  {
    step: 3,
    title: "Fully reproducible analysis results",
    description:
      "Every insight comes with a full provenance trail. See exactly what data was used and how it was processed, so your results are fully reproducible.",
  },
  {
    step: 4,
    title: "Improved charts",
    description:
      "Switch between chart and table views, export data to share with your team, and enjoy improved accessibility across all visualisations.",
  },
  {
    step: 5,
    title: "Faster and smarter",
    description:
      "Faster responses and higher quality answers: improvements across the board to speed, dataset selection, interpretation, and chart generation.",
  },
];

const WhatsNewModal = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [expandedStep, setExpandedStep] = useState(1);

  useEffect(() => {
    if (localStorage.getItem(STORAGE_KEY) !== "true") {
      setIsOpen(true);
    }
  }, []);

  const dismiss = () => {
    localStorage.setItem(STORAGE_KEY, "true");
    setIsOpen(false);
  };

  if (!isOpen) return null;

  return (
    <Portal>
      <Box
        position="fixed"
        right={0}
        top={0}
        h="100vh"
        w="480px"
        bg="white"
        display="flex"
        flexDirection="column"
        zIndex="modal"
        borderLeft="1px solid #e0e2e5"
        boxShadow="0px 0px 1px 0px rgba(24,24,27,0.3), 0px 24px 40px 0px rgba(24,24,27,0.16)"
      >
        {/* Header */}
        <Box
          bg="#f4f5f6"
          px={6}
          h="48px"
          display="flex"
          alignItems="center"
          position="relative"
          flexShrink={0}
        >
          <HStack gap={2}>
            <ShootingStarIcon size={20} color="#172b7a" />
            <Text
              fontSize="18px"
              color="#172b7a"
              fontFamily="'IBM Plex Sans', sans-serif"
              fontWeight="normal"
              lineHeight="40px"
            >
              {"What's "}
              <Box as="span" fontWeight="medium">
                new
              </Box>
            </Text>
          </HStack>
          <Box
            as="button"
            position="absolute"
            right={5}
            top="50%"
            transform="translateY(-50%)"
            onClick={dismiss}
            display="flex"
            alignItems="center"
            justifyContent="center"
            color="#131619"
            cursor="pointer"
            _hover={{ opacity: 0.7 }}
            border="none"
            bg="transparent"
            p={0}
          >
            <XIcon size={20} />
          </Box>
        </Box>

        {/* Accordion items */}
        <Box flex={1} overflowY="auto">
          {FEATURES.map((feature) => {
            const isExpanded = expandedStep === feature.step;
            const image = FEATURE_IMAGES[feature.step];

            return (
              <Box
                key={feature.step}
                borderBottom="1px solid #e0e2e5"
              >
                {/* Row */}
                <Flex
                  as="button"
                  onClick={() =>
                    setExpandedStep(isExpanded ? 0 : feature.step)
                  }
                  align="center"
                  justify="space-between"
                  px={6}
                  py={5}
                  w="full"
                  textAlign="left"
                  bg="transparent"
                  border="none"
                  cursor="pointer"
                  _hover={{ bg: "#f9fafb" }}
                >
                  <HStack gap={3}>
                    <Flex
                      w="24px"
                      h="24px"
                      borderRadius="full"
                      bg="#e3f37f"
                      align="center"
                      justify="center"
                      flexShrink={0}
                    >
                      <Text
                        fontSize="12px"
                        fontWeight="medium"
                        color="#393e29"
                        fontFamily="'IBM Plex Sans', sans-serif"
                        lineHeight={1}
                      >
                        {feature.step}
                      </Text>
                    </Flex>
                    <Text
                      fontSize="14px"
                      fontWeight="medium"
                      color="#131619"
                      fontFamily="'IBM Plex Sans', sans-serif"
                      lineHeight={1.5}
                    >
                      {feature.title}
                    </Text>
                  </HStack>
                  {isExpanded ? (
                    <CaretUpIcon size={16} color="#131619" />
                  ) : (
                    <CaretDownIcon size={16} color="#131619" />
                  )}
                </Flex>

                {/* Expanded content */}
                {isExpanded && (
                  <Box px={6} pb={5}>
                    {image && (
                      <Box
                        mb={4}
                        h="180px"
                        w="full"
                        borderRadius="4px"
                        overflow="hidden"
                        bg="#f4f5f6"
                      >
                        <img
                          src={image}
                          alt={feature.title}
                          style={{
                            width: "100%",
                            height: "100%",
                            objectFit: "cover",
                            display: "block",
                          }}
                        />
                      </Box>
                    )}
                    <Text
                      fontSize="14px"
                      color="#656e7b"
                      fontFamily="'IBM Plex Sans', sans-serif"
                      lineHeight={1.5}
                    >
                      {feature.description}
                    </Text>
                  </Box>
                )}
              </Box>
            );
          })}
        </Box>

        {/* Footer */}
        <Box
          borderTop="1px solid #e0e2e5"
          p={5}
          flexShrink={0}
        >
          <Button
            w="full"
            h="44px"
            bg="#0049aa"
            color="white"
            borderRadius="8px"
            fontSize="16px"
            fontWeight="medium"
            fontFamily="'IBM Plex Sans', sans-serif"
            onClick={dismiss}
            _hover={{ bg: "#003a88" }}
          >
            {"Got it! Let's explore!"}
          </Button>
        </Box>
      </Box>
    </Portal>
  );
};

export default WhatsNewModal;

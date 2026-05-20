"use client";

import { Box, Button, Flex, HStack, Portal, Text } from "@chakra-ui/react";
import { Tooltip } from "@/app/components/ui/tooltip";
import {
  CaretDownIcon,
  CaretUpIcon,
  ShootingStarIcon,
  XIcon,
} from "@phosphor-icons/react";
import { useEffect, useState } from "react";

const STORAGE_KEY = "whats-new-v2-dismissed";
const LEGACY_STORAGE_KEYS = ["whats-new-v1-dismissed"];

const FEATURE_IMAGES: Record<number, string> = {
  1: "/whats_new/tcl_2025.png",
  2: "/whats_new/multi_area.png",
  3: "/whats_new/reasoning.png",
  4: "/whats_new/provenance.png",
  5: "/whats_new/charts.png",
  6: "/whats_new/performance.png",
};

interface Feature {
  step: number;
  title: string;
  description: string;
  isNew?: boolean;
}

const PILL_SIZES = {
  sm: {
    borderRadius: "3px",
    px: "5px",
    py: "2px",
    fontSize: "9px",
    letterSpacing: "0.06em",
    lineHeight: "14px",
  },
  md: {
    borderRadius: "4px",
    px: "8px",
    py: "3px",
    fontSize: "10px",
    letterSpacing: "0.04em",
    lineHeight: "16px",
  },
} as const;

const Pill = ({
  label,
  color,
  size = "md",
}: {
  label: string;
  color: string;
  size?: keyof typeof PILL_SIZES;
}) => {
  const s = PILL_SIZES[size];
  return (
    <Box bg="#dde2f5" borderRadius={s.borderRadius} px={s.px} py={s.py}>
      <Text
        fontFamily="'IBM Plex Mono', monospace"
        fontSize={s.fontSize}
        fontWeight="medium"
        letterSpacing={s.letterSpacing}
        color={color}
        lineHeight={s.lineHeight}
      >
        {label}
      </Text>
    </Box>
  );
};

const FEATURES: Feature[] = [
  {
    step: 1,
    title: "Tree cover loss data updated to 2025",
    description:
      "Tree cover loss now runs through 2025, joining the full record from 2001. Narrow any query to primary forest, or set a specific canopy threshold to match how you define forest.",
    isNew: true,
  },
  {
    step: 2,
    title: "Compare multiple areas",
    description:
      'Select multiple areas at once and ask global-level questions like "Which country has the most natural grasslands?" The assistant and the charts handle the rest.',
  },
  {
    step: 3,
    title: "See the AI's reasoning",
    description:
      "Expand the reasoning panel to see the agent's chain of thought and tool calls as they happen, step by step. More transparency, more trust.",
  },
  {
    step: 4,
    title: "Fully reproducible analysis results",
    description:
      "Every insight comes with a full provenance trail. See exactly what data was used and how it was processed, so your results are fully reproducible.",
  },
  {
    step: 5,
    title: "Improved charts",
    description:
      "Switch between chart and table views, export data to share with your team, and enjoy improved accessibility across all visualisations.",
  },
  {
    step: 6,
    title: "Faster and smarter",
    description:
      "Faster responses and higher quality answers: improvements across the board to speed, dataset selection, interpretation, and chart generation.",
  },
];

const WhatsNewModal = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [expandedStep, setExpandedStep] = useState(1);

  useEffect(() => {
    LEGACY_STORAGE_KEYS.forEach((key) => localStorage.removeItem(key));
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
        <Flex
          bg="#f4f5f6"
          px={6}
          h="48px"
          align="center"
          justify="space-between"
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
          <HStack gap={3}>
            <Pill label="APRIL 2026" color="#4a64cb" />
            <Box
              as="button"
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
          </HStack>
        </Flex>

        {/* Accordion items */}
        <Box flex={1} overflowY="auto">
          {FEATURES.map((feature) => {
            const isExpanded = expandedStep === feature.step;
            const image = FEATURE_IMAGES[feature.step];

            return (
              <Box key={feature.step} borderBottom="1px solid #e0e2e5">
                {/* Row */}
                <Flex
                  as="button"
                  onClick={() => setExpandedStep(isExpanded ? 0 : feature.step)}
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
                    {feature.isNew && (
                      <Pill label="NEW" color="#0049aa" size="sm" />
                    )}
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
        <Box borderTop="1px solid #e0e2e5" p={5} flexShrink={0}>
          <Tooltip
            content="We ship updates regularly — thanks for being part of the preview!"
            showArrow
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
              {"Start exploring!"}
            </Button>
          </Tooltip>
        </Box>
      </Box>
    </Portal>
  );
};

export default WhatsNewModal;

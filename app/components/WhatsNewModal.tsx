"use client";

import {
  Box,
  Button,
  Flex,
  HStack,
  Link,
  Portal,
  Text,
} from "@chakra-ui/react";
import { Tooltip } from "@/app/components/ui/tooltip";
import {
  ArrowSquareOutIcon,
  CaretDownIcon,
  CaretUpIcon,
  ShootingStarIcon,
  TreeIcon,
  XIcon,
} from "@phosphor-icons/react";
import { useEffect, useState } from "react";

// Older keys cleaned up on mount. The active key lives in PageHeader; bump both
// in lockstep to re-surface "What's new" for everyone (see WHATS_NEW_STORAGE_KEY).
const LEGACY_STORAGE_KEYS = [
  "whats-new-v1-dismissed",
  "whats-new-v2-dismissed",
  "whats-new-v3-dismissed",
];

// Blog post behind the rebrand announcement (same destination as the SystemBanner,
// tagged with a whats-new source for attribution).
const BLOG_POST_URL =
  "https://www.globalforestwatch.org/blog/data-and-tools/gfw-now-global-nature-watch/?utm_medium=notification&utm_source=whatsnew&utm_campaign=gnwannoucement";

const ANNOUNCEMENT = {
  title: "Becoming Global Nature Watch Horizon",
  body: "The AI-driven platform preview you are exploring today is becoming Global Nature Watch Horizon. This change is part of a broader evolution underway as Global Forest Watch becomes Global Nature Watch, expanding beyond forests while integrating new technologies. Global Nature Watch Horizon will play an important role in this next chapter. Read this blog to learn more.",
  linkLabel: "Read the blog post",
  linkUrl: BLOG_POST_URL,
};

const FEATURE_IMAGES: Record<number, string> = {
  1: "/whats_new/multi_area.png",
  2: "/whats_new/reasoning.png",
  3: "/whats_new/provenance.png",
  4: "/whats_new/charts.png",
  5: "/whats_new/smarter_agent.png",
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
      "Behind the scenes the assistant now runs on a faster, more capable model — quicker responses and sharper analysis across the board.",
  },
];

const WhatsNewModal = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [announcementOpen, setAnnouncementOpen] = useState(true);
  const [expandedStep, setExpandedStep] = useState(1);

  useEffect(() => {
    LEGACY_STORAGE_KEYS.forEach((key) => localStorage.removeItem(key));
  }, []);

  useEffect(() => {
    const handleOpen = () => setIsOpen(true);
    window.addEventListener("gnw-whats-new-open", handleOpen);
    return () => window.removeEventListener("gnw-whats-new-open", handleOpen);
  }, []);

  const dismiss = () => setIsOpen(false);

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
          minH="48px"
          align="center"
          justify="space-between"
          flexShrink={0}
          borderBottom="1px solid #e0e2e5"
        >
          <HStack gap={2}>
            <ShootingStarIcon size={20} color="#172b7a" />
            <Text
              fontSize="18px"
              color="#172b7a"
              fontFamily="'IBM Plex Sans', sans-serif"
              fontWeight="normal"
              lineHeight="1"
            >
              {"What's "}
              <Box as="span" fontWeight="medium">
                new
              </Box>
            </Text>
          </HStack>
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
            aria-label="Close what's new"
          >
            <XIcon size={20} />
          </Box>
        </Flex>

        {/* Scrollable content */}
        <Box flex={1} overflowY="auto">
          {/* Announcement — the rebrand, highlighted above the feature list */}
          <Box bg="#f7fbd9" borderBottom="1px solid #e0e2e5">
            <Flex
              as="button"
              onClick={() => setAnnouncementOpen((v) => !v)}
              align="center"
              justify="space-between"
              px={6}
              py={4}
              w="full"
              textAlign="left"
              bg="transparent"
              border="none"
              cursor="pointer"
            >
              <Flex
                direction="column"
                gap={2}
                align="flex-start"
                flex={1}
                minW={0}
              >
                <Box
                  bg="#f0f9b9"
                  border="0.5px solid #8e9954"
                  borderRadius="4px"
                  px="6px"
                  py="2px"
                >
                  <Text
                    fontFamily="'IBM Plex Mono', monospace"
                    fontSize="9px"
                    letterSpacing="0.06em"
                    color="#23271a"
                    lineHeight="normal"
                  >
                    ANNOUNCEMENT
                  </Text>
                </Box>
                <HStack gap={2}>
                  <TreeIcon size={16} weight="fill" color="#8e9954" />
                  <Text
                    fontSize="14px"
                    fontWeight="semibold"
                    color="#131619"
                    fontFamily="'IBM Plex Sans', sans-serif"
                    lineHeight="20px"
                  >
                    {ANNOUNCEMENT.title}
                  </Text>
                </HStack>
              </Flex>
              {announcementOpen ? (
                <CaretUpIcon size={16} color="#131619" />
              ) : (
                <CaretDownIcon size={16} color="#131619" />
              )}
            </Flex>
            {announcementOpen && (
              <Box px={6} pb={4}>
                <Text
                  fontSize="14px"
                  color="#3a4048"
                  fontFamily="'IBM Plex Sans', sans-serif"
                  lineHeight={1.5}
                  mb={3}
                >
                  {ANNOUNCEMENT.body}
                </Text>
                <Link
                  href={ANNOUNCEMENT.linkUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  display="inline-flex"
                  alignItems="center"
                  gap={1}
                  color="#0049aa"
                  fontSize="14px"
                  fontFamily="'IBM Plex Sans', sans-serif"
                >
                  {ANNOUNCEMENT.linkLabel}
                  <ArrowSquareOutIcon size={16} />
                </Link>
              </Box>
            )}
          </Box>

          {/* Feature accordion */}
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
              {"Got it! Let's explore!"}
            </Button>
          </Tooltip>
        </Box>
      </Box>
    </Portal>
  );
};

export default WhatsNewModal;

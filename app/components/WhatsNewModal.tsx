"use client";

import {
  Box,
  Button,
  Dialog,
  Flex,
  HStack,
  Portal,
  Text,
  VStack,
} from "@chakra-ui/react";
import { Tooltip } from "@/app/components/ui/tooltip";
import {
  ArrowLeftIcon,
  ArrowRightIcon,
  BrainIcon,
  ChartBarIcon,
  MagnifyingGlassIcon,
  MapPinIcon,
  RocketLaunchIcon,
  SparkleIcon,
} from "@phosphor-icons/react";
import { useEffect, useState } from "react";

const STORAGE_KEY = "whats-new-v1-dismissed";

const LCL_GRADIENT =
  "linear-gradient(107deg, #CCE2FF 5.2%, #E0F1FA 14.44%, #F8FCE4 69.9%)";

const LCL_GRADIENT_SUBTLE =
  "linear-gradient(107deg, #F0F6FF 5.2%, #F7FBFD 14.44%, #FDFEF7 69.9%)";

interface Feature {
  icon: React.ElementType;
  iconColor: string;
  accentColor: string;
  title: string;
  description: string;
}

const FEATURES: Feature[] = [
  {
    icon: MapPinIcon,
    iconColor: "#4F46E5",
    accentColor: "#EEEDFD",
    title: "Compare multiple areas",
    description:
      'Select multiple areas at once and ask questions like "which midwest state has the most cropland?" The assistant and the charts handle the rest.',
  },
  {
    icon: BrainIcon,
    iconColor: "#7C3AED",
    accentColor: "#F0EAFF",
    title: "See the AI's reasoning",
    description:
      "Expand the reasoning panel to see the agent's chain of thought and tool calls as they happen, step by step. More transparency, more trust.",
  },
  {
    icon: MagnifyingGlassIcon,
    iconColor: "#0284C7",
    accentColor: "#E0F5FD",
    title: "View how this was generated",
    description:
      "Every insight comes with a full provenance trail — see exactly what data was used and how it was processed, so your results are fully reproducible.",
  },
  {
    icon: ChartBarIcon,
    iconColor: "#E11D6A",
    accentColor: "#FDEDF4",
    title: "Improved charts",
    description:
      "Switch between chart and table views, export data to share with your team, and enjoy improved accessibility across all visualisations.",
  },
  {
    icon: RocketLaunchIcon,
    iconColor: "#00876A",
    accentColor: "#D6F5EE",
    title: "Faster and smarter",
    description:
      "Faster responses and higher quality answers — improvements across the board to speed, dataset selection, interpretation, and chart generation.",
  },
];

const TOTAL = FEATURES.length;

const WhatsNewModal = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [step, setStep] = useState(0);
  const [direction, setDirection] = useState<"forward" | "back">("forward");
  const [animating, setAnimating] = useState(false);

  useEffect(() => {
    if (localStorage.getItem(STORAGE_KEY) !== "true") {
      setIsOpen(true);
    }
  }, []);

  const dismiss = () => {
    localStorage.setItem(STORAGE_KEY, "true");
    setIsOpen(false);
  };

  const navigate = (next: number, dir: "forward" | "back") => {
    if (animating) return;
    setDirection(dir);
    setAnimating(true);
    setTimeout(() => {
      setStep(next);
      setAnimating(false);
    }, 220);
  };

  const goNext = () => {
    if (step < TOTAL - 1) navigate(step + 1, "forward");
  };

  const goBack = () => {
    if (step > 0) navigate(step - 1, "back");
  };

  if (!isOpen) return null;

  const feature = FEATURES[step];
  const IconComponent = feature.icon;
  const isLast = step === TOTAL - 1;

  const slideStyle: React.CSSProperties = {
    opacity: animating ? 0 : 1,
    transform: animating
      ? `translateX(${direction === "forward" ? "24px" : "-24px"})`
      : "translateX(0)",
    transition: "opacity 0.22s ease, transform 0.22s ease",
  };

  return (
    <Dialog.Root lazyMount open={isOpen} placement="center" size="md">
      <Portal>
        <Dialog.Backdrop
          style={{
            backgroundColor: "rgba(0,0,0,0.55)",
            backdropFilter: "blur(6px)",
          }}
        />
        <Dialog.Positioner>
          <Dialog.Content
            mx={{ base: 3, md: "inherit" }}
            overflow="hidden"
            borderRadius="2xl"
            boxShadow="0 24px 64px rgba(0, 41, 108, 0.18), 0 4px 16px rgba(0, 41, 108, 0.10)"
            border="1px solid"
            borderColor="rgba(0, 65, 177, 0.12)"
          >
            {/* Modal header strip */}
            <Box
              background={LCL_GRADIENT}
              px={6}
              pt={6}
              pb={4}
              borderBottom="1px solid"
              borderColor="rgba(0, 65, 177, 0.10)"
            >
              <HStack justify="space-between" align="center">
                <VStack align="start" gap={1}>
                  <Text
                    fontSize="11px"
                    fontWeight="700"
                    letterSpacing="0.12em"
                    textTransform="uppercase"
                    color="#0041B1"
                    opacity={0.7}
                    fontFamily="'IBM Plex Sans', sans-serif"
                  >
                    Global Nature Watch
                  </Text>
                  <HStack gap={2} align="center">
                    <SparkleIcon size={20} weight="fill" color="#0041B1" />
                    <Text
                      fontSize="2xl"
                      fontWeight="800"
                      color="#0E1E3C"
                      lineHeight="1.2"
                      fontFamily="'IBM Plex Sans', sans-serif"
                      letterSpacing="-0.02em"
                    >
                      {"What's new"}
                    </Text>
                  </HStack>
                </VStack>
                <Box
                  background="rgba(255,255,255,0.55)"
                  borderRadius="full"
                  px={3}
                  py={1}
                  border="1px solid rgba(0, 65, 177, 0.15)"
                >
                  <Text
                    fontSize="xs"
                    fontWeight="600"
                    color="#0041B1"
                    fontFamily="'IBM Plex Sans', sans-serif"
                  >
                    {step + 1} / {TOTAL}
                  </Text>
                </Box>
              </HStack>
            </Box>

            <Dialog.Body p={0}>
              {/* Feature card area */}
              <Box
                minH="280px"
                position="relative"
                overflow="hidden"
                background={LCL_GRADIENT_SUBTLE}
              >
                <Box style={slideStyle} px={6} py={8}>
                  {/* Icon */}
                  <Flex
                    w="72px"
                    h="72px"
                    borderRadius="20px"
                    background={`${feature.accentColor}CC`}
                    border="1.5px solid"
                    borderColor={`${feature.iconColor}22`}
                    align="center"
                    justify="center"
                    mb={5}
                    boxShadow={`0 4px 20px ${feature.iconColor}22`}
                  >
                    <IconComponent
                      size={36}
                      weight="duotone"
                      color={feature.iconColor}
                    />
                  </Flex>

                  {/* Feature text */}
                  <Text
                    fontSize="xl"
                    fontWeight="700"
                    color="#0E1E3C"
                    mb={3}
                    lineHeight="1.3"
                    fontFamily="'IBM Plex Sans', sans-serif"
                  >
                    {feature.title}
                  </Text>
                  <Text
                    fontSize="sm"
                    color="#002C6C"
                    lineHeight="1.7"
                    maxW="440px"
                    opacity={0.8}
                    fontFamily="'IBM Plex Sans', sans-serif"
                  >
                    {feature.description}
                  </Text>
                </Box>

                {/* Progress dots */}
                <HStack gap={2} position="absolute" bottom={5} left={6}>
                  {FEATURES.map((_, i) => (
                    <Box
                      key={i}
                      as="button"
                      onClick={() => navigate(i, i > step ? "forward" : "back")}
                      w={i === step ? "20px" : "6px"}
                      h="6px"
                      borderRadius="full"
                      background={
                        i === step ? "#0041B1" : "rgba(0, 65, 177, 0.25)"
                      }
                      transition="all 0.28s ease"
                      cursor="pointer"
                      _hover={{
                        background:
                          i === step ? "#0041B1" : "rgba(0, 65, 177, 0.45)",
                      }}
                      border="none"
                      p={0}
                    />
                  ))}
                </HStack>
              </Box>

              {/* Navigation footer */}
              <Box
                px={6}
                py={4}
                background="white"
                borderTop="1px solid"
                borderColor="rgba(0, 65, 177, 0.08)"
              >
                <Flex align="center" justify="space-between" gap={3}>
                  {/* Back button */}
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={goBack}
                    disabled={step === 0}
                    color="#0041B1"
                    opacity={step === 0 ? 0 : 1}
                    pointerEvents={step === 0 ? "none" : "auto"}
                    fontFamily="'IBM Plex Sans', sans-serif"
                    _hover={{ background: "rgba(0, 65, 177, 0.06)" }}
                    transition="opacity 0.2s ease"
                  >
                    <ArrowLeftIcon size={14} />
                    Back
                  </Button>

                  <Box flex={1} />

                  {/* Next / Got it */}
                  {isLast ? (
                    <Tooltip
                      content="We ship updates regularly — thanks for being part of the preview!"
                      showArrow
                    >
                      <Button
                        size="sm"
                        onClick={dismiss}
                        background="#0041B1"
                        color="white"
                        fontWeight="600"
                        fontFamily="'IBM Plex Sans', sans-serif"
                        borderRadius="lg"
                        px={5}
                        _hover={{ background: "#002C6C" }}
                        transition="background 0.18s ease"
                      >
                        {"Got it. Let's explore!"}
                      </Button>
                    </Tooltip>
                  ) : (
                    <Button
                      size="sm"
                      onClick={goNext}
                      background="#0041B1"
                      color="white"
                      fontWeight="600"
                      fontFamily="'IBM Plex Sans', sans-serif"
                      borderRadius="lg"
                      px={4}
                      _hover={{ background: "#002C6C" }}
                      transition="background 0.18s ease"
                    >
                      Next
                      <ArrowRightIcon size={14} />
                    </Button>
                  )}
                </Flex>
              </Box>
            </Dialog.Body>
          </Dialog.Content>
        </Dialog.Positioner>
      </Portal>
    </Dialog.Root>
  );
};

export default WhatsNewModal;

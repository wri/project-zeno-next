"use client";
import { useRef, useEffect, useState } from "react";
import {
  Box,
  Button,
  ButtonGroup,
  Container,
  Flex,
  Heading,
  Input,
  Text,
  Badge,
} from "@chakra-ui/react";
import {
  ArrowsClockwiseIcon,
  CaretRightIcon,
  PencilRulerIcon,
} from "@phosphor-icons/react";
import { Tooltip } from "@/components/ui/tooltip";
import Link from "next/link";
import { Button as WRIButton } from "@worldresources/wri-design-systems";
import TrustedPlatformsSection from "./sections/1_TrustedPlatforms";
import FeaturesTabsSection from "./sections/2_FeaturesTabs";
import SupportWorkTabsSection from "./sections/3_SupportWorkTabs";
import HowItWorksSection from "./sections/4_HowItWorks";
import LatestUpdatesSection from "./sections/5_LatestUpdates";
import FutureOfMonitoringSection from "./sections/6_FutureOfMonitoring";
import TeamSection from "./sections/7_TeamSection";
import NewEraQuoteSection from "./sections/8_NewEraQuote";
import CTASection from "./sections/9_CTA";
import FooterSection from "./sections/10_Footer";

const SAMPLE_PROMPTS = [
  "Tell me about wild fires in the Brazilian Amazon Rainforest",
  "What are the latest deforestation trends in Indonesia?",
  "How is climate change affecting biodiversity in the Amazon?",
  "Show me recent land use changes in the Congo Basin",
  "What country's forests sequester the most carbon?",
  "Where are the most disturbances to nature happening now?",
  "Show me high priority areas in my monitoring portfolio",
];
const MARQUEE_SPEED = 40;

export default function LandingPage() {
  const containerRef = useRef(null);
  const sliderRef = useRef(null);
  const [sliderWidth, setSliderWidth] = useState(0);
  const [animationDuration, setAnimationDuration] = useState("30s");

  const [promptTimer, setPromptTimer] = useState(10);
  const [promptIndex, setPromptIndex] = useState(0);
  const [animationKey, setAnimationKey] = useState(0);
  const [inputValue, setInputValue] = useState("");
  const [isInputFocused, setIsInputFocused] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setReady(true);
  }, []);

  useEffect(() => {
    if (isInputFocused || inputValue.length > 0) return; // Pause timer if typing
    const interval = setInterval(() => {
      setPromptTimer((prev) => {
        if (prev > 1) {
          return prev - 1;
        } else {
          // When timer resets, update prompt index
          setPromptIndex((idx) => (idx + 1) % SAMPLE_PROMPTS.length);
          setAnimationKey((k) => k + 1);
          return 10;
        }
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [isInputFocused, inputValue]);
  // Measure the width of one set of prompts after render
  useEffect(() => {
    if (sliderRef.current && containerRef.current) {
      // Get width of one set (half the children, since you render 2x)
      const slider = sliderRef.current as HTMLDivElement;
      // Each prompt box has flexShrink=0, so width is sum of all
      const promptBoxes = slider.querySelectorAll("[data-marquee-item]");
      let width = 0;
      for (let i = 0; i < promptBoxes.length / 2; i++) {
        width += (promptBoxes[i] as HTMLElement).offsetWidth + 16; // 16px = gap="4"
      }
      setSliderWidth(width);

      // Calculate duration for consistent speed
      setAnimationDuration(`${width / MARQUEE_SPEED}s`);
    }
  }, [SAMPLE_PROMPTS.length]);
  return (
    <div>
      {/* Top Section - header and hero with video background */}
      <Box>
        {/* Video Background */}
        <Box
          position="relative"
          top="0"
          left="0"
          zIndex="10"
          height="100%"
          overflow="hidden"
          width="100%"
          bg="hsla(225, 52%, 11%, 1)"
          backgroundImage="radial-gradient(circle at 80% 80%, hsl(225deg 70% 15%) 0%, hsl(224deg 65% 11%) 50%)"
        >
          <Box
            width="100%"
            height="100%"
            bg="#0D1429"
            position="absolute"
            top={28}
            zIndex="0"
            pointerEvents="none"
            css={{
              "& > video": {
                height: "100%",
                width: "100%",
                objectFit: "cover",
                objectPosition: "top",
              },
            }}
          >
            <video autoPlay loop muted playsInline preload="auto">
              <source src={"/landing-hero-bg.mp4"} type="video/mp4" />
            </video>
          </Box>

          {/* Non-App Page Header */}
          <Container
            display="flex"
            alignItems="center"
            justifyContent="space-between"
            maxW="8xl"
            color="fg.inverted"
            py="2"
            zIndex="10"
            backdropBlur="10px"
          >
            <Flex
              divideColor={"whiteAlpha.300"}
              divideStyle={"solid"}
              divideX={"1px"}
              alignItems="center"
              gap="4"
            >
              <Heading m="0" size="2xl">
                Nature Watch
              </Heading>
              <Text
                pl="4"
                fontSize="xs"
                display="inline-block"
                lineHeight="1.1"
              >
                Intelligent nature monitoring,
                <br /> trusted by experts
              </Text>
            </Flex>
            <Button
              hideFrom="md"
              colorPalette="blue"
              rounded="lg"
              variant="solid"
            >
              Menu
            </Button>
            <Flex hideBelow="md">
              <ButtonGroup
                size="sm"
                gap="2"
                variant="plain"
                _hover={{ "& > :not(:hover)": { opacity: "0.5" } }}
                className="dark"
                colorPalette="gray"
              >
                <Button asChild>
                  <Link href="#">Testimonials</Link>
                </Button>
                <Button asChild>
                  <Link href="#">Use cases</Link>
                </Button>
                <Button asChild>
                  <Link href="#">Research</Link>
                </Button>
                <Button asChild>
                  <Link href="#">Technology</Link>
                </Button>
                <Button asChild>
                  <Link href="#">Team</Link>
                </Button>
                <Button
                  asChild
                  ml={4}
                  variant="solid"
                  colorPalette="blue"
                  rounded="lg"
                >
                  <Link href="/">Try the preview</Link>
                </Button>
              </ButtonGroup>
            </Flex>
          </Container>
          {/* Hero Container */}
          <Box py="20" zIndex="10">
            <Container textAlign="center" maxW="2xl" color="fg.inverted">
              <Heading size={{ base: "4xl", md: "5xl" }}>
                Tackle nature&rsquo;s toughest monitoring challenges
              </Heading>
              <Text fontSize="lg">
                Global Nature Watch is your personal geospatial AI assistant,
                trained on the latest nature monitoring breakthroughs by the
                worl&apos;s leading researchers.
              </Text>
            </Container>
            <Container mt="8" maxW={{ base: "lg", md: "2xl" }}>
              <Box rounded="md" bg="bg" p="4" zIndex="10">
                <Input
                  key={
                    !isInputFocused && inputValue === ""
                      ? promptIndex
                      : undefined
                  }
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  onFocus={() => setIsInputFocused(true)}
                  onBlur={() => setIsInputFocused(false)}
                  p="0"
                  outline="none"
                  borderWidth="0"
                  size="lg"
                  placeholder={SAMPLE_PROMPTS[promptIndex]}
                  animationName="slide-from-bottom, fade-in"
                  animationDuration="0.32s"
                  animationTimingFunction="ease-in-out"
                  _focusWithin={{
                    animationPlayState: "paused",
                  }}
                />
                <Flex
                  justifyContent="space-between"
                  alignItems="flex-start"
                  mt="4"
                >
                  <Flex gap="2" alignItems="flex-start" flexDirection="column">
                    <Button
                      key={animationKey}
                      variant="outline"
                      rounded="lg"
                      _after={{
                        position: "absolute",
                        top: 0,
                        bottom: 0,
                        left: 0,
                        right: 0,
                        content: "''",
                        zIndex: -1,
                        width: "10%",
                        height: "100%",
                        bg: "lime.100",
                        animation: ready ? "fillWidth" : "none",
                        animationPlayState:
                          isInputFocused || inputValue.length > 0
                            ? "paused"
                            : "running",
                      }}
                      onClick={() => {
                        setPromptTimer(10);
                        setPromptIndex(
                          (idx) => (idx + 1) % SAMPLE_PROMPTS.length
                        );
                        setAnimationKey((k) => k + 1);
                      }}
                    >
                      <ArrowsClockwiseIcon />
                      New Suggestion
                    </Button>
                    <Text fontSize="xs" color="fg.subtle">
                      Automatically updating in {promptTimer}s
                    </Text>
                  </Flex>
                  <WRIButton
                    variant="primary"
                    rounded="lg"
                    rightIcon={<CaretRightIcon weight="bold" />}
                    label="Go"
                  />
                </Flex>
              </Box>
            </Container>
            <Container maxW={{ base: "lg", md: "2xl" }} mt="3">
              <Box
                display="flex"
                bg="blackAlpha.400"
                justifyContent="space-between"
                alignItems="center"
                rounded="md"
                fontSize="xs"
                color="fg.inverted"
                zIndex="10"
                px="2"
                py="1"
              >
                <Text>
                  <Badge size="xs" fontSize="8px" rounded="none" mr="1">
                    BETA
                  </Badge>
                  Global Nature Watch is in open Beta
                </Text>
                <Tooltip
                  openDelay={100}
                  closeDelay={300}
                  content="While Global Nature Watch is in Beta, prompt limits exist to let you trial the assistant while keeping it fast, reliable, and affordable for all."
                >
                  <Box
                    color="fg.inverted"
                    textDecoration="underline"
                    textDecorationStyle="dotted"
                    cursor="pointer"
                    display="flex"
                    gap="1"
                    alignItems="center"
                  >
                    <PencilRulerIcon />
                    Capped at 100 prompts
                  </Box>
                </Tooltip>
              </Box>
            </Container>
          </Box>
        </Box>
      </Box>
      {/* Sliding prompts section */}
      <Box
        py="8"
        bg="neutral.300"
        borderBlockEnd="1px solid"
        borderColor="neutral.400"
        gap="4"
        overflow="hidden"
        display="flex"
        flexDirection="column"
        ref={containerRef}
      >
        {/* Prompts sliding left */}
        <Flex
          gap="4"
          animationName="dynamicSlideLeft"
          animationDuration={animationDuration}
          animationTimingFunction="linear"
          animationIterationCount="infinite"
          style={{
            "--start-x": "0px",
            "--end-x": `-${sliderWidth}px`,
          }}
          _hover={{
            animationPlayState: "paused",
            "& > *": {
              opacity: 0.6,
            },
          }}
          ref={sliderRef}
        >
          {/* Duplicate prompts array to ensure illustion of infinite scroll */}
          {Array(2)
            .fill(SAMPLE_PROMPTS)
            .flat()
            .map((prompt, i) => (
              <Box
                key={i}
                data-marquee-item
                bg="neutral.200"
                borderWidth="1px"
                borderColor="neutral.400"
                p="3"
                rounded="md"
                maxW="18rem"
                flexShrink="0"
                cursor="pointer"
                _hover={{
                  "&&": { opacity: 1 },
                }}
              >
                {prompt}
              </Box>
            ))}
        </Flex>
        {/* Prompts sliding right */}
        <Flex
          gap="4"
          animationName="dynamicSlideRight"
          animationDuration={animationDuration}
          animationTimingFunction="linear"
          animationIterationCount="infinite"
          style={{
            "--start-x": `-${sliderWidth}px`,
            "--end-x": "0px",
          }}
          _hover={{
            animationPlayState: "paused",
            "& > *": {
              opacity: 0.6,
            },
          }}
        >
          {/* Duplicate prompts array to ensure illustion of infinite scroll */}
          {Array(2)
            .fill(SAMPLE_PROMPTS)
            .flat()
            .map((prompt, i) => (
              <Box
                key={i}
                data-marquee-item
                bg="lime.100"
                shadow="xs"
                p="3"
                rounded="md"
                maxW="18rem"
                flexShrink="0"
                cursor="pointer"
                _hover={{
                  "&&": { opacity: 1 },
                }}
              >
                {prompt}
              </Box>
            ))}
        </Flex>
      </Box>
      <TrustedPlatformsSection />
      <FeaturesTabsSection />
      <SupportWorkTabsSection />
      <HowItWorksSection />
      <LatestUpdatesSection />
      <FutureOfMonitoringSection />
      <TeamSection />
      <NewEraQuoteSection />
      <CTASection />
      <FooterSection />
    </div>
  );
}

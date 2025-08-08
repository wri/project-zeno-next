"use client";
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

export default function LandingPage() {
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
            <Flex>
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
                <Button asChild ml={4} variant="solid" colorPalette="blue" rounded="lg">
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
                Global Nature Watch is your personal geospatial AI assistant, trained on
                the latest nature monitoring breakthroughs by the worl&apos;s
                leading researchers.
              </Text>
            </Container>
            <Container
              rounded="md"
              bg="bg"
              p="4"
              mt="8"
              maxW={{ base: "lg", md: "xl" }}
              zIndex="10"
            >
              <Input
                p="0"
                outline="none"
                borderWidth="0"
                size="lg"
                placeholder="Where are the most disturbances to nature happening now?"
              />
              <Flex
                justifyContent="space-between"
                alignItems="flex-start"
                mt="4"
              >
                <Flex gap="2" alignItems="flex-start" flexDirection="column">
                  <Button
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
                      width: "40%",
                      height: "100%",
                      bg: "lime.100",
                    }}
                  >
                    <ArrowsClockwiseIcon />
                    New Suggestion
                  </Button>
                  <Text fontSize="xs" color="fg.subtle">
                    Automatically updating in 4s
                  </Text>
                </Flex>
                <WRIButton
                  variant="primary"
                  rounded="lg"
                  rightIcon={<CaretRightIcon weight="bold" />}
                  label="Go"
                />
              </Flex>
            </Container>
            <Container
              display="flex"
              bg="blackAlpha.400"
              justifyContent="space-between"
              alignItems="center"
              rounded="md"
              fontSize="xs"
              color="fg.inverted"
              zIndex="10"
              maxW={{ base: "lg", md: "xl" }}
              mt="3"
              px="2"
              py="1"
            >
              <Text>
                <Badge size="xs" fontSize="8px" rounded="none" mr="1">
                  BETA
                </Badge>
                Global Nature Watch is in open Beta
              </Text>
              <Tooltip content="While Global Nature Watch is in Beta, prompt limits exist to let you trial the assistant while keeping it fast, reliable, and affordable for all.">
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
      >
        <Flex gap="4">
          {SAMPLE_PROMPTS.map((prompt, i) => (
            <Box
              key={i}
              bg="neutral.200"
              borderWidth="1px"
              borderColor="neutral.400"
              p="3"
              rounded="md"
              maxW="18rem"
              flexShrink="0"
              fontSize="sm"
            >
              {prompt}
            </Box>
          ))}
        </Flex>
        <Flex gap="4">
          {SAMPLE_PROMPTS.reverse().map((prompt, i) => (
            <Box
              key={i}
              bg="lime.100"
              borderWidth="1px"
              borderColor="lime.400"
              p="3"
              rounded="md"
              maxW="18rem"
              flexShrink="0"
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

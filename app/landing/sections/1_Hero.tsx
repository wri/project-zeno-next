import { useEffect, useState } from "react";
import {
  Box,
  Button,
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
import { Button as WRIButton } from "@worldresources/wri-design-systems";
import GlobalHeader from "../../components/GlobalHeader";

type PromptMarqueeProps = {
  prompts: string[];
};
export default function LandingHero({ prompts }: PromptMarqueeProps) {
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
          setPromptIndex((idx) => (idx + 1) % prompts.length);
          setAnimationKey((k) => k + 1);
          return 10;
        }
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [prompts.length, isInputFocused, inputValue]);
  // Measure the width of one set of prompts after render
  return (
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
      <GlobalHeader />
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
      {/* Hero Container */}
      <Box py="20" zIndex="10">
        <Container
          textAlign="center"
          maxW="2xl"
          color="fg.inverted"
          px={{ base: 6, md: 0 }}
        >
          <Heading size={{ base: "4xl", md: "5xl" }}>
            Tackle nature&rsquo;s toughest monitoring challenges
          </Heading>
          <Text fontSize="lg">
            Global Nature Watch is your personal geospatial AI assistant,
            trained on the latest nature monitoring breakthroughs by the
            worl&apos;s leading researchers.
          </Text>
        </Container>
        <Container mt="8" maxW="2xl" px={{ base: 6, md: 0 }}>
          <Box rounded="md" bg="bg" p="4" zIndex="10">
            <Input
              key={
                !isInputFocused && inputValue === "" ? promptIndex : undefined
              }
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onFocus={() => setIsInputFocused(true)}
              onBlur={() => setIsInputFocused(false)}
              p="0"
              outline="none"
              borderWidth="0"
              size="lg"
              placeholder={prompts[promptIndex]}
              animationName="slide-from-bottom, fade-in"
              animationDuration="0.32s"
              animationTimingFunction="ease-in-out"
              _focusWithin={{
                animationPlayState: "paused",
              }}
            />
            <Flex
              justifyContent="space-between"
              alignItems={{ base: "stretch", md: "flex-start" }}
              mt="4"
              flexDir={{ base: "column", md: "row" }}
              gap={4}
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
                    setPromptIndex((idx) => (idx + 1) % prompts.length);
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
        <Container maxW="2xl" mt="3" px={{ base: 6, md: 0 }}>
          <Box
            display="flex"
            flexWrap="wrap"
            bg="blackAlpha.400"
            justifyContent="space-between"
            alignItems={{ base: "flex-start", md: "center" }}
            gap={2}
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
  );
}

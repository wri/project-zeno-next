import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
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
  InfoIcon,
} from "@phosphor-icons/react";
import { Tooltip } from "@/components/ui/tooltip";
import useChatStore from "@/app/store/chatStore";
import GlobalHeader from "../../components/GlobalHeader";

type PromptMarqueeProps = {
  prompts: string[];
  promptIndex: number;
  setPromptIndex: React.Dispatch<React.SetStateAction<number>>;
};
export default function LandingHero({
  prompts,
  promptIndex,
  setPromptIndex,
}: PromptMarqueeProps) {
  const router = useRouter();
  const [promptTimer, setPromptTimer] = useState(10);
  const [animationKey, setAnimationKey] = useState(0);
  const [inputValue, setInputValue] = useState("");
  const [isInputFocused, setIsInputFocused] = useState(false);
  const [ready, setReady] = useState(false);
  const { sendMessage, isLoading } = useChatStore();

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
  }, [prompts.length, setPromptIndex, isInputFocused, inputValue]);
  // Measure the width of one set of prompts after render

  const submitPrompt = async () => {
    if (isLoading) return;
    const message = inputValue.trim() || prompts[promptIndex];
    localStorage.setItem("bypassWelcomeModal", "true");
    await sendMessage(message);
    router.push("/app");
  };

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
      <Box
        py="20"
        pt={{ base: 14, md: 24 }}
        pb={{ base: 24, md: 32 }}
        zIndex="10"
      >
        <Container
          px={{ base: 6, md: 0 }}
          display="flex"
          flexDirection="column"
          gap={{ base: 8, md: 10 }}
        >
          <Container
            textAlign="center"
            maxW="2xl"
            color="fg.inverted"
            px={0}
            display="flex"
            flexDirection="column"
            gap="2"
          >
            <Heading
              size={{ base: "3xl", md: "5xl" }}
              textShadow="2px 2px 5px hsla(225, 52%, 11%, 0.75)"
              color="fg.inverted"
              mb={0}
            >
              Tackle nature&rsquo;s toughest monitoring challenges
            </Heading>
            <Text
              fontSize="lg"
              textShadow="2px 2px 5px hsla(225, 52%, 11%, 0.75)"
            >
              Global Nature Watch is your personal geospatial AI assistant, trained to help you make the most of cutting-edge nature monitoring data.
            </Text>
          </Container>
          <Container
            maxW="2xl"
            px={0}
            display="flex"
            flexDirection="column"
            gap="3"
          >
            <Box rounded="xl" bg="bg" p="4" zIndex="10">
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
              <Flex justifyContent="space-between" mt="4" gap={4}>
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
                      bg: "secondary.100",
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
                <Button
                  variant="solid"
                  colorPalette="primary"
                  rounded="lg"
                  onClick={submitPrompt}
                  title="Submit prompt to assistant and go to application"
                  disabled={isLoading}
                >
                  Go
                  <CaretRightIcon weight="bold" />
                </Button>
              </Flex>
            </Box>
            <Box
              display="flex"
              flexWrap="wrap"
              bg="neutral.950/40"
              justifyContent="space-between"
              alignItems={{ base: "flex-start", md: "center" }}
              gap={2}
              rounded="md"
              backdropFilter="blur(4px)"
              fontSize="xs"
              color="fg.inverted"
              zIndex="10"
              px="2"
              py="1"
            >
              <Text>
                <Badge size="xs" fontSize="8px" rounded="4px" mr="1">
                  BETA
                </Badge>
                You&apos;re exploring a beta version of Global Nature Watch.
              </Text>
              <Tooltip
                openDelay={100}
                closeDelay={300}
                content="We are learning, iterating, and improving—and your feedback is essential to help build the next generation of environmental monitoring."
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
                  <InfoIcon />
                  Why we're doing this.
                </Box>
              </Tooltip>
            </Box>
          </Container>
        </Container>
      </Box>
    </Box>
  );
}

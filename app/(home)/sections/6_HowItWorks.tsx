import { Box, Container, Flex, Heading, Image, Text } from "@chakra-ui/react";

const HOW_STEPS = [
  {
    title: "Processing your intent",
    description:
      "When you ask Global Nature Watch a question, our system of agents work together to understand your request and deliver the most accurate, relevant answers.",
    images: [
      { src: "/Langchain-logo.svg", alt: "Langchain logo", width: "80px" },
      { src: "/gemini-icon.svg", alt: "Gemini icon", width: "50px" },
      { src: "/claude-ai-icon.svg", alt: "Claude AI icon", width: "50px" },
    ],
  },
  {
    title: "Retrieving quality data",
    description:
      "We use our APIs to pull verifiable, peer-reviewed data from Global Forest Watch and Land & Carbon Lab. This means verifiable data direct from authoritative sources.",
    images: [
      { src: "/GFW-logo.svg", alt: "GFW logo", maxW: "100%" },
      { src: "LCL-logo.svg", alt: "LCL logo", maxW: "100%" },
    ],
  },
  {
    title: "Tuning the AI model's response",
    description:
      "We use Retrieval-Augmented Generation (RAG) to link data retrieved via our trusted APIs with real documentation, methods papers and metadata from our research.",
    images: [{ src: "/ri_chat-ai-line.svg", alt: "AI icon", maxW: "100%" }],
  },
  {
    title: "Returning a response",
    description:
      "Our agents create summaries of spatial data, search through datasets, and explain insights clearly in over 170 languages.",
    images: [
      {
        src: "/HIW-Brazil-Widget.png",
        alt: "Brazil widget example",
        maxW: "100%",
      },
    ],
  },
];
export default function HowItWorksSection() {
  return (
    <Box
      id="technology"
      py={{ base: 14, md: 24 }}
      pb={{ base: 14, md: 28 }}
      borderBlockEnd="1px solid"
      borderColor="border"
      display="flex"
      flexDir="column"
      gap={{ base: 8, md: 20 }}
    >
      <Container textAlign="center" maxW="2xl">
        <Heading size={{ base: "4xl", md: "5xl" }}>How it works</Heading>
      </Container>
      <Container
        maxW="5xl"
        display="flex"
        flexDir="column"
        gap={{ base: 28, md: 20 }}
        overflow="hidden"
      >
        <Flex
          flexDir={{ base: "column-reverse", md: "row" }}
          alignItems="center"
          bg={{ base: "bg.muted", md: "transparent" }}
          p={{ base: 6, md: 0 }}
          rounded="lg"
          gap={{ base: 0, md: 6 }}
          zIndex={50}
        >
          <Box h={0} w="lg" textAlign={{ base: "center", md: "left" }} />
          <Box
            bg="bg.muted"
            rounded="lg"
            textAlign="center"
            maxW="xs"
            mx="auto"
            p={{ base: 0, md: 6 }}
            zIndex={100}
          >
            Where are the most disturbances to nature happening now?
          </Box>
        </Flex>
        {HOW_STEPS.map((step, index) => (
          <Flex
            key={index}
            flexDir={{ base: "column-reverse", md: "row" }}
            alignItems="stretch"
            gap={6}
            bg={{ base: "bg.muted", md: "transparent" }}
            p={{ base: 6, md: 0 }}
            rounded="lg"
            zIndex={50}
          >
            <Box
              title={step.title}
              maxW="lg"
              textAlign={{ base: "center", md: "left" }}
            >
              <Heading as="p" size={{ base: "xl", md: "2xl" }}>
                {step.title}
              </Heading>
              <Text fontSize="lg">{step.description}</Text>
            </Box>
            <Box
              bg="bg.muted"
              rounded="lg"
              textAlign="center"
              flexShrink={0}
              display="flex"
              flexDir="column"
              alignItems="center"
              justifyContent="center"
              p={6}
              mx="auto"
              zIndex={100}
              maxW={{ base: "none", md: "xs" }}
            >
              <Flex gap={4} alignItems="center" justifyContent="center">
                {step.images.map((image, i) => (
                  <Image key={i} {...image} />
                ))}
              </Flex>
            </Box>
          </Flex>
        ))}
        {/* Animated line */}
        <Box
          width="2px"
          bg="neutral.400"
          height="100%"
          position="absolute"
          zIndex={1}
          left={{ base: "50%", md: "calc(512px + 25% + .75rem)" }}
        />
      </Container>
    </Box>
  );
}

import { Box, Container, Flex, Heading, Image, Text } from "@chakra-ui/react";

const HOW_STEPS = [
  {
    title: "Processing your intent",
    description:
      "When you ask Nature Watch a question, we use LangChain to process the natural language and determine your intent. This allows us to select the best AI models and analysis tools to calculate Nature Watch's response.",
    images: ["/Langchain-logo.svg"],
  },
  {
    title: "Retrieving quality data",
    description:
      "We use our trusted APIs to pull data from Global Forest Watch and Land & Carbon Lab. This means verifiable data direct from authoritative sources, not from model training data.",
    images: ["/GFW-logo.svg", "LCL-logo.svg"],
  },
  {
    title: "Tuning AI model's response",
    description:
      "We use Retrieval-Augmented Generation (RAG) to link data retrieved via our trusted APIs with real documentation, methods papers and metadata from our research.",
    images: ["/ri_chat-ai-line.svg"],
  },
  {
    title: "Returning a response",
    description:
      "Our agents are currently able to create spatial summary statistics, perform dataset searches and return natural-language summaries.",
    images: ["/HIW-Brazil-Widget.png"],
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
            alignItems="center"
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
              <Heading as="p" size={{ base: "xl", md: "2xl" }} mb={2}>
                {step.title}
              </Heading>
              <Text fontSize="lg">{step.description}</Text>
            </Box>
            <Box
              bg={{ base: "transparent", md: "bg.muted" }}
              rounded="lg"
              textAlign="center"
              flexShrink={0}
              display="flex"
              flexDir="column"
              alignItems="center"
              justifyContent="center"
              gap={6}
              p={{ base: 0, md: 6 }}
              mx="auto"
              zIndex={100}
              maxW={{ base: "none", md: "xs" }}
            >
              <Flex gap={4}>
                {step.images.map((image, i) => {
                  return (
                    <Image
                      key={i}
                      src={image}
                      alt="placeholder"
                      maxW="100%"
                    />
                  );
                })}
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

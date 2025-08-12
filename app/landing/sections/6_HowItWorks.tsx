import { Box, Container, Heading, Text } from "@chakra-ui/react";

const HOW_STEPS = [
  {
    title: "Processing your intent",
    description:
      "When you ask Nature Watch a question, we use LangChain to process the natural language and determine your intent. This allows us to select the best AI models and analysis tools to calculate Nature Watch&rsquo;s response.",
    image: "https://placehold.co/200x80",
  },
  {
    title: "Retrieving quality data",
    description:
      "We use our trusted APIs to pull data from Global Forest Watch and Land & Carbon Lab. This means verifiable data direct from authoritative sources, not from model training data.",
    image: "https://placehold.co/200x80",
  },
  {
    title: "Tuning AI model&rsquo;s response",
    description:
      "We use Retrieval-Augmented Generation (RAG) to link data retrieved via our trusted APIs with real documentation, methods papers and metadata from our research.",
    image: "https://placehold.co/200x80",
  },
  {
    title: "Returning a response",
    description:
      "Our agents are currently able to create spatial summary statistics, perform dataset searches and return natural-language summaries.",
    image: "https://placehold.co/200x80",
  },
];
export default function HowItWorksSection() {
  return (
    <Box
      py={{ base: 14, md: 24 }}
      pb={{ base: 14, md: 28 }}
      borderBlockEnd="1px solid"
      borderColor="bg.emphasized"
    >
      <Container textAlign="center" maxW="2xl">
        <Heading size={{ base: "4xl", md: "5xl" }}>How it works</Heading>
      </Container>
      <Container maxW="2xl">
        {HOW_STEPS.map((step, index) => (
          <Box key={index} title={step.title}>
            <Heading>{step.title}</Heading>
            <Text>{step.description}</Text>
          </Box>
        ))}
      </Container>
    </Box>
  );
}

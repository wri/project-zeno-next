import { Box, Container, Text, Heading } from "@chakra-ui/react";

export default function NewEraQuoteSection() {
  return (
    <Box
      py={{ base: 14, md: 24 }}
      pb={{ base: 14, md: 28 }}
      borderBlockEnd="1px solid"
      borderColor="border"
    >
      <Container maxW="2xl">
        <Heading textAlign="center" size={{ base: "3xl", md: "4xl" }}>
          The marker of a new era
        </Heading>
        <Text fontSize="lg" mb="4">
          World Resources Institute tools have been transforming global
          geospatial analysis for over 14 years, with Global Forest Watch having
          particularly successful impact over forest monitoring across the
          tropics.
        </Text>
        <Text fontSize="lg" mb="4">
          However, as we look to the latest advances in technology, AI unlocks
          an opportunity for us to shift from global-first, fixed-structure
          outputs to highly-targeted, actionable insights in the language,
          terminology and regions that matter most to our users.
        </Text>
        <Text fontSize="lg" mb="4">
          Nature Watch marks a new chapter in our monitoring research, data and
          tools. When knowledge is shared, action scales. Nature Watch opens a
          new door to people-driven, intelligence-backed impact.
        </Text>
      </Container>
      <Container mt="8" maxW="2xl">
        <Box
          bg={{base: "secondary.100", md: "bg.emphasized"}}
          border="1px solid"
          borderColor={{base: "secondary.400", md: "transparent"}}
          shadow={{ base: "sm", md: "none" }}
          rounded="xl"
          p="6"
          display="flex"
          flexDir="column"
          gap="4"
        >
          <Heading
            borderStart="2px solid"
            borderColor={{base: "secondary.500", md: "primary.500"}}
            pl="4"
            size="xl"
            as="blockquote"
          >
            “Meaningful change doesn&rsquo;t come from simply watching, it comes
            from taking action”
          </Heading>
          <Text as="cite">Craig Mills, Land & Carbon Lab</Text>
        </Box>
      </Container>
    </Box>
  );
}

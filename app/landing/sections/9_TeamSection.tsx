import {
  Box,
  Container,
  Flex,
  Image,
  Link as ChakraLink,
  Text,
  Heading,
} from "@chakra-ui/react";

export default function TeamSection() {
  return (
    <Box
      py={{ base: 14, md: 24 }}
      pb={{ base: 14, md: 28 }}
      borderBlockEnd="1px solid"
      borderColor="bg.emphasized"
    >
      <Container
        css={{ "& > *": { px: 0 } }}
        display="flex"
        flexDir="column"
        gap={{ base: "8", md: "14" }}
      >
        <Container textAlign="center" maxW="2xl">
          <Heading size={{ base: "3xl", md: "4xl" }}>
            The team behind Nature Watch
          </Heading>
          <Text fontSize="lg" mb="4">
            Nature Watch is the work of World Resources Institute and Land &
            Carbon Lab, in collaboration with other teams working to shape the
            future of monitoring research, data and analysis.
          </Text>
        </Container>
        <Flex
          gap="12"
          alignItems="center"
          flexWrap="wrap"
          justifyContent="center"
        >
          <ChakraLink href="https://www.wri.org/">
            <Image src="/WRI-logo.svg" alt="WRI Logo" height="64px" />
          </ChakraLink>
          <ChakraLink href="https://landcarbonlab.org/">
            <Image src="/LCL-logo.svg" alt="LCL Logo" height="64px" />
          </ChakraLink>
          <ChakraLink href="https://www.bezosearthfund.org/">
            <Image src="/BEF-logo.png" alt="BEF Logo" height="64px" />
          </ChakraLink>
          <ChakraLink href="https://www.globalforestwatch.org/">
            <Image src="/GFW-logo.svg" alt="GFW Logo" height="64px" />
          </ChakraLink>
        </Flex>
      </Container>
    </Box>
  );
}

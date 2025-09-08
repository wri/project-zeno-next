import {
  Box,
  Container,
  Flex,
  Heading,
  Image,
  Text,
  Link as ChakraLink,
} from "@chakra-ui/react";

export default function FooterSection() {
  return (
    <Box
      as="footer"
      p={{ base: 6, md: 12 }}
      pb="0"
      bg="linear-gradient(98deg, #1D84BE -1.78%, #42A1DD 4.02%, #6ABFFF 20.15%, #C1E23E 78.8%, #E3F37F 99.99%)"
    >
      <Container
        css={{ "& > *": { px: 0 } }}
        display="flex"
        flexDir="column"
        gap={{ base: "10", md: "16" }}
      >
        <Flex
          justifyContent={{ base: "flex-start", md: "space-between" }}
          alignItems={{ base: "flex-start", md: "center" }}
          gap={4}
          flexDir={{ base: "column", md: "row" }}
        >
          <Heading size={{ base: "3xl", md: "5xl" }} fontWeight="semibold">
            Global Nature Watch
          </Heading>
          <Flex
            gap="12"
            alignItems={{ base: "flex-start", md: "center" }}
            flexWrap="wrap"
            justifyContent={{ base: "flex-start", md: "center" }}
          >
            <ChakraLink href="https://www.wri.org/" target="_blank" rel="noopener noreferrer">
              <Image src="/WRI-Logo-mono.svg" alt="WRI Logo" height="64px" />
            </ChakraLink>
            <ChakraLink href="https://landcarbonlab.org/" target="_blank" rel="noopener noreferrer">
              <Image src="/LCL-logo.svg" alt="LCL Logo" height="64px" />
            </ChakraLink>
            <ChakraLink href="https://www.bezosearthfund.org/" target="_blank" rel="noopener noreferrer">
              <Image src="/BEF-logo-mono.svg" alt="BEF Logo" height="64px" />
            </ChakraLink>
            <ChakraLink href="https://www.globalforestwatch.org/" target="_blank" rel="noopener noreferrer">
              <Image src="/GFW-logo-mono.svg" alt="GFW Logo" height="64px" />
            </ChakraLink>
            <ChakraLink href="https://developmentseed.org/" target="_blank" rel="noopener noreferrer">
              <Image src="/developmentseed-logo-mono.svg" alt="DevSeed Logo" height="64px" />
            </ChakraLink>
          </Flex>
        </Flex>
        <Flex
          justifyContent={{ base: "flex-start", md: "space-between" }}
          alignItems={{ base: "flex-start", md: "center" }}
          gap={4}
          pb="12"
          flexDir={{ base: "column", md: "row" }}
        >
          <Flex
            alignItems="center"
            justifyContent="flex-start"
            rowGap={6}
            columnGap={4}
            flexWrap="wrap"
            w="full"
          >
            <Text>{new Date().getFullYear()} Global Nature Watch</Text>
            <ChakraLink
              textDecoration="underline"
              textDecorationStyle="dotted"
              href="https://www.wri.org/about/privacy-policy?sitename=landcarbonlab.org&osanoid=5a6c3f87-bd10-4df7-80c7-375ce6a77691"
              target="_blank" rel="noopener noreferrer"
            >
              Privacy Policy
            </ChakraLink>
            <ChakraLink
              textDecoration="underline"
              textDecorationStyle="dotted"
              href="https://landcarbonlab.org/"
              target="_blank" rel="noopener noreferrer"
            >
              Cookie Preferences
            </ChakraLink>
            <ChakraLink
              textDecoration="underline"
              textDecorationStyle="dotted"
              href="https://www.wri.org/about/wri-data-platforms-tos"
              target="_blank" rel="noopener noreferrer"
            >
              Terms of Service
            </ChakraLink>
          </Flex>
          <Flex
            alignItems="center"
            justifyContent={{ base: "flex-start", md: "flex-end" }}
            rowGap={6}
            columnGap={4}
            flexWrap="wrap"
            w="full"
          >
            <ChakraLink
              textDecoration="underline"
              textDecorationStyle="dotted"
              href="https://www.instagram.com/landcarbonlab/"
              target="_blank" rel="noopener noreferrer"
            >
              Instagram
            </ChakraLink>
            <ChakraLink
              textDecoration="underline"
              textDecorationStyle="dotted"
              href="https://www.linkedin.com/showcase/land-carbon-lab/"
              target="_blank" rel="noopener noreferrer"
            >
              Linkedin
            </ChakraLink>
            <ChakraLink
              textDecoration="underline"
              textDecorationStyle="dotted"
              href="https://x.com/landcarbonlab"
              target="_blank" rel="noopener noreferrer"
            >
              Twitter
            </ChakraLink>
          </Flex>
        </Flex>
      </Container>
    </Box>
  );
}

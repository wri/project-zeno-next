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
      id="about"
      py={{ base: 14, md: 24 }}
      pb={{ base: 14, md: 28 }}
      borderBlockEnd="1px solid"
      borderColor="border"
    >
      <Container
        css={{ "& > *": { px: 0 } }}
        display="flex"
        flexDir="column"
        gap={{ base: "8", md: "14" }}
      >
        <Container textAlign="center" maxW="2xl">
          <Heading size={{ base: "3xl", md: "4xl" }}>
            The team behind Global Nature Watch
          </Heading>
          <Text fontSize="lg" mb="4">         
            Global Nature Watch is developed by Land & Carbon Lab, a research initiative
            convened by the Bezos Earth Fund and World Resources Institute, 
            in collaboration with other teams...
          </Text>
        </Container>
        <Flex
          gap="12"
          alignItems="center"
          flexWrap="wrap"
          justifyContent="center"
        >
          <ChakraLink href="https://www.wri.org/" target="_blank" rel="noopener noreferrer">
            <Image src="/WRI-Logo.svg" alt="WRI Logo" height="64px" />
          </ChakraLink>
          <ChakraLink href="https://landcarbonlab.org/" target="_blank" rel="noopener noreferrer">
            <Image src="/LCL-logo.svg" alt="LCL Logo" height="64px" />
          </ChakraLink>
          <ChakraLink href="https://www.bezosearthfund.org/" target="_blank" rel="noopener noreferrer">
            <Image src="/BEF-logo.png" alt="BEF Logo" height="64px" />
          </ChakraLink>
          <ChakraLink href="https://www.globalforestwatch.org/" target="_blank" rel="noopener noreferrer">
            <Image src="/GFW-logo.svg" alt="GFW Logo" height="64px" />
          </ChakraLink>
          <ChakraLink href="https://developmentseed.org/" target="_blank" rel="noopener noreferrer">
            <Image src="/developmentseed-logo.svg" alt="DevSeed Logo" height="64px" />
          </ChakraLink>
        </Flex>
      </Container>
    </Box>
  );
}

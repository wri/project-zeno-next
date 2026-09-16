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
      borderColor="border"
    >
      <Container
        css={{ "& > *": { px: 0 } }}
        display="flex"
        flexDir="column"
        gap={{ base: "6", md: "12" }}
      >
        <Container textAlign="center" maxW="2xl">
          <Heading size={{ base: "3xl", md: "4xl" }}>
            The team behind Global Nature Watch Horizon
          </Heading>
          <Text fontSize="lg" mb="4">
            Horizon is developed by Land & Carbon Lab, a research initiative
            convened by the Bezos Earth Fund and World Resources Institute, in
            collaboration with Global Nature Watch (formerly Global Forest
            Watch) and other partners shaping the future of monitoring research,
            data and analysis.
          </Text>
        </Container>
        <Box maxW="3xl" w="100%" mx="auto">
          <Text fontSize="lg" textAlign="center">
            Founding partners and supporters
          </Text>
        </Box>
        <Flex
          gap="10"
          alignItems="center"
          flexWrap="wrap"
          justifyContent="center"
        >
          <ChakraLink
            href="https://www.wri.org/"
            target="_blank"
            rel="noopener noreferrer"
          >
            <Image src="/WRI-Logo.svg" alt="WRI Logo" w="128px" h="64px" />
          </ChakraLink>
          <ChakraLink
            href="https://landcarbonlab.org/"
            target="_blank"
            rel="noopener noreferrer"
          >
            <Image src="/LCL-logo.svg" alt="LCL Logo" w="128px" h="64px" />
          </ChakraLink>
          <ChakraLink
            href="https://www.bezosearthfund.org/"
            target="_blank"
            rel="noopener noreferrer"
          >
            <Image src="/BEF-logo.png" alt="BEF Logo" w="128px" h="64px" />
          </ChakraLink>
          <ChakraLink
            href="https://www.globalnaturewatch.org/"
            target="_blank"
            rel="noopener noreferrer"
          >
            <Flex
              w="128px"
              h="64px"
              alignItems="center"
              justifyContent="center"
            >
              <Image
                src="/GNW_logo_4c.png"
                alt="GNW Logo"
                w="80px"
                h="40px"
                objectFit="contain"
              />
            </Flex>
          </ChakraLink>
          <ChakraLink
            href="https://developmentseed.org/"
            target="_blank"
            rel="noopener noreferrer"
          >
            <Image
              src="/developmentseed-logo.svg"
              alt="DevSeed Logo"
              w="128px"
              h="64px"
            />
          </ChakraLink>
          <ChakraLink
            href="https://www.nicfi.no/"
            target="_blank"
            rel="noopener noreferrer"
          >
            <Image src="/nicfi-logo.png" alt="NICFI Logo" w="128px" h="64px" />
          </ChakraLink>
          <ChakraLink
            href="https://www.google.org/"
            target="_blank"
            rel="noopener noreferrer"
          >
            <Image
              src="/google-org-logo.png"
              alt="Google.org Logo"
              w="128px"
              h="64px"
            />
          </ChakraLink>
        </Flex>
        <Box maxW="3xl" w="100%" mx="auto">
          <Text fontSize="lg" mb="2" textAlign="center">
            View the partners behind{" "}
            <ChakraLink
              href="https://landcarbonlab.org/about"
              target="_blank"
              rel="noopener noreferrer"
              textDecor="underline"
            >
              Land & Carbon Lab
            </ChakraLink>{" "}
            and{" "}
            <ChakraLink
              href="https://www.globalforestwatch.org/about"
              target="_blank"
              rel="noopener noreferrer"
              textDecor="underline"
            >
              Global Nature Watch
            </ChakraLink>
          </Text>
        </Box>
      </Container>
    </Box>
  );
}

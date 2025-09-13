import NextImage from "next/image";
import {
  Box,
  Container,
  Flex,
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
        gap={{ base: "6", md: "12" }}
      >
        <Container textAlign="center" maxW="2xl">
          <Heading size={{ base: "3xl", md: "4xl" }}>
            The team behind Global Nature Watch
          </Heading>
          <Text fontSize="lg" mb="4">         
          Global Nature Watch is developed by Land & Carbon Lab,
          a research initiative convened by the Bezos Earth Fund and World Resources Institute,
          in collaboration with other partners shaping the future of monitoring
          research, data and analysis.
          </Text>
        </Container>
        <Box maxW="3xl" w="100%" mx="auto">
          <Text fontSize="lg" textAlign="left">Founding partners</Text>
        </Box>
        <Flex
          gap="10"
          alignItems="center"
          flexWrap="wrap"
          justifyContent="center"
        >
          <ChakraLink href="https://www.wri.org/" target="_blank" rel="noopener noreferrer">
            <NextImage src="/WRI-Logo.svg" alt="WRI Logo" width={128} height={64} />
          </ChakraLink>
          <ChakraLink href="https://landcarbonlab.org/" target="_blank" rel="noopener noreferrer">
            <NextImage src="/LCL-logo.svg" alt="LCL Logo" width={128} height={64} />
          </ChakraLink>
          <ChakraLink href="https://www.bezosearthfund.org/" target="_blank" rel="noopener noreferrer">
            <NextImage src="/BEF-logo.png" alt="BEF Logo" width={128} height={64} />
          </ChakraLink>
          <ChakraLink href="https://www.globalforestwatch.org/" target="_blank" rel="noopener noreferrer">
            <NextImage src="/GFW-logo.svg" alt="GFW Logo" width={128} height={64} />
          </ChakraLink>
          <ChakraLink href="https://developmentseed.org/" target="_blank" rel="noopener noreferrer">
            <NextImage src="/developmentseed-logo.svg" alt="DevSeed Logo" width={128} height={64} />
          </ChakraLink>
          <ChakraLink href="https://www.nicfi.no/" target="_blank" rel="noopener noreferrer">
            <NextImage src="/nicfi-logo.png" alt="NICFI Logo" width={128} height={64} />
          </ChakraLink>
        </Flex>
        <Box maxW="3xl" w="100%" mx="auto">
          <Text fontSize="lg" mb="2" textAlign="left">
            View the partners behind{" "}
            <ChakraLink href="https://landcarbonlab.org/about" target="_blank" rel="noopener noreferrer" textDecor="underline">
              Land & Carbon Lab
            </ChakraLink>{" "}
            and{" "}
            <ChakraLink href="https://www.globalforestwatch.org/about" target="_blank" rel="noopener noreferrer" textDecor="underline">
              Global Forest Watch
            </ChakraLink>
          </Text>
        </Box>
      </Container>
    </Box>
  );
}

"use client";
import { Box, Container, Heading, Text, Flex, Image } from "@chakra-ui/react";
import LclLogo from "../components/LclLogo";

export default function NotFound() {
  return (
    <Box>
      <Box
        bg="bg.subtle"
        h={{ base: "calc(100vh - 5.5rem)", md: "calc(100vh - 3.5rem)" }}
        display="flex"
        flexDir="column"
        justifyContent="space-around"
      >
        <Flex alignItems="center" gap="2" justifyContent="center">
          <LclLogo avatarOnly />
          <Heading size="2xl" m={0}>
            Global Nature Watch
          </Heading>
        </Flex>
        <Container maxW="2xl" textAlign="center" alignContent="center">
          <Heading size={{ base: "4xl", md: "6xl" }} color="primary.800">
            The site is currently down for maintenance
          </Heading>
          <Heading as="p" size="2xl" fontWeight="normal">
            Sorry for any inconvenience. Please check back shortly!
          </Heading>
        </Container>
        <Flex
          w="full"
          overflow="hidden"
          mb={10}
          justifyContent="center"
          alignItems="center"
        >
          <Image
            maxW="full"
            flex="1"
            src="/maintenance-plug.svg"
            alt="plug illustration"
            opacity={0}
            animationName="dynamicSlideLeft, fade-in"
            animationDuration="0.48s, 0.32s"
            animationTimingFunction="ease-out, ease-out"
            animationIterationCount="1, 1"
            animationFillMode="forwards, forwards"
            css={{ "--start-x": "-0", "--end-x": "-80px" }}
          />
          <Image
            maxW="full"
            flex="1"
            ml="-40px"
            src="/maintenance-plug1.svg"
            alt="plug illustration"
            opacity={0}
            animationName="dynamicSlideRight, fade-in"
            animationDuration="0.48s, 0.32s"
            animationTimingFunction="ease-out, ease-out"
            animationIterationCount="1, 1"
            animationFillMode="forwards, forwards"
            css={{ "--start-x": "0", "--end-x": "80px" }}
          />
        </Flex>
      </Box>
      <Box
        as="footer"
        display="flex"
        flexDirection={{ base: "column", md: "row" }}
        justifyContent={{ base: "center", md: "space-between"}}
        alignItems="center"
        mt="auto"
        bg="white"
        p={4}
        fontSize="sm"
      >
        <Flex alignItems="center" gap="2">
          <LclLogo avatarOnly />
          <Text>Global Nature Watch</Text>
        </Flex>
        <Flex gap={6}>
          <a href="https://www.wri.org/about/privacy-policy">
            <Text as="span" textDecoration="underline" color="text.muted">
              Privacy Policy
            </Text>
          </a>
          <a href="https://help.globalnaturewatch.org/privacy-and-terms/global-nature-watch-ai-privacy-policy">
            <Text as="span" textDecoration="underline" color="text.muted">
              AI Privacy Policy
            </Text>
          </a>
          <a href="https://www.wri.org/about/legal/general-terms-use">
            <Text as="span" textDecoration="underline" color="text.muted">
              Terms of Use
            </Text>
          </a>
          <a href="https://help.globalnaturewatch.org/global-nature-watch-ai-terms-of-use">
            <Text as="span" textDecoration="underline" color="text.muted">
              AI Terms of Use
            </Text>
          </a>
        </Flex>
        <Text>©Global Nature Watch {new Date().getFullYear()}</Text>
      </Box>
    </Box>
  );
}

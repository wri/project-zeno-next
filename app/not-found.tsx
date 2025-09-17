"use client";
import { Box, Container, Heading, Text, Flex } from "@chakra-ui/react";
import { WarningIcon } from "@phosphor-icons/react";
import Link from "next/link";
import LclLogo from "./components/LclLogo";

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
            Page not found
          </Heading>
          <Heading as="p" size="2xl" fontWeight="normal">
            The link you entered does not exist. Please check the link or visit
            our{" "}
            <Link href="/">
              <Text as="span" textDecoration="underline" color="primary.solid">
                home page
              </Text>
            </Link>
            .
          </Heading>
        </Container>
        <Container
          maxW="md"
          bg="red.100"
          rounded="2xl"
          p={5}
          mb={10}
          animationName="slide-from-bottom-full, fade-in"
          animationDuration="0.4s, 0.6s"
          animationTimingFunction="ease-out, ease-out"
          animationFillMode="forwards, forwards"
          animationIterationCount="1, 1"
        >
          <Flex gap={2}>
            <Box
              bg="red.200"
              h={4}
              w={4}
              rounded="full"
              opacity={0}
              animationName="fade-in"
              animationDuration="0.2s"
              animationDelay="0.4s"
              animationTimingFunction="ease-out"
              animationFillMode="forwards"
              animationIterationCount="1"
            />
            <Box
              bg="red.200"
              h={4}
              w={4}
              rounded="full"
              opacity={0}
              animationName="fade-in"
              animationDuration="0.2s"
              animationDelay="0.5s"
              animationTimingFunction="ease-out"
              animationFillMode="forwards"
              animationIterationCount="1"
            />
            <Box
              bg="red.200"
              h={4}
              w={4}
              rounded="full"
              opacity={0}
              animationName="fade-in"
              animationDuration="0.2s"
              animationDelay="0.6s"
              animationTimingFunction="ease-out"
              animationFillMode="forwards"
              animationIterationCount="1"
            />
          </Flex>
          <Flex
            gap={4}
            alignItems="center"
            justifyContent="center"
            color="red.700"
            marginInline={"auto"}
            p={20}
            px={16}
            opacity={0}
            animationName="fade-in"
            animationDuration="1s"
            animationDelay="0.4s"
            animationTimingFunction="ease-out"
            animationFillMode="forwards"
            animationIterationCount="1"
          >
            <WarningIcon size={64} weight="fill" />
            <Heading m={0} size="7xl" fontWeight="normal" color="current">
              404
            </Heading>
          </Flex>
        </Container>
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
          <a href="https://www.wri.org/about/legal/general-terms-use">
            <Text as="span" textDecoration="underline" color="text.muted">
              Terms of Service
            </Text>
          </a>
        </Flex>
        <Text>©Global Nature Watch {new Date().getFullYear()}</Text>
      </Box>
    </Box>
  );
}

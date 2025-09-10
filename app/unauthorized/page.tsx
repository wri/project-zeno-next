"use client";

import {
  Box,
  Button,
  ButtonGroup,
  Container,
  Flex,
  Heading,
  Text,
} from "@chakra-ui/react";

import Link from "next/link";

const WAITLIST_URL = process.env.NEXT_PUBLIC_WAITLIST_URL || "/";

import GlobalHeader from "../components/GlobalHeader";

export default function UnauthorizedPage() {
  return (
    <Box>
      <Box
        width="100%"
        height="100%"
        bg="#0D1429"
        position="absolute"
        top={0}
        zIndex="0"
        pointerEvents="none"
        css={{
          "& > video": {
            height: "100%",
            width: "100%",
            objectFit: "cover",
            objectPosition: "top",
          },
        }}
      >
        <video autoPlay loop muted playsInline preload="auto">
          <source src={"/landing-hero-bg.mp4"} type="video/mp4" />
        </video>
      </Box>
      <Box
        pt={{ base: 14, md: 24 }}
        pb={{ base: 24, md: 32 }}
        zIndex="10"
        minH={{ base: "none", xl: "45vh" }}
      >
        <Container
          textAlign="center"
          maxW="lg"
          color="fg.inverted"
          px={0}
          display="flex"
          flexDirection="column"
          gap="4"
        >
          <Heading
            size={{ base: "3xl", md: "5xl" }}
            textShadow="2px 2px 5px hsla(225, 52%, 11%, 0.75)"
            color="fg.inverted"
            mb={0}
          >
            Early access only
          </Heading>
          <Text
            fontSize="lg"
            textShadow="2px 2px 5px hsla(225, 52%, 11%, 0.75)"
            marginBottom={4}
          >
            Thank you for your interest in Global Nature Watch!
          </Text>
          <Text
            fontSize="lg"
            textShadow="2px 2px 5px hsla(225, 52%, 11%, 0.75)"
          >
            Right now access is limited while we are in closed beta. We&apos;d
            love for you to be part of what&apos;s next, so join the waitlist to
            be among the first to know when the tool becomes available.
          </Text>
          <Flex justifyContent="center">
            <Button
              asChild
              size="sm"
              className="light"
              variant="solid"
              colorPalette="primary"
              rounded="lg"
            >
              <Link href="/">Back to homepage</Link>
            </Button>
            <Button
              asChild
              size="sm"
              ml={4}
              className="light"
              variant="solid"
              colorPalette="primary"
              rounded="lg"
            >
              <Link
                href="https://forms.office.com/r/jmFh27TUUz"
                rel="noreferrer"
                target="_blank"
              >
                Join waitlist
              </Link>
            </Button>
          </Flex>
        </Container>
      </Box>
    </Box>
  );
}

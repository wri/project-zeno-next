"use client";

import { Box, Button, Container, Flex, Heading, Text } from "@chakra-ui/react";

import Link from "next/link";

const LANDING_PAGE_VERSION = process.env.NEXT_PUBLIC_LANDING_PAGE_VERSION;

const commonStyles = {
  textShadow: "2px 2px 5px hsla(225, 52%, 11%, 0.75)",
  color: "fg.inverted",
};

export default function UnauthorizedPage() {
  return (
    <Box bg="hsla(225, 52%, 11%, 1)">
      <Box
        position="absolute"
        top={20} // adjust this to "lower" the video, but the video top and background colors aren't exactly the same
        left={0}
        right={0}
        bottom={0}
        bg="#1d358d"
        zIndex="0"
        pointerEvents="none"
      >
        <video
          autoPlay
          loop
          muted
          playsInline
          preload="auto"
          style={{
            height: "100%",
            width: "100%",
            objectFit: "cover",
            objectPosition: "top",
          }}
        >
          <source src="/landing-hero-bg.mp4" type="video/mp4" />
        </video>
      </Box>
      <Container
        textAlign="center"
        maxW="lg"
        {...commonStyles}
        py={10}
        display="flex"
        flexDirection="column"
        gap="6"
        pt={{ base: 8, md: 12 }}
        pb={{ base: 24, md: 32 }}
        zIndex="10"
        minH={{ base: "none", xl: "45vh" }}
      >
        <Heading
          size={{ base: "2xl", md: "4xl" }}
          {...commonStyles}
          mb={10}
          letterSpacing={-2.5}
        >
          Global Nature Watch
        </Heading>
        <Heading size={{ base: "3xl", md: "5xl" }} {...commonStyles} mb={0}>
          {LANDING_PAGE_VERSION === "closed"
            ? "Early access only"
            : "Coming soon"}
        </Heading>
        {LANDING_PAGE_VERSION === "closed" ? (
          <>
            <Text fontSize="lg" {...commonStyles} marginBottom={4}>
              Thank you for your interest in Global Nature Watch!
            </Text>
            <Text fontSize="lg" {...commonStyles}>
              Right now access is limited while we are in closed beta. We&apos;d
              love for you to be part of what&apos;s next, so join the waitlist
              to be among the first to know when the tool becomes available.
            </Text>
          </>
        ) : (
          <Text fontSize="lg" {...commonStyles}>
            Thank you for creating a Global Nature Watch account. Early access
            is limited while we scale responsibly. You’re on the waitlist, and
            we will email you as soon as the tool is ready.
          </Text>
        )}
        <Flex justifyContent="center" gap={4}>
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
          {LANDING_PAGE_VERSION === "closed" && (
            <Button
              asChild
              size="sm"
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
          )}
        </Flex>
      </Container>
    </Box>
  );
}

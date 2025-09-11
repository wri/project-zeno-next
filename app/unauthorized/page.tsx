"use client";

import { Box, Button, Container, Flex, Heading, Text } from "@chakra-ui/react";

import Link from "next/link";

const LANDING_PAGE_VERSION = process.env.NEXT_PUBLIC_LANDING_PAGE_VERSION;

export default function UnauthorizedPage() {
  return (
    <Box bg="hsla(225, 52%, 11%, 1)">
      <Box
        width="100%"
        height="100%"
        bg="#1d358d"
        position="absolute"
        top={20}
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
      <Container
        textAlign="center"
        maxW="lg"
        color="fg.inverted"
        py={10}
        display="flex"
        flexDirection="column"
        gap="4"
      >
        <Heading
          size={{ base: "2xl", md: "4xl" }}
          textShadow="2px 2px 5px hsla(225, 52%, 11%, 0.75)"
          color="fg.inverted"
          mb={0}
          letterSpacing={-2.5}
        >
          Global Nature Watch
        </Heading>
      </Container>
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
            {LANDING_PAGE_VERSION === "closed"
              ? "Early access only"
              : "Only available to pre-approved email addresses"}
          </Heading>
          {LANDING_PAGE_VERSION === "closed" ? (
            <>
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
                Right now access is limited while we are in closed beta.
                We&apos;d love for you to be part of what&apos;s next, so join
                the waitlist to be among the first to know when the tool becomes
                available.
              </Text>
            </>
          ) : (
            <Text
              fontSize="lg"
              textShadow="2px 2px 5px hsla(225, 52%, 11%, 0.75)"
            >
              Thank you for showing interest in Global Nature Watch, the tool
              can currently only be accessed by those invited to early access.
              If you have not been notified of early access, please join the
              waitlist.
            </Text>
          )}
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
      <Box height="200px">
        <Text>Hello</Text>
      </Box>
    </Box>
  );
}

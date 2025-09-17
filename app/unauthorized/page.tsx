"use client";

import {
  Box,
  Button,
  Container,
  Flex,
  Heading,
  Text,
  Link as ChakraLink,
} from "@chakra-ui/react";
import { useEffect } from "react";
import LclLogo from "../components/LclLogo";
import useAuthStore from "../store/authStore";
import { useErrorHandler } from "../hooks/useErrorHandler";

const LANDING_PAGE_VERSION = process.env.NEXT_PUBLIC_LANDING_PAGE_VERSION;

const commonStyles = {
  textShadow: "2px 2px 5px hsla(225, 52%, 11%, 0.75)",
  color: "fg.inverted",
};

export default function UnauthorizedPage() {
  const { isSignupOpen, fetchMetadata } = useAuthStore();
  const { showApiError } = useErrorHandler();

  useEffect(() => {
    fetchMetadata().catch((error) => {
      showApiError(error, {
        title: "Failed to load signup status",
        description:
          "Unable to check if signup is currently open. Please try again later.",
      });
    });
  }, [fetchMetadata, showApiError]);

  return (
    <Box
      bg="hsla(225, 52%, 11%, 1)"
      minH="100dvh"
      display="flex"
      flexDirection="column"
      position="relative"
      overflow="hidden"
    >
      <Box
        position="absolute"
        left={0}
        right={0}
        bottom={-200}
        bg="#0D1429"
        zIndex="0"
        pointerEvents="none"
        height="70%"
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
            objectPosition: "bottom",
          }}
        >
        <source src={"/landing-hero-bg.webm"} type="video/webm" />
        </video>
      </Box>
      <Container
        textAlign="center"
        maxW="2xl"
        {...commonStyles}
        py={10}
        display="flex"
        flexDirection="column"
        gap="6"
        pt={{ base: 8, md: 12 }}
        pb={{ base: 24, md: 32 }}
        zIndex="10"
        minH={{ base: "none", xl: "45vh" }}
        flex={1}
      >
        <Flex alignItems="center" gap="2" justifyContent="center" mb={10}>
          <LclLogo width={18} avatarOnly />
          <Heading
            size={{ base: "2xl", md: "4xl" }}
            {...commonStyles}
            m={0}
            letterSpacing={-2.5}
          >
            Global Nature Watch
          </Heading>
        </Flex>
        <Heading size={{ base: "3xl", md: "5xl" }} {...commonStyles} mb={0}>
          {LANDING_PAGE_VERSION === "closed" && !isSignupOpen
            ? "Early access only"
            : "Coming soon"}
        </Heading>
        {LANDING_PAGE_VERSION === "closed" && !isSignupOpen ? (
          <>
            <Text fontSize={{ base: "xl", md: "2xl"}} {...commonStyles} marginBottom={4}>
              Thank you for your interest in Global Nature Watch!
            </Text>
            <Text fontSize={{ base: "xl", md: "2xl"}} {...commonStyles}>
              Right now access is limited while we are in closed beta. We&apos;d
              love for you to be part of what&apos;s next, so join the waitlist
              to be among the first to know when the tool becomes available.
            </Text>
          </>
        ) : (
          <Text px={3} maxW="xl" fontSize={{ base: "xl", md: "2xl"}} {...commonStyles}>
            Thank you for creating a Global Nature Watch account. Early access
            is limited while we scale responsibly. You&apos;re on the waitlist,
            and we will email you as soon as the tool is ready.
          </Text>
        )}
        <Flex justifyContent="center" gap={4}>
          <Button
            asChild
            size="md"
            className="light"
            variant="solid"
            colorPalette="primary"
            rounded="lg"
          >
            <ChakraLink href="/">Back to homepage</ChakraLink>
          </Button>
          {LANDING_PAGE_VERSION === "closed" && !isSignupOpen && (
            <Button
              asChild
              size="md"
              className="light"
              variant="solid"
              colorPalette="primary"
              rounded="lg"
            >
              <ChakraLink
                href="https://forms.office.com/r/jmFh27TUUz"
                rel="noreferrer"
                target="_blank"
              >
                Join waitlist
              </ChakraLink>
            </Button>
          )}
        </Flex>
      </Container>
      <Container
        as="footer"
        py={8}
        px={4}
        height="56px"
        maxWidth="100%"
        backgroundColor={"white"}
        display="flex"
        justifyContent="space-between"
        alignItems="center"
        gap={8}
        flexWrap={"nowrap"}
      >
        <Flex flexWrap={"nowrap"} gap={"8px"}>
          <LclLogo width={16} avatarOnly />
          <Text letterSpacing={-1}>Global Nature Watch</Text>
        </Flex>
        <Flex gap={"24px"} fontSize="sm" display={{ base: "none", md: "flex" }}>
          <ChakraLink
            textDecoration="underline"
            textDecorationStyle="dotted"
            rel="noreferrer"
            target="_blank"
            href="https://www.wri.org/about/privacy-policy?sitename=landcarbonlab.org&osanoid=5a6c3f87-bd10-4df7-80c7-375ce6a77691"
          >
            Privacy Policy
          </ChakraLink>
          <ChakraLink
            textDecoration="underline"
            textDecorationStyle="dotted"
            rel="noreferrer"
            target="_blank"
            href="https://www.wri.org/about/legal/general-terms-use"
          >
            Terms of service
          </ChakraLink>
        </Flex>
        <Text fontSize="sm" display={{ base: "none", md: "flex" }}>
          © Global Nature Watch {new Date().getFullYear()}
        </Text>
      </Container>
    </Box>
  );
}

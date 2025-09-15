"use client";

import {
  Box,
  Button,
  ButtonGroup,
  CloseButton,
  Container,
  Drawer,
  Flex,
  Heading,
  Portal,
  Text,
} from "@chakra-ui/react";
import Link from "next/link";
import LclLogo from "./LclLogo";

const LANDING_PAGE_VERSION = process.env.NEXT_PUBLIC_LANDING_PAGE_VERSION;

const renderNavItems = (isMobile: boolean): React.ReactElement | null => {
  return (
    <ButtonGroup
      size={{ base: "md", md: "xs", lg: "sm" }}
      w={isMobile ? "full" : "initial"}
      gap={{ base: 4, sm: 1, lg: 2 }}
      variant="plain"
      _hover={{ "& > :not(:hover)": { opacity: "0.5" } }}
      className="dark"
      colorPalette="gray"
      orientation={isMobile ? "vertical" : "horizontal"}
      css={
        isMobile && {
          "& > *": {
            justifyContent: "flex-start",
            width: "100%",
          },
        }
      }
    >
      <Button asChild>
        <Link href="#use-cases">Use cases</Link>
      </Button>
      <Button asChild>
        <Link href="#technology">Technology</Link>
      </Button>
      <Button asChild>
        <Link href="#research">Research</Link>
      </Button>
      <Button asChild>
        <Link href="#about">About</Link>
      </Button>
      {LANDING_PAGE_VERSION === "closed" && (
        <Button
          asChild
          ml={4}
          variant="outline"
          colorPalette="white"
          rounded="lg"
          borderColor="white"
        >
          <Link href="/app">Sign in (invite only)</Link>
        </Button>
      )}
      <Button
        asChild
        ml={4}
        className="light"
        variant="solid"
        colorPalette="primary"
        rounded="lg"
      >
        {LANDING_PAGE_VERSION === "closed" ? (
          <Link
            href="https://forms.office.com/r/jmFh27TUUz"
            rel="noreferrer"
            target="_blank"
          >
            Join waitlist
          </Link>
        ) : (
          <Link href="/app">Explore the beta</Link>
        )}
      </Button>
    </ButtonGroup>
  );
};

export default function GlobalHeader() {
  return (
    <Container
      display="flex"
      alignItems="center"
      justifyContent="space-between"
      maxW="8xl"
      color="fg.inverted"
      py="2"
      zIndex="10"
      backdropBlur="10px"
    >
      <Flex
        divideColor={"neutral.600"}
        divideStyle={"solid"}
        divideX={{ base: "0px", md: "1px" }}
        flexDir={{ base: "column", md: "row" }}
        alignItems={{ base: "flex-start", md: "center" }}
        gap={{ base: 2, md: 4 }}
      >
        <Flex alignItems="center" gap={2}>
          <Box as="span" flexShrink={0}>
            <LclLogo width={16} avatarOnly />
          </Box>
          <Heading
            m="0"
            size={{ base: "xl", lg: "2xl" }}
            lineHeight="shorter"
            color="fg.inverted"
          >
            Global Nature Watch
          </Heading>
        </Flex>
        <Text
          pl={{ base: 0, md: 4 }}
          fontSize="xs"
          display="inline-block"
          lineHeight="1.1"
          maxW={{ base: "none", md: "200px" }}
        >
          Turning intelligent monitoring into impact
        </Text>
      </Flex>
      <Drawer.Root size="md">
        <Drawer.Trigger asChild>
          <Button
            hideFrom="md"
            variant="solid"
            colorPalette="primary"
            rounded="lg"
          >
            Menu
          </Button>
        </Drawer.Trigger>
        <Portal>
          <Drawer.Backdrop />
          <Drawer.Positioner>
            <Drawer.Content
              hideFrom="md"
              backgroundImage="radial-gradient(circle at 80% 80%, hsl(225deg 70% 15%) 0%, hsl(224deg 65% 11%) 50%)"
            >
              <Drawer.Header>
                <Drawer.Title color="fg.inverted" fontSize="2xl">
                  Global Nature Watch
                </Drawer.Title>
              </Drawer.Header>
              <Drawer.Body>{renderNavItems(true)}</Drawer.Body>
              <Drawer.CloseTrigger asChild>
                <CloseButton
                  size="sm"
                  className="dark"
                  colorPalette="primary"
                  variant="plain"
                />
              </Drawer.CloseTrigger>
            </Drawer.Content>
          </Drawer.Positioner>
        </Portal>
      </Drawer.Root>
      <Flex hideBelow="md">{renderNavItems(false)}</Flex>
    </Container>
  );
}

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
import { useState } from "react";
import { useTranslations } from "next-intl";
import Link from "next/link";
import LclLogo from "./LclLogo";

const LANDING_PAGE_VERSION = process.env.NEXT_PUBLIC_LANDING_PAGE_VERSION;

function NavItems({
  isMobile,
  setNavOpen,
}: {
  isMobile: boolean;
  setNavOpen?: (open: boolean) => void;
}) {
  const t = useTranslations("common");
  return (
    <ButtonGroup
      size={{ base: "md", md: "xs", lg: "sm" }}
      w={isMobile ? "full" : "initial"}
      gap={{ base: 4, md: 1, lg: 2 }}
      variant="plain"
      _hover={{ "& > :not(:hover)": { opacity: "0.5" } }}
      className="dark"
      colorPalette="gray"
      rounded="lg"
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
      <Button asChild onClick={() => setNavOpen && setNavOpen(false)}>
        <Link href="#use-cases">{t("nav.useCases")}</Link>
      </Button>
      <Button asChild onClick={() => setNavOpen && setNavOpen(false)}>
        <Link href="#technology">{t("nav.technology")}</Link>
      </Button>
      <Button asChild onClick={() => setNavOpen && setNavOpen(false)}>
        <Link href="#research">{t("nav.research")}</Link>
      </Button>
      <Button asChild onClick={() => setNavOpen && setNavOpen(false)}>
        <Link href="#about">{t("nav.about")}</Link>
      </Button>
      {LANDING_PAGE_VERSION === "closed" && (
        <Button
          asChild
          ml={{ base: 0, md: 1 }}
          variant="outline"
          borderColor="white"
          _hover={{
            bg: "whiteAlpha.100",
          }}
          onClick={() => setNavOpen && setNavOpen(false)}
        >
          <Link href="/app">{t("nav.signIn")}</Link>
        </Button>
      )}
      <Button
        asChild
        ml={{ base: 0, md: 1 }}
        className="light"
        variant="solid"
        colorPalette="primary"
      >
        {LANDING_PAGE_VERSION === "closed" ? (
          <Link
            href="https://forms.office.com/r/jmFh27TUUz"
            rel="noreferrer"
            target="_blank"
          >
            {t("nav.joinWaitlist")}
          </Link>
        ) : (
          <Link href="/app" onClick={() => setNavOpen && setNavOpen(false)}>
            {t("nav.explorePreview")}
          </Link>
        )}
      </Button>
    </ButtonGroup>
  );
}

export default function GlobalHeader() {
  const t = useTranslations("common");
  const [openNav, setNavOpen] = useState(false);
  return (
    <Container
      display="flex"
      alignItems="center"
      flexWrap={{ base: "nowrap", md: "wrap" }}
      justifyContent="space-between"
      maxW="8xl"
      color="fg.inverted"
      py={2}
      pt={4}
      zIndex={10}
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
            {t("appName")}
          </Heading>
        </Flex>
        <Text
          pl={{ base: 0, md: 4 }}
          fontSize="xs"
          display="inline-block"
          lineHeight="1.1"
          maxW={{ base: "none", md: "200px" }}
        >
          {t("tagline")}
        </Text>
      </Flex>
      <Drawer.Root
        size="md"
        open={openNav}
        onOpenChange={(e) => setNavOpen(e.open)}
      >
        <Drawer.Trigger asChild>
          <Button
            hideFrom="md"
            variant="solid"
            colorPalette="primary"
            rounded="lg"
          >
            {t("nav.menu")}
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
                  {t("appName")}
                </Drawer.Title>
              </Drawer.Header>
              <Drawer.Body>
                <NavItems isMobile setNavOpen={setNavOpen} />
              </Drawer.Body>
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
      <Flex ml="auto" hideBelow="md">
        <NavItems isMobile={false} />
      </Flex>
    </Container>
  );
}

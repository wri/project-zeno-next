"use client";

import {
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

const renderNavItems = (isMobile: boolean): React.ReactElement | null => {
  return (
    <ButtonGroup
      size={isMobile ? "md" : "sm"}
      w={isMobile ? "full" : "initial"}
      gap={isMobile ? "4" : "2"}
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
        <Link href="#">Testimonials</Link>
      </Button>
      <Button asChild>
        <Link href="#">Use cases</Link>
      </Button>
      <Button asChild>
        <Link href="#">Research</Link>
      </Button>
      <Button asChild>
        <Link href="#">Technology</Link>
      </Button>
      <Button asChild>
        <Link href="#">Team</Link>
      </Button>
      <Button asChild ml={4} variant="solid" colorPalette="blue" rounded="lg">
        <Link href="/">Try the preview</Link>
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
        divideColor={"whiteAlpha.300"}
        divideStyle={"solid"}
        divideX={"1px"}
        alignItems="center"
        gap="4"
      >
        <Heading m="0" size="xl" lineHeight="shorter">
          Global Nature Watch
        </Heading>
        <Text pl="4" fontSize="xs" display="inline-block" lineHeight="1.1">
          Intelligent nature monitoring,
          <br /> trusted by experts
        </Text>
      </Flex>
      <Drawer.Root size="md">
        <Drawer.Trigger asChild>
          <Button
            hideFrom="md"
            colorPalette="blue"
            rounded="lg"
            variant="solid"
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
                  colorPalette="blue"
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

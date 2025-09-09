"use client";
import { Box, Container, Heading, Text, Flex } from "@chakra-ui/react";
import { WarningIcon } from "@phosphor-icons/react";
import Link from "next/link";

export default function NotFound() {
  return (
    <Box bg="bg.subtle" h="100vh" display="flex" flexDir="column">
      <Heading size="2xl" mt={8} marginInline="auto">
        Global Nature Watch
      </Heading>
      <Container
        maxW="2xl"
        textAlign="center"
        flex="1"
        alignContent="center"
      >
        <Heading size="6xl" color="primary.800">
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
        <Container maxW="md" bg="red.100" rounded="2xl" p={5} mt={16}>
          <Flex gap={2}>
            <Box bg="red.200" h={4} w={4} rounded="full" />
            <Box bg="red.200" h={4} w={4} rounded="full" />
            <Box bg="red.200" h={4} w={4} rounded="full" />
          </Flex>
          <Flex
            gap={4}
            alignItems="center"
            justifyContent="center"
            color="red.700"
            marginInline={"auto"}
            p={20}
            px={16}
          >
            <WarningIcon size={64} weight="fill" />
            <Heading m={0} size="7xl" fontWeight="normal" color="current">
              404
            </Heading>
          </Flex>
        </Container>
      </Container>

      <Box
        as="footer"
        display="flex"
        justifyContent="space-between"
        mt="auto"
        bg="white"
        p={4}
      >
        <Text>Global Nature Watch</Text>
        <Flex gap={6}>
          <Link href="/">
            <Text as="span" textDecoration="underline" color="text.muted">
              Privacy Policy
            </Text>
          </Link>
          <Link href="/">
            <Text as="span" textDecoration="underline" color="text.muted">
              Terms of Service
            </Text>
          </Link>
        </Flex>
        <Text>©Global Nature Watch 2025</Text>
      </Box>
    </Box>
  );
}

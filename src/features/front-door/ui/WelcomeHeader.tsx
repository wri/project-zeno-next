"use client";

import { Badge, Button, Flex, Heading, Text } from "@chakra-ui/react";
import { ArrowLeftIcon } from "@phosphor-icons/react";
import { useRouter } from "@/app/lib/router";

/**
 * The header row of /welcome: the Horizon name (an h2: the page's h1 is the
 * greeting below), the PREVIEW badge, and "Go back" to the landing page.
 */
export function WelcomeHeader() {
  const router = useRouter();
  return (
    <Flex justifyContent="space-between" mb={12}>
      <Flex gap="2" alignItems="center">
        <Heading m={0} as="h2" size="md" color="primary.fg">
          Global Nature Watch{" "}
          <Text as="span" fontWeight="normal">
            Horizon
          </Text>
        </Heading>
        <Badge
          colorPalette="primary"
          bg="primary.800"
          letterSpacing="wider"
          variant="solid"
          size="xs"
        >
          PREVIEW
        </Badge>
      </Flex>
      <Button
        colorPalette="primary"
        variant="ghost"
        onClick={() => router.push("/")}
      >
        <ArrowLeftIcon />
        Go back
      </Button>
    </Flex>
  );
}

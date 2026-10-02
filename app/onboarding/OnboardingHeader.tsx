"use client";

import { Badge, Button, Flex, Heading, Text } from "@chakra-ui/react";
import { ArrowLeftIcon } from "@phosphor-icons/react";
import { useRouter } from "@/app/lib/router";

/**
 * The header row of the sign-up pages (/onboarding, /welcome): the Horizon
 * name, the PREVIEW badge, and "Go back" to the landing page.
 */
export function OnboardingHeader({
  headingAs = "h1",
}: {
  /** /welcome has its own h1 below, so it passes "h2". */
  headingAs?: "h1" | "h2";
}) {
  const router = useRouter();
  return (
    <Flex justifyContent="space-between" mb={12}>
      <Flex gap="2" alignItems="center">
        <Heading m={0} as={headingAs} size="md" color="primary.fg">
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

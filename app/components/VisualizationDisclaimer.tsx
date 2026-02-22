"use client";
import { Box, Flex, Text, chakra } from "@chakra-ui/react";
import { SparkleIcon } from "@phosphor-icons/react";
import { useTranslations } from "next-intl";
const Sparkle = chakra(SparkleIcon);

interface VisualizationDisclaimerProps {
  variant?: "inline" | "overlay";
}

export default function VisualizationDisclaimer({
  variant = "inline",
}: VisualizationDisclaimerProps) {
  const t = useTranslations("chat");

  const content = (
    <Flex align="flex-start" gap="2">
      <Sparkle color="secondary.500" weight="fill" mt="0.5" />
      <Text fontSize="xs" color="fg.muted" flex="1">
        {t("visualizationDisclaimer")}
      </Text>
    </Flex>
  );

  if (variant === "overlay") {
    return (
      <Box
        bg="bg"
        color="fg"
        borderRadius="md"
        borderWidth="1px"
        borderColor="border.emphasized"
        p="2.5"
        maxW={{ base: "calc(100% - 16px)", md: "640px" }}
      >
        {content}
      </Box>
    );
  }

  return (
    <Box
      bg="bg"
      color="fg"
      borderRadius="md"
      borderWidth="1px"
      borderColor="border.emphasized"
      p="2.5"
    >
      {content}
    </Box>
  );
}

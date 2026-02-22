"use client";
import { Box, Collapsible, Flex, Text, Spinner } from "@chakra-ui/react";
import { CaretDownIcon, CaretRightIcon } from "@phosphor-icons/react";
import { useState } from "react";
import { useTranslations } from "next-intl";
import useChatStore from "@/app/store/chatStore";

function Reasoning() {
  const t = useTranslations("chat");
  const [isOpen, setIsOpen] = useState(false);
  const { toolSteps } = useChatStore();

  const formatToolName = (toolName: string): string => {
    const key = `reasoning.tools.${toolName}` as const;
    try {
      return t(key);
    } catch {
      return t("reasoning.toolFallback", { name: toolName });
    }
  };

  return (
    <Collapsible.Root open={isOpen} onOpenChange={(e) => setIsOpen(e.open)}>
      <Collapsible.Trigger>
        <Flex justifyContent="flex-start" alignItems="center" gap="3" mb={4}>
          <Spinner size="sm" color="fg.muted" />
          <Text fontSize="sm" color="fg.muted">
            {t("reasoning.title")}
          </Text>
          {isOpen ? <CaretDownIcon /> : <CaretRightIcon />}
        </Flex>
      </Collapsible.Trigger>
      <Collapsible.Content>
        <Box
          bg="bg.muted"
          borderRadius="sm"
          paddingTop="8px"
          paddingBottom="8px"
          paddingLeft={3}
          paddingRight={3}
          marginBottom={4}
          gap={2}
          fontFamily="mono"
          fontSize="xs"
        >
          {toolSteps.length === 0 ? (
            <Text color="fg.muted">{t("reasoning.processing")}</Text>
          ) : (
            toolSteps.map((toolName, index) => (
              <Text key={`${toolName}-${index}`} color="fg.muted" mb={1}>
                • {formatToolName(toolName)}
              </Text>
            ))
          )}
        </Box>
      </Collapsible.Content>
    </Collapsible.Root>
  );
}

export default Reasoning;

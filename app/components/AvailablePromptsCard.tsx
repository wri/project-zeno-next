import { Box, Text } from "@chakra-ui/react";

import { usePromptQuota } from "../hooks/usePromptQuota";
import { useTranslation } from "@/src/shared/lib/i18n";

/**
 * "Available prompts" card: today's usage as "X / Y daily prompts" over a
 * usage bar. Shown where the chat has no prompt box (the chat panel's
 * history view). Reads the auth store reactively, so it follows each prompt.
 */
function AvailablePromptsCard() {
  const { t } = useTranslation();
  const { usedPrompts, totalPrompts } = usePromptQuota();
  const percent =
    totalPrompts > 0 ? Math.min(100, (usedPrompts / totalPrompts) * 100) : 0;

  return (
    <Box
      borderWidth="1px"
      borderColor="border"
      rounded="sm"
      p="4"
      data-testid="available-prompts-card"
    >
      <Text fontSize="sm" fontWeight="medium" color="fg">
        {t("sidebar.prompts.title")}
      </Text>
      <Text fontSize="xs" color="fg.muted" mb="2">
        {t("sidebar.prompts.count", { used: usedPrompts, total: totalPrompts })}
      </Text>
      <Box
        role="progressbar"
        aria-label={t("sidebar.prompts.used")}
        aria-valuemin={0}
        aria-valuemax={totalPrompts}
        aria-valuenow={Math.min(usedPrompts, totalPrompts)}
        h="4px"
        bg="neutral.200"
        rounded="full"
        overflow="hidden"
      >
        <Box h="full" w={`${percent}%`} bg="secondary.400" rounded="full" />
      </Box>
    </Box>
  );
}

export default AvailablePromptsCard;

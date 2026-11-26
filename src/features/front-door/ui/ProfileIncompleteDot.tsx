"use client";

import { Box } from "@chakra-ui/react";
import { useTranslation } from "@/src/shared/lib/i18n";

/** The small "profile not complete" marker on the account button and menu. */
export function ProfileIncompleteDot() {
  const { t } = useTranslation();
  return (
    <Box
      as="span"
      role="img"
      aria-label={t("header.account.incomplete")}
      w="2"
      h="2"
      rounded="full"
      bg="notification"
      flexShrink={0}
    />
  );
}

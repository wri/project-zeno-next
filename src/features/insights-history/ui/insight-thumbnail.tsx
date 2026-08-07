"use client";

import { Flex } from "@chakra-ui/react";

import type { InsightWidget } from "@/app/types/chat";
import { WidgetIconComponent } from "@/app/utils/widgetIcons";

export const INSIGHT_LABEL_COLOR = "#0049AA";
export const INSIGHT_SELECTED_BG = "rgba(0, 73, 170, 0.06)";

/** Chart-type icon tile used by the Analyses pane's cards. */
export function InsightThumbnail({ type }: { type: InsightWidget["type"] }) {
  const Icon = WidgetIconComponent[type];
  return (
    <Flex w="100%" h="100%" align="center" justify="center" bg="primary.25">
      <Icon size={28} color={INSIGHT_LABEL_COLOR} weight="thin" />
    </Flex>
  );
}

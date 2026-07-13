"use client";

import { Box, Flex, Heading, Text } from "@chakra-ui/react";

import useChatStore from "@/app/store/chatStore";
import useViewContextStore from "@/app/store/viewContextStore";
import { useDashboard } from "./dashboardQueries";

/**
 * The dashboard surface's chat greeting (Figma node 1317-4279), rendered in
 * place of the map welcome message. Copy is deliberately generic — no
 * dataset/AOI templating yet — and every chip maps to an action the
 * experimental agent profile can actually take (generate_insights +
 * add_to_dashboard, show_imagery + add_map_widget, inspect_view_context,
 * search_blogs). The variant flips on widget count: an empty dashboard gets
 * "start building" framing, a populated one "refine".
 */
const NUDGE_VARIANTS = {
  build: {
    heading: "Start building this dashboard",
    body: "I can help you add analyses, maps, and context to this dashboard.",
    chips: [
      "Analyse recent tree cover loss in this area and add it to the dashboard",
      "Add a satellite imagery map of this area",
      "What's driving recent forest loss in this area?",
    ],
  },
  refine: {
    heading: "Refine this dashboard",
    body: "I can help you add new analyses, maps, or context to make this dashboard more useful.",
    chips: [
      "Summarize what this dashboard shows",
      "Analyse land cover change in this area and add it to the dashboard",
      "Add a satellite imagery map of this area",
    ],
  },
} as const;

interface DashboardChatNudgesProps {
  /**
   * Chips belong to the naked (pre-first-prompt) state only; the greeting
   * itself persists as the conversation's first block, like the map welcome.
   */
  showChips: boolean;
}

export default function DashboardChatNudges({
  showChips,
}: DashboardChatNudgesProps) {
  const viewContext = useViewContextStore((s) => s.viewContext);
  const dashboardId =
    viewContext?.page === "dashboard" ? viewContext.dashboard_id : "";
  const { data: dashboard } = useDashboard(dashboardId);
  const sendMessage = useChatStore((s) => s.sendMessage);

  // The detail page's own useDashboard call keeps this cache warm; until it
  // resolves neither variant is right, so render nothing rather than flash.
  if (!dashboard) return null;

  const variant =
    dashboard.widgets.length === 0
      ? NUDGE_VARIANTS.build
      : NUDGE_VARIANTS.refine;

  return (
    <Flex direction="column" gap={4} mt={2} mb={2}>
      <Box>
        {/* blue/blue-70 per the Figma page shell, as elsewhere in the feature */}
        <Heading
          as="h2"
          fontSize="md"
          fontWeight="medium"
          color="#0049AA"
          mb={2}
        >
          {variant.heading}
        </Heading>
        <Text fontSize="xs">{variant.body}</Text>
      </Box>
      {showChips && (
        <Flex direction="column" gap={3}>
          <Text fontSize="xs" color="fg.muted">
            You might want to:
          </Text>
          <Flex direction="column" gap={2}>
            {variant.chips.map((chip) => (
              <Box
                as="button"
                key={chip}
                px={3}
                py={2}
                rounded="lg"
                border="1px solid"
                borderColor="border.emphasized"
                fontSize="xs"
                textAlign="left"
                bg="bg"
                transition="all 0.24s ease"
                _hover={{
                  cursor: "pointer",
                  bg: "bg.subtle",
                  borderColor: "primary.solid",
                onClick={() => void sendMessage(chip)}
                {chip}
              </Box>
            ))}
          </Flex>
        </Flex>
      )}
    </Flex>
  );
}

"use client";

/**
 * Trace-analytics screen: Analytics, Trace Explorer and Conversation Browser
 * as URL-synced tabs on a single route (`/trace-analytics?tab=…`), so
 * deep links (?trace= / ?session= / ?user=) keep working when shared.
 *
 * The superuser gate lives in the route page; the Zeno API enforces the same
 * restriction server-side on every endpoint.
 */

import { Box, Tabs } from "@chakra-ui/react";
import {
  ChartBarIcon,
  ChatsCircleIcon,
  MagnifyingGlassIcon,
} from "@phosphor-icons/react";
import { useRouter, useSearchParams } from "next/navigation";
import { AnalyticsView } from "./AnalyticsView";
import { ConversationsView } from "./ConversationsView";
import { TracesView } from "./TracesView";
import { InlineAlert } from "./primitives/InlineAlert";
import { isTraceAnalyticsTab, tabHref, type TraceAnalyticsTab } from "./links";

export function TraceAnalyticsScreen() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const tabParam = searchParams?.get("tab") ?? null;
  const activeTab: TraceAnalyticsTab = isTraceAnalyticsTab(tabParam)
    ? tabParam
    : "analytics";

  function handleTabChange(details: { value: string }) {
    if (!isTraceAnalyticsTab(details.value)) return;
    // Drop stale deep-link params (session/trace/user) when switching by hand.
    router.replace(tabHref(details.value), { scroll: false });
  }

  return (
    <Box p={{ base: 4, lg: 6 }} maxW="1560px">
      <Box mb={4}>
        <InlineAlert
          status="warning"
          title="Trace API under active development"
          message="Underlying data and outcome classification are still changing. Treat analytics as directional, not final, until this notice is removed."
        />
      </Box>

      <Tabs.Root
        value={activeTab}
        onValueChange={handleTabChange}
        lazyMount
        variant="enclosed"
      >
        <Tabs.List mb={4}>
          <Tabs.Trigger value="analytics">
            <ChartBarIcon size={16} />
            Analytics
          </Tabs.Trigger>
          <Tabs.Trigger value="traces">
            <MagnifyingGlassIcon size={16} />
            Trace Explorer
          </Tabs.Trigger>
          <Tabs.Trigger value="conversations">
            <ChatsCircleIcon size={16} />
            Conversations
          </Tabs.Trigger>
        </Tabs.List>

        <Tabs.Content value="analytics">
          <AnalyticsView />
        </Tabs.Content>
        <Tabs.Content value="traces">
          <TracesView />
        </Tabs.Content>
        <Tabs.Content value="conversations">
          <ConversationsView />
        </Tabs.Content>
      </Tabs.Root>
    </Box>
  );
}

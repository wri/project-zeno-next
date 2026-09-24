"use client";

import { useCallback, useRef, useState } from "react";
import {
  Accordion,
  Flex,
  LinkProps,
  Link as ChLink,
  Spinner,
  Stack,
  Text,
} from "@chakra-ui/react";

import { Link, usePathname } from "@/src/shared/lib/router";
import useChatStore from "@/app/store/chatStore";
import useMapStore from "@/app/store/mapStore";
import ThreadActionsMenu from "./ThreadActionsMenu";
import { useThreadsInfinite } from "@/app/hooks/useThreadsInfinite";
import { useIntersectionObserver } from "@/app/hooks/useIntersectionObserver";
import { threadClickTarget } from "@/app/utils/threadNavigation";

/**
 * The current `location.search`, captured once on mount (mirroring
 * `useFeatureFlag`): the first-message thread rewrite can drop query params
 * mid-session — the mount-time value is the trustworthy one.
 */
function useMountSearch(): string {
  const [search] = useState(() => window.location.search);
  return search;
}

function ThreadLink(props: LinkProps & { isActive?: boolean; href?: string }) {
  const { href, children, isActive, ...rest } = props;
  return (
    <ChLink
      fontSize="sm"
      textDecor="none"
      _hover={{ textDecor: "none" }}
      whiteSpace="nowrap"
      overflow="hidden"
      textOverflow="ellipsis"
      display="block"
      flex="1"
      outline="none"
      cursor="pointer"
      {...(isActive
        ? {
            color: "primary.fg",
          }
        : {})}
      {...rest}
      asChild
    >
      {href ? (
        <Link href={href} style={{ display: "block", width: "100%" }}>
          {children}
        </Link>
      ) : (
        <button
          type="button"
          style={{ display: "block", width: "100%", textAlign: "left" }}
        >
          {children}
        </button>
      )}
    </ChLink>
  );
}

function ThreadSection({
  threads,
  label,
  value,
  currentThreadId,
  onThreadOpen,
  footer,
}: {
  threads: {
    id: string;
    name: string;
    updated_at: string;
    is_public: boolean;
  }[];
  label: string;
  value: string;
  currentThreadId: string | null;
  onThreadOpen?: () => void;
  footer?: React.ReactNode;
}) {
  const pathname = usePathname();
  const search = useMountSearch();

  // On a dashboard detail page the conversation isn't in the URL (ADR-003),
  // so resuming one loads it into the global chat store in place — the same
  // reset the map's thread page performs on navigation, minus the navigation.
  const openThreadInPlace = (threadId: string) => {
    const chat = useChatStore.getState();
    if (chat.currentThreadId !== threadId) {
      chat.reset();
      useMapStore.getState().reset();
      chat.fetchThread(threadId);
    }
    onThreadOpen?.();
  };

  if (!threads.length && !footer) return null;
  return (
    <Accordion.Item value={value} border="none">
      <Accordion.ItemTrigger px="3" py="1" cursor="pointer">
        <Text
          fontSize="xs"
          fontWeight="normal"
          color="fg.subtle"
          ml="2"
          mr="auto"
        >
          {label}
        </Text>
        <Accordion.ItemIndicator />
      </Accordion.ItemTrigger>
      <Accordion.ItemContent px="0" pt="0">
        <Stack gap="1" mt="1">
          {threads.map((thread) => {
            const isActive = currentThreadId === thread.id;
            const target = threadClickTarget(pathname, thread.id, search);
            return (
              <Flex
                key={thread.id}
                align="center"
                justify="space-between"
                pl="2"
                pr="0"
                mx="4"
                borderRadius="sm"
                role="group"
                _hover={{ layerStyle: "fill.muted" }}
                _focusWithin={{
                  outline: "2px solid var(--chakra-colors-gray-400)",
                  outlineOffset: "2px",
                }}
                css={{
                  "&:hover .thread-actions": { opacity: 1 },
                  "&:focus-within .thread-actions": { opacity: 1 },
                }}
                {...(isActive ? { bg: "bg", color: "blue.fg" } : {})}
              >
                {target.kind === "navigate" ? (
                  <ThreadLink
                    href={target.href}
                    isActive={isActive}
                    _hover={{ textDecor: "none" }}
                    onClick={onThreadOpen}
                  >
                    {thread.name}
                  </ThreadLink>
                ) : (
                  <ThreadLink
                    isActive={isActive}
                    _hover={{ textDecor: "none" }}
                    onClick={() => openThreadInPlace(thread.id)}
                  >
                    {thread.name}
                  </ThreadLink>
                )}
                <div onClick={(e) => e.stopPropagation()}>
                  <ThreadActionsMenu thread={thread} />
                </div>
              </Flex>
            );
          })}
        </Stack>
        {footer}
      </Accordion.ItemContent>
    </Accordion.Item>
  );
}

/**
 * The user's past conversations grouped into Today, Previous 7 days and
 * Older (loaded page by page as the list scrolls), each with its "..." menu
 * for rename, share and delete. Clicking a conversation opens it where the
 * chat lives: on the map it navigates to the thread, on a dashboard it loads
 * in place. `onThreadOpen` runs after the click, so the host can close
 * itself (the mobile drawer, the chat panel's history view).
 */
export default function ConversationHistoryList({
  onThreadOpen,
}: {
  onThreadOpen?: () => void;
}) {
  const { currentThreadId } = useChatStore();
  const { threadGroups, fetchNextPage, hasNextPage, isFetchingNextPage } =
    useThreadsInfinite();

  const sentinelRef = useRef<HTMLDivElement>(null);

  const handleLoadMore = useCallback(() => {
    fetchNextPage();
  }, [fetchNextPage]);

  useIntersectionObserver(sentinelRef, handleLoadMore, {
    enabled: hasNextPage && !isFetchingNextPage,
    rootMargin: "200px",
  });

  const hasTodayThreads = threadGroups.today.length > 0;
  const hasPreviousWeekThreads = threadGroups.previousWeek.length > 0;
  const hasOlderThreads = threadGroups.older.length > 0;

  return (
    <Accordion.Root multiple defaultValue={["today", "previousWeek"]}>
      {hasTodayThreads && (
        <ThreadSection
          threads={threadGroups.today}
          label="Today"
          value="today"
          currentThreadId={currentThreadId}
          onThreadOpen={onThreadOpen}
        />
      )}
      {hasPreviousWeekThreads && (
        <ThreadSection
          threads={threadGroups.previousWeek}
          label="Previous 7 days"
          value="previousWeek"
          currentThreadId={currentThreadId}
          onThreadOpen={onThreadOpen}
        />
      )}
      {(hasOlderThreads || hasNextPage) && (
        <ThreadSection
          threads={threadGroups.older}
          label="Older Conversations"
          value="older"
          currentThreadId={currentThreadId}
          onThreadOpen={onThreadOpen}
          footer={
            <>
              <div ref={sentinelRef} />
              {isFetchingNextPage && (
                <Flex justify="center" py="2">
                  <Spinner size="sm" color="fg.subtle" />
                </Flex>
              )}
            </>
          }
        />
      )}
    </Accordion.Root>
  );
}

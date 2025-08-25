"use client";

import { useCallback, useMemo, useRef, useState, useEffect } from "react";
import {
  Flex,
  IconButton,
  Menu,
  Button,
  Portal,
  Text,
  Box,
} from "@chakra-ui/react";
import {
  CaretDownIcon,
  NotePencilIcon,
  SidebarIcon,
  ChartLineIcon,
  ListNumbersIcon,
  ChartBarIcon,
  ChartPieSliceIcon,
  PresentationChartIcon,
  StackIcon,
} from "@phosphor-icons/react";
import Link from "next/link";

import { Tooltip } from "./components/ui/tooltip";
import useSidebarStore from "./store/sidebarStore";
import useChatStore from "./store/chatStore";
import ThreadActionsMenu from "./components/ThreadActionsMenu";

export const WidgetIcons = {
  "line": <ChartLineIcon />,
  "table": <ListNumbersIcon />,
  "bar": <ChartBarIcon />,
  "pie": <ChartPieSliceIcon />,
  "insight": <PresentationChartIcon />,
  "dataset-card": <StackIcon />
}

// Marquee-on-hover text: scrolls horizontally to reveal overflowed content
function HoverMarquee({ text, speed = 60, rewindSpeed = 120, ariaLabel }: { text: string; speed?: number; rewindSpeed?: number; ariaLabel?: string }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const innerRef = useRef<HTMLDivElement>(null);
  const [tx, setTx] = useState(0);
  const [duration, setDuration] = useState(0);
  const [active, setActive] = useState(false); // true during hover or rewind
  const rewindTimeoutRef = useRef<number | null>(null);
  
  
  // cleanup
  useEffect(() => {
    return () => {
      if (rewindTimeoutRef.current) {
        clearTimeout(rewindTimeoutRef.current);
        rewindTimeoutRef.current = null;
      }
    };
  }, []);

  const onEnter = () => {
    if (rewindTimeoutRef.current) {
      clearTimeout(rewindTimeoutRef.current);
      rewindTimeoutRef.current = null;
    }
    const container = containerRef.current;
    const inner = innerRef.current;
    if (!container || !inner) return;
    const distance = inner.scrollWidth - container.clientWidth;
    if (distance > 0) {
      setDuration(distance / speed);
      setTx(-distance);
      setActive(true);
    }
  };

  const onLeave = () => {
    const container = containerRef.current;
    const inner = innerRef.current;
    if (!container || !inner) return;
    const distance = Math.abs(tx); // remaining distance back to 0
    if (distance > 0) {
      setDuration(distance / rewindSpeed);
    }
    setTx(0);
    // keep active during rewind, then hide scroller and show truncated text
    if (distance > 0) {
      rewindTimeoutRef.current = window.setTimeout(() => {
        setActive(false);
        rewindTimeoutRef.current = null;
      }, (distance / rewindSpeed) * 1000);
    } else {
      setActive(false);
    }
  };

  return (
    <Box
      ref={containerRef}
      role="text"
      aria-label={ariaLabel ?? text}
      flex="1"
      minW={0}
      whiteSpace="nowrap"
      overflow="hidden"
      textOverflow="ellipsis"
      position="relative"
      onMouseEnter={onEnter}
      onMouseLeave={onLeave}
    >
      {/* Static, truncated text when idle */}
      <Text
        as="span"
        display={active ? "none" : "inline"}
        whiteSpace="nowrap"
        overflow="hidden"
        textOverflow="ellipsis"
      >
        {text}
      </Text>
      {/* Scrolling text shown only on hover/rewind */}
      <Box
        ref={innerRef}
        display="inline-block"
        visibility={active ? "visible" : "hidden"}
        position={active ? "static" : "absolute"}
        left={0}
        transitionProperty="transform"
        transitionTimingFunction="linear"
        transitionDuration={`${duration}s`}
        style={{ transform: `translateX(${tx}px)` }}
      >
        {text}
      </Box>
    </Box>
  );
}

function ChatPanelHeader({ marqueeSpeed = 100, marqueeRewindSpeed = 300 }: { marqueeSpeed?: number; marqueeRewindSpeed?: number }) {
  const {
    sideBarVisible,
    toggleSidebar,
    getThreadById,
  } = useSidebarStore();
  const { currentThreadId, messages } = useChatStore();

  const currentThread = getThreadById(currentThreadId);
  const currentThreadName = currentThread
    ? currentThread.name
    : "New Conversation";

  // Build list of widget anchors from chat messages
  const widgetAnchors = useMemo(() => {
    return messages.flatMap((m) =>
      m.type === "widget" && m.widgets
        ? m.widgets.map((w, idx) => ({
          id: `widget-${m.id}-${idx}`,
          title: w.title || `Widget ${idx + 1}`,
          type: w.type,
          timestamp: m.timestamp,
        }))
        : []
    );
  }, [messages]);

  const formatWidgetMeta = useCallback((isoTs?: string) => {
    if (!isoTs) return "";
    const d = new Date(isoTs);
    const time = d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    const day = d.toLocaleDateString([], { day: "2-digit", month: "short" });
    return `${time} on ${day}`;
  }, []);

  const scrollToWidget = useCallback((anchorId: string) => {
    const el = document.getElementById(anchorId);
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, []);

  return (
    <Flex
      alignItems="center"
      justifyContent="space-between"
      px="4"
      py="2"
      gap="1"
      h="14"
      bg="bg"
      color="fg"
      boxShadow="sm"
    >
      {!sideBarVisible && (
        <Tooltip
          content="Open sidebar"
          positioning={{ placement: "right" }}
          showArrow
        >
          <IconButton
            size="sm"
            variant="ghost"
            color="fg.muted"
            onClick={toggleSidebar}
          >
            <SidebarIcon />
          </IconButton>
        </Tooltip>
      )}
      {currentThreadId ? (
        <ThreadActionsMenu
          thread={{ id: currentThreadId, name: currentThreadName }}
        >
          <Button
            variant="ghost"
            size="sm"
            flex="1"
            minW={0}
            justifyContent="flex-start"
          >
            <Flex align="center" gap={1} w="100%" minW={0}>
              <HoverMarquee text={currentThreadName} speed={marqueeSpeed} rewindSpeed={marqueeRewindSpeed} ariaLabel="Conversation title" />
              <CaretDownIcon />
            </Flex>
          </Button>
        </ThreadActionsMenu>
      ) : (
        <Button
          variant="ghost"
          size="sm"
          flex="1"
          minW={0}
          justifyContent="flex-start"
        >
          <HoverMarquee text={currentThreadName} speed={marqueeSpeed} rewindSpeed={marqueeRewindSpeed} ariaLabel="Conversation title" />
        </Button>
      )}

      {/* Insights dropdown */}
      {widgetAnchors.length === 0 ? (
        <Tooltip content="Ask a question to generate insights" showArrow>
          <span style={{ display: "inline-flex" }}>
            <Button variant="ghost" size="sm" disabled>
              Go to insight
              <CaretDownIcon />
            </Button>
          </span>
        </Tooltip>
      ) : (
        <Menu.Root>
          <Menu.Trigger asChild>
          <Button
              variant="ghost"
              bgGradient="to-br"
              gradientFrom="primary.300/25"
              gradientTo="secondary.300/25"
              size="sm"
            >
              Go to insight
              <CaretDownIcon />
            </Button>
          </Menu.Trigger>
          <Portal>
            <Menu.Positioner>
              <Menu.Content maxH="320px" overflowY="auto">
                {widgetAnchors.map((w) => (
                  <Menu.Item
                    key={w.id}
                    value={w.id}
                    onSelect={() => scrollToWidget(w.id)}
                    role="group"
                    className="group"
                    cursor="pointer"
                  >
                    <Flex
                      align="center"
                      gap={2}
                      maxW="360px"
                      fontSize="md"
                      fontWeight="medium"
                      color="primary.fg"
                    >
                      {WidgetIcons[w.type]}
                      <Text
                        as="span"
                        flex="1"
                        minW={0}
                        whiteSpace="nowrap"
                        overflow="hidden"
                        textOverflow="ellipsis"
                        fontSize="xs"
                      >
                        {w.title}
                      </Text>
                      <Text
                        as="span"
                        flexShrink={0}
                        ml="2"
                        display="none"
                        fontSize="xs"
                        fontWeight="normal"
                        color="fg.muted"
                        _groupHover={{
                          display: "inline",
                        }}
                      >
                        {formatWidgetMeta(w.timestamp)}
                      </Text>
                    </Flex>
                  </Menu.Item>
                ))}
              </Menu.Content>
            </Menu.Positioner>
          </Portal>
        </Menu.Root>
      )}
      {!sideBarVisible && (
        <Tooltip content="New conversation" showArrow>
          <IconButton asChild variant="ghost" size="sm">
            <Link href="/">
              <NotePencilIcon />
            </Link>
          </IconButton>
        </Tooltip>
      )}
    </Flex>
  );
}

export default ChatPanelHeader;

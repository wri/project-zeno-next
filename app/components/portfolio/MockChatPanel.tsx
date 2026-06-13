"use client";

import { useState, useRef, useEffect } from "react";
import { v4 as uuidv4 } from "uuid";
import {
  Box,
  Flex,
  Text,
  Input,
  IconButton,
  Badge,
  Button,
  Spinner,
} from "@chakra-ui/react";
import {
  PaperPlaneTiltIcon,
  PushPinIcon,
  PencilSimpleIcon,
} from "@phosphor-icons/react";
import type { AreaDashboard, PinnedAoi } from "@/app/types/portfolio";
import {
  matchMockResponse,
  type MockResponse,
} from "./mockChatResponses";
import usePinnedInsightStore from "@/app/store/pinnedInsightStore";
import useDashboardStore from "@/app/store/dashboardStore";
import { toaster } from "@/app/components/ui/toaster";

type Message =
  | { id: string; from: "user"; text: string }
  | {
      id: string;
      from: "agent";
      narration: string;
      response: Omit<MockResponse, "keywords">;
      pinnedInsightId?: string;
      pinnedAnnotation?: boolean;
    }
  | { id: string; from: "agent-info"; text: string };

type Props = {
  dashboard: AreaDashboard;
};

export default function MockChatPanel({ dashboard }: Props) {
  const aoi: PinnedAoi = dashboard.aoi;
  const [messages, setMessages] = useState<Message[]>([
    {
      id: uuidv4(),
      from: "agent-info",
      text: `Area context set. Ask me anything about ${aoi.name} — insights will pin to your dashboard automatically.`,
    },
  ]);
  const [draft, setDraft] = useState("");
  const [thinking, setThinking] = useState(false);
  const listRef = useRef<HTMLDivElement>(null);

  const addInsight = usePinnedInsightStore((s) => s.addInsight);
  const findDuplicate = usePinnedInsightStore((s) => s.findDuplicate);
  const addInsightBlock = useDashboardStore((s) => s.addInsightBlock);
  const addAnnotationBlock = useDashboardStore((s) => s.addAnnotationBlock);

  useEffect(() => {
    listRef.current?.scrollTo({
      top: listRef.current.scrollHeight,
      behavior: "smooth",
    });
  }, [messages, thinking]);

  function handleSend() {
    const trimmed = draft.trim();
    if (!trimmed || thinking) return;
    const userMsg: Message = { id: uuidv4(), from: "user", text: trimmed };
    setMessages((prev) => [...prev, userMsg]);
    setDraft("");
    setThinking(true);
    setTimeout(() => {
      const response = matchMockResponse(trimmed);
      setMessages((prev) => [
        ...prev,
        {
          id: uuidv4(),
          from: "agent",
          narration: response.narration,
          response,
        },
      ]);
      setThinking(false);
    }, 700);
  }

  function handlePinInsight(messageId: string) {
    const msg = messages.find((m) => m.id === messageId);
    if (!msg || msg.from !== "agent") return;
    const aoiKey =
      aoi.src_ids.length > 0 ? [...aoi.src_ids].sort().join(",") : aoi.name;
    let existing = findDuplicate(
      msg.response.insight_title,
      aoiKey,
      msg.response.dataset
    );
    if (!existing) {
      existing = addInsight({
        title: msg.response.insight_title,
        description: msg.response.narration,
        datasetName: msg.response.dataset,
        chartType: msg.response.chart_type,
        aoi,
      });
    }
    addInsightBlock(dashboard.id, existing.id);
    setMessages((prev) =>
      prev.map((m) =>
        m.id === messageId && m.from === "agent"
          ? { ...m, pinnedInsightId: existing!.id }
          : m
      )
    );
    toaster.create({
      title: "Pinned to dashboard",
      description: msg.response.insight_title,
      type: "success",
      duration: 2000,
    });
  }

  function handlePinAnnotation(messageId: string) {
    const msg = messages.find((m) => m.id === messageId);
    if (!msg || msg.from !== "agent") return;
    addAnnotationBlock(dashboard.id, msg.narration);
    setMessages((prev) =>
      prev.map((m) =>
        m.id === messageId && m.from === "agent"
          ? { ...m, pinnedAnnotation: true }
          : m
      )
    );
    toaster.create({
      title: "Annotation added",
      description: "Narration pinned to your dashboard as a note.",
      type: "success",
      duration: 2000,
    });
  }

  return (
    <Flex flexDir="column" bg="bg" h="100%" minH={0}>
      <Flex
        px={3}
        py={2.5}
        borderBottom="1px solid"
        borderColor="border"
        align="center"
        gap={2}
      >
        <Text fontSize="sm" fontWeight="semibold">
          Chat
        </Text>
        <Badge colorPalette="green" variant="subtle">
          {aoi.name}
        </Badge>
      </Flex>
      <Box ref={listRef} flex="1" overflowY="auto" px={3} py={3}>
        <Flex flexDir="column" gap={2.5}>
          {messages.map((msg) => {
            if (msg.from === "agent-info") {
              return (
                <Box
                  key={msg.id}
                  bg="bg.subtle"
                  border="1px solid"
                  borderColor="border"
                  rounded="md"
                  px={3}
                  py={2}
                  fontSize="xs"
                  fontStyle="italic"
                  color="fg.muted"
                >
                  {msg.text}
                </Box>
              );
            }
            if (msg.from === "user") {
              return (
                <Box
                  key={msg.id}
                  alignSelf="flex-end"
                  maxW="90%"
                  bg="primary.subtle"
                  border="1px solid"
                  borderColor="primary.muted"
                  rounded="md"
                  px={3}
                  py={2}
                  fontSize="xs"
                  color="fg"
                >
                  {msg.text}
                </Box>
              );
            }
            return (
              <Box
                key={msg.id}
                alignSelf="flex-start"
                maxW="95%"
                bg="bg.subtle"
                border="1px solid"
                borderColor="border"
                rounded="md"
                px={3}
                py={2.5}
              >
                <Text fontSize="xs" color="fg" lineHeight="taller" mb={2}>
                  {msg.narration}
                </Text>
                <Flex gap={1.5} flexWrap="wrap">
                  <Button
                    size="2xs"
                    variant={msg.pinnedInsightId ? "subtle" : "solid"}
                    colorPalette="primary"
                    onClick={() => handlePinInsight(msg.id)}
                    disabled={Boolean(msg.pinnedInsightId)}
                  >
                    <PushPinIcon size={11} />
                    {msg.pinnedInsightId ? "Pinned" : "Pin insight"}
                  </Button>
                  <Button
                    size="2xs"
                    variant={msg.pinnedAnnotation ? "subtle" : "solid"}
                    colorPalette="orange"
                    onClick={() => handlePinAnnotation(msg.id)}
                    disabled={msg.pinnedAnnotation}
                  >
                    <PencilSimpleIcon size={11} />
                    {msg.pinnedAnnotation
                      ? "Pinned as note"
                      : "Pin as annotation"}
                  </Button>
                </Flex>
              </Box>
            );
          })}
          {thinking && (
            <Flex align="center" gap={2} color="fg.muted" fontSize="xs">
              <Spinner size="xs" />
              <Text>Analysing…</Text>
            </Flex>
          )}
        </Flex>
      </Box>
      <Flex
        p={2}
        gap={2}
        borderTop="1px solid"
        borderColor="border"
        bg="bg.subtle"
      >
        <Input
          size="sm"
          placeholder={`Ask about ${aoi.name}…`}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              handleSend();
            }
          }}
          bg="bg"
        />
        <IconButton
          aria-label="Send"
          size="sm"
          colorPalette="primary"
          onClick={handleSend}
          disabled={!draft.trim() || thinking}
        >
          <PaperPlaneTiltIcon size={14} />
        </IconButton>
      </Flex>
    </Flex>
  );
}

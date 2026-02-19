"use client";

import { useMemo } from "react";
import {
  Box,
  Button,
  Flex,
  Heading,
  IconButton,
  Separator,
  Text,
  useDisclosure,
} from "@chakra-ui/react";
import {
  XIcon,
  BinocularsIcon,
  FilePlusIcon,
  InfoIcon,
  ChatTextIcon,
  ArrowsInSimpleIcon,
  TextAaIcon,
} from "@phosphor-icons/react";
import { toaster } from "@/app/components/ui/toaster";

import useExplorePanelStore from "@/app/store/explorePanelStore";
import useChatStore from "@/app/store/chatStore";
import ChartWidget from "@/app/components/widgets/ChartWidget";
import InsightProvenanceDrawer from "@/app/components/InsightProvenanceDrawer";
import VisualizationDisclaimer from "@/app/components/VisualizationDisclaimer";
import { WidgetIcons } from "@/app/ChatPanelHeader";
import { InsightWidget } from "@/app/types/chat";

/**
 * Finds the active InsightWidget from chat messages by its composite id
 * (format: `widget-{messageId}-{widgetIndex}`).
 */
function useActiveInsight(): InsightWidget | null {
  const { activeInsightId } = useExplorePanelStore();
  const { messages } = useChatStore();

  return useMemo(() => {
    if (!activeInsightId) return null;
    // Parse "widget-{messageId}-{index}"
    const match = activeInsightId.match(/^widget-(.+)-(\d+)$/);
    if (!match) return null;
    const [, messageId, indexStr] = match;
    const idx = Number(indexStr);
    const msg = messages.find((m) => m.id === messageId);
    if (!msg?.widgets || !msg.widgets[idx]) return null;
    return msg.widgets[idx];
  }, [activeInsightId, messages]);
}

export default function InsightCard() {
  const widget = useActiveInsight();
  const { setActiveInsight, openChat } = useExplorePanelStore();
  const { sendMessage } = useChatStore();
  const { open, onOpen, onClose } = useDisclosure();

  if (!widget) return null;

  const isChartType = ["bar", "stacked-bar", "grouped-bar", "line", "area", "pie", "scatter"].includes(widget.type);

  const handlePrompt = async (prompt: string) => {
    openChat();
    await sendMessage(prompt);
  };

  const handleAddToReport = () => {
    toaster.create({
      title: "Added to report",
      description: `"${widget.title}" has been pinned to your report.`,
      type: "success",
      duration: 3000,
    });
  };

  const handleMonitor = () => {
    toaster.create({
      title: "Coming soon",
      description: "Area monitoring will be available in a future release.",
      type: "info",
      duration: 3000,
    });
  };

  return (
    <Box
      position="absolute"
      top={3}
      right={3}
      zIndex={150}
      width="380px"
      maxH="calc(100% - 24px)"
      overflowY="auto"
      bg="bg"
      rounded="md"
      shadow="lg"
      border="1px solid"
      borderColor="border.muted"
      hideBelow="md"
      pointerEvents="auto"
    >
      {/* Header */}
      <Flex
        px={4}
        py={3}
        gap={2}
        alignItems="flex-start"
        bgGradient="LCLGradientLight"
      >
        <Box mt="2px" flexShrink={0}>
          {WidgetIcons[widget.type]}
        </Box>
        <Heading
          size="xs"
          fontWeight="medium"
          color="primary.fg"
          m={0}
          flex={1}
        >
          {widget.title}
        </Heading>
        <IconButton
          size="xs"
          variant="ghost"
          color="fg.muted"
          onClick={() => setActiveInsight(null)}
          aria-label="Close insight"
          flexShrink={0}
        >
          <XIcon />
        </IconButton>
      </Flex>

      {/* Body */}
      <Flex flexDir="column" gap={3} px={4} py={3}>
        <Text fontSize="xs" color="fg.muted">
          {widget.description}
        </Text>

        <Separator />

        {/* Chart */}
        {isChartType && <ChartWidget widget={widget} />}

        {/* Quick prompts */}
        <Flex gap={2} flexWrap="wrap">
          <Button
            size="xs"
            variant="solid"
            colorPalette="primary"
            rounded="full"
            onClick={() =>
              handlePrompt(
                `Explain this insight in detail: "${widget.title}"`
              )
            }
          >
            <ChatTextIcon weight="bold" />
            Explain
          </Button>
          <Button
            size="xs"
            variant="solid"
            colorPalette="primary"
            rounded="full"
            onClick={() =>
              handlePrompt(
                `Simplify this insight in plain language: "${widget.title}"`
              )
            }
          >
            <TextAaIcon weight="bold" />
            Simplify
          </Button>
          <Button
            size="xs"
            variant="solid"
            colorPalette="primary"
            rounded="full"
            onClick={() =>
              handlePrompt(
                `Give me a one-sentence TL;DR of this insight: "${widget.title}"`
              )
            }
          >
            <ArrowsInSimpleIcon weight="bold" />
            TL;DR
          </Button>
        </Flex>

        <Separator />

        <VisualizationDisclaimer />

        {/* CTAs */}
        <Flex gap={2} flexWrap="wrap">
          <Button
            size="xs"
            variant="outline"
            onClick={handleMonitor}
          >
            <BinocularsIcon />
            Monitor this area
          </Button>
          <Button
            size="xs"
            variant="outline"
            onClick={handleAddToReport}
          >
            <FilePlusIcon />
            Add to report
          </Button>
          {widget.generation && (
            <Button
              size="xs"
              variant="outline"
              onClick={onOpen}
            >
              <InfoIcon />
              About
            </Button>
          )}
        </Flex>
      </Flex>

      {/* Provenance drawer */}
      {widget.generation && (
        <InsightProvenanceDrawer
          isOpen={open}
          onClose={onClose}
          generation={widget.generation}
          title={widget.title}
        />
      )}
    </Box>
  );
}

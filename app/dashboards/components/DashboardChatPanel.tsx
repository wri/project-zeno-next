"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import {
  Box,
  Flex,
  Text,
  Textarea,
  Spinner,
  Icon,
  IconButton,
} from "@chakra-ui/react";
import {
  DotsSixVerticalIcon,
  ArrowBendRightUpIcon,
  PolygonIcon,
  ChartBarIcon,
  XIcon,
  ChatCircleDotsIcon,
  ClockCounterClockwiseIcon,
  SidebarSimpleIcon,
  CaretDownIcon,
  CaretUpIcon,
} from "@phosphor-icons/react";
import { toaster } from "@/app/components/ui/toaster";
import type { DragControls } from "framer-motion";
import { chatPanelCardStyle } from "@/app/chatPanelShared";
import useDashboardStore from "@/app/store/dashboardStore";
import useComposerStore from "@/app/dashboards/lib/composerStore";
import {
  respondToPrompt,
  respondToSuggestion,
  getSuggestions,
  type CannedResult,
  type Suggestion,
} from "@/app/dashboards/lib/canned";

interface PanelMessage {
  id: number;
  role: "user" | "assistant";
  text: string;
}

const THINKING_MS = 650;

/** Pull the dashboard id out of /dashboards/:id (null on the gallery). */
function useDashboardContext() {
  const pathname = usePathname() ?? "";
  const match = pathname.match(/^\/dashboards\/(.+?)\/?$/);
  const dashboardId = match ? decodeURIComponent(match[1]) : null;
  return {
    dashboardId,
    context: (dashboardId ? "detail" : "gallery") as "detail" | "gallery",
  };
}

function introText(context: "detail" | "gallery"): string {
  return context === "detail"
    ? "I can help you add context, new analyses, or visuals to make this dashboard more useful."
    : "I can help you find a dashboard, or set up a new one to monitor your areas of interest.";
}

/** Full-width row button used for suggestions and the setup "More options". */
function OptionRow({
  onClick,
  disabled,
  children,
}: {
  onClick: () => void;
  disabled?: boolean;
  children: React.ReactNode;
}) {
  return (
    <Box
      as="button"
      onClick={onClick}
      textAlign="left"
      w="full"
      bg="bg"
      borderWidth="1px"
      borderColor="border.emphasized"
      rounded="lg"
      px={3}
      py={2}
      fontSize="xs"
      color="fg"
      cursor="pointer"
      opacity={disabled ? 0.6 : 1}
      transition="border-color 0.12s ease, background 0.12s ease"
      _hover={{ borderColor: "fg.link", bg: "bg.subtle" }}
    >
      {children}
    </Box>
  );
}

interface DashboardChatPanelProps {
  /** Render as a self-contained floating card (rounded, capped height, shadow)
   *  rather than a full-height docked column. */
  floating?: boolean;
  /** When provided, the header's drag handle starts a framer-motion drag. */
  dragControls?: DragControls;
}

export default function DashboardChatPanel({
  floating = false,
  dragControls,
}: DashboardChatPanelProps) {
  const router = useRouter();
  const { dashboardId, context } = useDashboardContext();
  const addWidget = useDashboardStore((s) => s.addWidget);
  const createDashboard = useDashboardStore((s) => s.createDashboard);
  // Area name (subtitle) of the dashboard being built — personalises the
  // template-step intro ("Pick what you want to track for {area}…").
  const areaName = useDashboardStore(
    (s) => s.dashboards.find((d) => d.id === dashboardId)?.subtitle ?? null
  );
  const mentions = useComposerStore((s) => s.mentions);
  const removeMention = useComposerStore((s) => s.removeMention);
  const clearMentions = useComposerStore((s) => s.clearMentions);
  const sidePane = useComposerStore((s) => s.sidePane);
  const openSidePane = useComposerStore((s) => s.openSidePane);
  const closeSidePane = useComposerStore((s) => s.closeSidePane);
  const chatMaximised = useComposerStore((s) => s.chatMaximised);
  const setChatMaximised = useComposerStore((s) => s.setChatMaximised);
  const chatCollapsed = useComposerStore((s) => s.chatCollapsed);
  const setChatCollapsed = useComposerStore((s) => s.setChatCollapsed);
  const focusNonce = useComposerStore((s) => s.focusNonce);

  const [messages, setMessages] = useState<PanelMessage[]>([]);
  const [draft, setDraft] = useState("");
  const [thinking, setThinking] = useState(false);

  const nextId = useRef(1);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Reset the conversation when moving between the gallery and a dashboard.
  useEffect(() => {
    setMessages([]);
    setThinking(false);
    if (timer.current) clearTimeout(timer.current);
  }, [context, dashboardId]);

  useEffect(() => {
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, []);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight });
  }, [messages, thinking]);

  // "Ask AI" from an empty block requests focus of the composer.
  useEffect(() => {
    if (focusNonce > 0) textareaRef.current?.focus();
  }, [focusNonce]);

  const run = (userText: string, result: CannedResult) => {
    if (thinking) return;
    setMessages((prev) => [
      ...prev,
      { id: nextId.current++, role: "user", text: userText },
    ]);
    setThinking(true);
    timer.current = setTimeout(() => {
      if (result.action.type === "addWidget" && dashboardId) {
        addWidget(dashboardId, result.action.widget);
      } else if (result.action.type === "createDashboard") {
        const id = createDashboard(result.action.dashboard);
        addWidget(id, result.action.widget);
        // Take the user straight to the dashboard the chat just created.
        router.push(`/dashboards/${id}`);
      }
      setMessages((prev) => [
        ...prev,
        { id: nextId.current++, role: "assistant", text: result.reply },
      ]);
      setThinking(false);
    }, THINKING_MS);
  };

  const sendDraft = () => {
    if (thinking) return;
    // Prepend any @mention chips to the message so the canned engine sees them.
    const text = [...mentions.map((m) => `@${m}`), draft.trim()]
      .filter(Boolean)
      .join(" ")
      .trim();
    if (!text) return;
    setDraft("");
    clearMentions();
    run(text, respondToPrompt(text, context));
  };

  const pickSuggestion = (s: Suggestion) => {
    run(s.label, respondToSuggestion(s, context));
  };

  // Header actions.
  const newChat = () => {
    if (timer.current) clearTimeout(timer.current);
    setMessages([]);
    setThinking(false);
    setDraft("");
    clearMentions();
  };
  const showHistory = () =>
    toaster.create({
      title: "Conversation history — prototype",
      type: "info",
      duration: 2000,
    });

  const hasConversation = messages.length > 0;
  // Collapse only applies to the floating card (the header's caret).
  const collapsed = floating && chatCollapsed;

  // Which new-dashboard setup step the open side panel represents. The Areas
  // pane (no AOI yet) is "areas"; the Analyses pane on a dashboard is the
  // "template" step. On the gallery the Analyses pane is just a browser, so it
  // doesn't count as a setup step.
  const setupStep: "areas" | "template" | null =
    sidePane === "areas"
      ? "areas"
      : sidePane === "analysis" && context === "detail"
        ? "template"
        : null;

  // The heading/intro track the setup step the user is on; otherwise they fall
  // back to the gallery/detail copy. Matches the Figma "New dashboard flow".
  const heading =
    setupStep === "areas"
      ? "Choose an area"
      : setupStep === "template"
        ? "Start from a template"
        : context === "detail"
          ? "Refine this dashboard"
          : "What would you like to explore?";
  const intro =
    setupStep === "areas"
      ? "Select an area to build this dashboard. You can also describe an area in natural language."
      : setupStep === "template"
        ? `Pick what you want to track${
            areaName ? ` for ${areaName}` : ""
          }, or describe what you want to monitor in your own words.`
        : introText(context);

  // Setup-step "More options" actions.
  const uploadShapefile = () =>
    toaster.create({
      title: "Upload a shapefile — prototype",
      description: "File upload isn't wired up in the prototype.",
      type: "info",
      duration: 2500,
    });
  const skipStep = () => {
    // Areas → advance to the template step; template → reveal the dashboard.
    if (setupStep === "areas") openSidePane("analysis");
    else closeSidePane();
  };
  // "Areas" from the gallery starts a brand-new dashboard; the detail page then
  // opens the Areas pane automatically (no AOI yet).
  const startAreaSetup = () => {
    const id = createDashboard({ title: "Untitled dashboard" });
    router.push(`/dashboards/${id}`);
  };

  return (
    <Flex
      flexDir="column"
      h="100%"
      w={floating ? { base: "full", md: "400px" } : "full"}
      flexShrink={0}
      {...chatPanelCardStyle}
      borderRadius={floating ? "lg" : 0}
      borderWidth={floating ? "1px" : 0}
      borderRightWidth={floating ? "1px" : { base: 0, md: "1px" }}
      boxShadow={floating ? "xl" : undefined}
      overflow="hidden"
    >
      {/* Header — drag handle + AI ASSISTANT, with the design's action icons. */}
      <Flex
        h="40px"
        px="3"
        bg="#F4F5F6"
        borderBottomWidth="1px"
        borderColor="#E7E6E6"
        align="center"
        justify="space-between"
        flexShrink={0}
      >
        <Flex
          align="center"
          gap={2}
          cursor={dragControls ? "grab" : undefined}
          onPointerDown={
            dragControls ? (e) => dragControls.start(e) : undefined
          }
          style={dragControls ? { touchAction: "none" } : undefined}
        >
          <Icon as={DotsSixVerticalIcon} boxSize="16px" color="#656E7B" />
          <Text
            fontFamily="mono"
            fontSize="10px"
            lineHeight="16px"
            letterSpacing="0.3px"
            textTransform="uppercase"
            color="#656E7B"
          >
            AI Assistant
          </Text>
        </Flex>
        <Flex align="center" gap={1}>
          <IconButton
            aria-label="New chat"
            size="2xs"
            variant="ghost"
            color="#656E7B"
            onClick={newChat}
          >
            <ChatCircleDotsIcon size={16} />
          </IconButton>
          <IconButton
            aria-label="Conversation history"
            size="2xs"
            variant="ghost"
            color="#656E7B"
            onClick={showHistory}
          >
            <ClockCounterClockwiseIcon size={16} />
          </IconButton>
          <IconButton
            aria-label={chatMaximised ? "Float chat" : "Dock chat full-size"}
            size="2xs"
            variant="ghost"
            color="#656E7B"
            onClick={() => {
              setChatMaximised(!chatMaximised);
              setChatCollapsed(false);
            }}
          >
            <SidebarSimpleIcon size={16} />
          </IconButton>
          {floating && (
            <IconButton
              aria-label={collapsed ? "Expand chat" : "Collapse chat"}
              size="2xs"
              variant="ghost"
              color="#656E7B"
              onClick={() => setChatCollapsed(!chatCollapsed)}
            >
              {collapsed ? (
                <CaretUpIcon size={12} />
              ) : (
                <CaretDownIcon size={12} />
              )}
            </IconButton>
          )}
        </Flex>
      </Flex>

      {!collapsed && (
        <>
          {/* Intro + suggestions / conversation */}
          <Box ref={scrollRef} flex="1 1 auto" overflowY="auto" px={4} py={4}>
            <Text
              fontSize="16px"
              fontWeight="medium"
              lineHeight="1.5"
              color="#0049AA"
              mb={2}
            >
              {heading}
            </Text>
            <Text fontSize="12px" lineHeight="1.5" color="#131619" mb={4}>
              {intro}
            </Text>

            {/* Empty state: setup steps show "More options", otherwise the
                full-width suggestion rows. */}
            {!hasConversation &&
              (setupStep ? (
                <Box>
                  <Text fontSize="xs" color="fg.muted" mb={2}>
                    More options:
                  </Text>
                  <Flex flexDir="column" gap={2}>
                    {setupStep === "areas" && (
                      <OptionRow onClick={uploadShapefile} disabled={thinking}>
                        Upload a shapefile
                      </OptionRow>
                    )}
                    <OptionRow onClick={skipStep} disabled={thinking}>
                      Skip this step
                    </OptionRow>
                  </Flex>
                </Box>
              ) : (
                <Box>
                  <Text fontSize="xs" color="fg.muted" mb={2}>
                    {context === "detail"
                      ? "You might want to:"
                      : "Try one of these to get started:"}
                  </Text>
                  <Flex flexDir="column" gap={2}>
                    {getSuggestions(context).map((s) => (
                      <OptionRow
                        key={s.label}
                        onClick={() => pickSuggestion(s)}
                        disabled={thinking}
                      >
                        {s.label}
                      </OptionRow>
                    ))}
                  </Flex>
                </Box>
              ))}

            {/* Conversation thread */}
            {hasConversation && (
              <Flex flexDir="column" gap={3}>
                {messages.map((m) => (
                  <Flex
                    key={m.id}
                    justify={m.role === "user" ? "flex-end" : "flex-start"}
                  >
                    <Box
                      maxW="85%"
                      px={3}
                      py={2}
                      rounded="md"
                      fontSize="sm"
                      bg={m.role === "user" ? "primary.solid" : "neutral.100"}
                      color={m.role === "user" ? "primary.contrast" : "fg"}
                      borderWidth={m.role === "assistant" ? "1px" : 0}
                      borderColor="border"
                    >
                      {m.text}
                    </Box>
                  </Flex>
                ))}
                {thinking && (
                  <Flex align="center" gap={2} color="fg.muted" fontSize="sm">
                    <Spinner size="xs" />
                    Thinking…
                  </Flex>
                )}
              </Flex>
            )}
          </Box>

          {/* Prompt box */}
          <Box px={4} pb={4}>
            <Box
              bg="#F4F5F6"
              borderWidth="1px"
              borderColor="#E0E2E5"
              rounded="4px"
              p={4}
            >
              {/* @mention chips (e.g. from an insight's hover chat button) */}
              {mentions.length > 0 && (
                <Flex gap={1} flexWrap="wrap" mb={2}>
                  {mentions.map((m) => (
                    <Flex
                      key={m}
                      align="center"
                      gap={1}
                      maxW="full"
                      bg="blue.50"
                      color="fg.link"
                      borderWidth="1px"
                      borderColor="fg.link"
                      rounded="full"
                      px={2}
                      py={0.5}
                      fontSize="xs"
                    >
                      <Text lineClamp={1}>@{m}</Text>
                      <Box
                        as="button"
                        onClick={() => removeMention(m)}
                        aria-label={`Remove ${m}`}
                        lineHeight={0}
                        flexShrink={0}
                      >
                        <XIcon size={12} />
                      </Box>
                    </Flex>
                  ))}
                </Flex>
              )}
              <Textarea
                ref={textareaRef}
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    sendDraft();
                  }
                }}
                placeholder={
                  setupStep === "areas"
                    ? 'e.g. "Pará, Brazil" or "50km around Tapajós"'
                    : setupStep === "template"
                      ? 'e.g. "Find the drivers of tree cover loss"'
                      : "Or describe what you want to explore…"
                }
                rows={1}
                resize="none"
                border="none"
                outline="none"
                bg="transparent"
                _focusVisible={{ boxShadow: "none" }}
                fontSize="sm"
                minH="24px"
                maxH="120px"
                p={0}
                mb={3}
              />
              <Flex justify="space-between" align="center">
                <Flex gap={2}>
                  {[
                    // Per the design, the composer offers just Areas + Analyses.
                    // Each opens its docked side panel (independent of the chat's
                    // floating/full-sized state); the active one is highlighted.
                    // On the gallery there's no dashboard yet, so "Areas" starts
                    // a new one and the detail page opens the Areas pane.
                    {
                      label: "Areas",
                      icon: PolygonIcon,
                      active: sidePane === "areas",
                      onClick:
                        context === "detail"
                          ? () => openSidePane("areas")
                          : startAreaSetup,
                    },
                    {
                      label: "Analyses",
                      icon: ChartBarIcon,
                      active: sidePane === "analysis",
                      onClick: () => openSidePane("analysis"),
                    },
                  ].map((chip) => (
                    <Flex
                      key={chip.label}
                      as="button"
                      onClick={chip.onClick}
                      align="center"
                      gap={1}
                      borderWidth="1px"
                      borderColor={chip.active ? "#0049AA" : "#E0E2E5"}
                      rounded="4px"
                      bg={chip.active ? "#EAF0FF" : "bg"}
                      px={2}
                      py={1.5}
                      color={chip.active ? "#0049AA" : "#3A4048"}
                      cursor="pointer"
                      _hover={
                        chip.active
                          ? undefined
                          : {
                              bg: "bg.subtle",
                              borderColor: "border.emphasized",
                            }
                      }
                    >
                      <Icon as={chip.icon} boxSize="16px" />
                      <Text fontSize="11px">{chip.label}</Text>
                    </Flex>
                  ))}
                </Flex>
                <IconButton
                  aria-label="Send"
                  size="sm"
                  rounded="full"
                  bg="fg.link"
                  color="white"
                  _hover={{ bg: "fg.link", opacity: 0.9 }}
                  onClick={sendDraft}
                  disabled={
                    thinking || (!draft.trim() && mentions.length === 0)
                  }
                  _disabled={{ opacity: 0.5, cursor: "not-allowed" }}
                >
                  <ArrowBendRightUpIcon size={16} />
                </IconButton>
              </Flex>
            </Box>
          </Box>
        </>
      )}
    </Flex>
  );
}

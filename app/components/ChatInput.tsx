"use client";
import { useEffect, useRef, useState } from "react";
import {
  Button,
  Flex,
  Textarea,
  useBreakpointValue,
  useDisclosure,
  Dialog,
  Text,
  Portal,
} from "@chakra-ui/react";
import {
  ArrowBendRightUpIcon,
  ChartLineIcon,
  MicrophoneIcon,
  StopIcon,
} from "@phosphor-icons/react";
import { format } from "date-fns";
import useChatStore from "@/app/store/chatStore";
import ContextButton, { ChatContextType } from "./ContextButton";
import ContextTag from "./ContextTag";
import ContextMenu from "./ContextMenu";
import VoiceListeningPanel from "./voice/VoiceListeningPanel";
import VoiceErrorPanel from "./voice/VoiceErrorPanel";
import useMapStore from "../store/mapStore";
import { isAreaLayer } from "../store/layerManagerSlice";
import useSidebarStore from "../store/sidebarStore";
import useAuthStore from "../store/authStore";
import useSpeechInput from "../hooks/useSpeechInput";
import usePrefersReducedMotion from "../hooks/usePrefersReducedMotion";
import { resolveSpeechLang } from "../utils/speechLang";
import { useFeatureFlag } from "@/src/shared/lib/feature-flags";
import { useRouter, usePathname } from "next/navigation";
import {
  firstMessageRedirectPath,
  isAppRoute,
  isDashboardDetailRoute,
} from "../utils/threadNavigation";

export default function ChatInput({
  isChatDisabled,
  bordered,
  onAfterSend,
}: {
  isChatDisabled?: boolean;
  /** Render the input box as a standalone rounded card (conversation panel) */
  bordered?: boolean;
  /** Called immediately before sending, e.g. to expand a collapsed panel */
  onAfterSend?: () => void;
}) {
  const [inputValue, setInputValue] = useState("");
  const [contextModalOpen, setContextModalOpen] = useState(false);
  const [selectedContextType, setSelectedContextType] =
    useState<ChatContextType | null>(null);

  const router = useRouter();
  const pathname = usePathname();

  // Hooks for responsive modal behavior
  const isMobile = useBreakpointValue({ base: true, md: false });
  const {
    open: inputModalOpen,
    onOpen: onInputModalOpen,
    onClose: onInputModalClose,
  } = useDisclosure();

  const [focusEl, setFocusEl] = useState<HTMLTextAreaElement | null>(null);

  const {
    sendMessage,
    isLoading,
    cancelRequest,
    abortController,
    messages,
    dateRange,
    clearDateRange,
    excludeLayerFromContext,
  } = useChatStore();
  const { layers } = useMapStore();
  const {
    dataCatalogOpen,
    toggleDataCatalog,
    areasPanelOpen,
    toggleAreasPanel,
    insightsPanelOpen,
    toggleInsightsPanel,
    chatInputFocusToken,
  } = useSidebarStore();

  // Focus on request from outside (e.g. a dashboard's "Describe your own"
  // suggested module) — skip the initial mount so the textarea isn't
  // stolen-focused on every page load.
  const hasMountedRef = useRef(false);
  useEffect(() => {
    if (!hasMountedRef.current) {
      hasMountedRef.current = true;
      return;
    }
    if (isMobile) {
      onInputModalOpen();
    }
    focusEl?.focus();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chatInputFocusToken]);

  const excludedLayerIds = useChatStore((s) => s.excludedContextLayerIds);
  const excludedSet = new Set(excludedLayerIds);

  // Voice dictation, gated behind the `ff=voice` hidden-feature flag while it's
  // still being rolled out. `speech` is null when the browser lacks the Web
  // Speech API, in which case the mic control is not rendered. The committed
  // transcript is appended to whatever is already typed, so we snapshot that
  // text when a session starts. The Web Speech API can't detect the spoken
  // language, so we default it from the user's onboarding preference, then the
  // browser language, then en-US — with an in-listening override menu.
  const voiceInputEnabled = useFeatureFlag("voice");
  const preferredLanguageCode = useAuthStore((s) => s.preferredLanguageCode);
  const prefersReducedMotion = usePrefersReducedMotion();
  const dictationBaseRef = useRef("");
  const speech = useSpeechInput({
    initialLang: resolveSpeechLang(
      preferredLanguageCode,
      typeof navigator !== "undefined" ? navigator.language : null
    ),
    onStart: () => {
      dictationBaseRef.current = inputValue.trim()
        ? `${inputValue.trim()} `
        : "";
    },
    onCommit: (transcript) =>
      setInputValue(dictationBaseRef.current + transcript),
  });

  // Pills reflect layers/dates active in chat context. Dismissing a pill
  // removes it from context only; the map layer stays visible.
  const datasetPillLayers = layers.filter(
    (l) =>
      typeof l.datasetId === "number" &&
      !l.parentLayerId &&
      !excludedSet.has(l.id)
  );
  const areaPillLayers = layers.filter(
    (l) => l.visible && isAreaLayer(l) && !excludedSet.has(l.id)
  );

  const openContextMenu = (type: ChatContextType) => {
    setSelectedContextType(type);
    setContextModalOpen(true);
  };

  const openLayerPicker = () => {
    if (isMobile) {
      openContextMenu("layer");
      return;
    }
    toggleDataCatalog();
  };

  const openAreaPicker = () => {
    if (isMobile) {
      openContextMenu("area");
      return;
    }
    toggleAreasPanel();
  };

  // Insights is a desktop-only exploration panel (no mobile context-modal
  // equivalent), so its toggle button is hidden on mobile.
  const openInsightsPanel = () => toggleInsightsPanel();

  const handleContextModalOpenChange = (e: { open: boolean }) => {
    setContextModalOpen(e.open);
    if (!e.open) setSelectedContextType(null);
  };

  const submitPrompt = async () => {
    if (!inputValue.trim() || isLoading) return;

    const message = inputValue.trim();
    setInputValue("");
    onAfterSend?.();

    // Close the modal on mobile after sending a message
    if (isMobile) {
      onInputModalClose();
    }

    const result = await sendMessage(message);
    if (result.isNew) {
      const redirect = firstMessageRedirectPath(
        pathname,
        result.id,
        window.location.search
      );
      if (redirect) router.replace(redirect);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    // Submit on Enter (without Shift) or Command+Enter
    if (
      (e.key === "Enter" && !e.shiftKey && !e.metaKey) ||
      (e.key === "Enter" && e.metaKey)
    ) {
      e.preventDefault(); // Prevents newline
      submitPrompt();
    }
    // If Shift+Enter, do nothing: allow newline
  };

  const disabled = isLoading || isChatDisabled;
  // The abortController is the authoritative signal that a cancellable chat
  // request is in flight: sendMessage sets it before fetching and nulls it in
  // its finally, and nothing else touches it. We deliberately do NOT gate on
  // isLoading, which is an overloaded flag also set during thread loading (not
  // cancellable) and whose meaning could drift in the future.
  const canCancelRequest = abortController !== null;
  const hasNudge = messages.at(-1)?.type === "nudge";
  const hasConversation = messages.some(
    (m) => m.type === "user" || m.type === "assistant"
  );
  const message = isLoading
    ? "Sending..."
    : hasNudge
      ? "Or ask a different question..."
      : hasConversation
        ? "Ask a follow-up question…"
        : "Or describe what you want to explore…";

  const isButtonDisabled = disabled || !inputValue?.trim();
  const hasPills =
    datasetPillLayers.length > 0 || areaPillLayers.length > 0 || !!dateRange;

  // The core UI of the chat input is defined here so it can be reused
  // for both the desktop view and within the mobile modal.
  const chatInputUI = (
    <Flex
      flexDir="column"
      position="relative"
      m={0}
      p={4}
      bg={bordered ? "#F4F5F6" : "gray.100"}
      borderWidth={bordered ? "1px" : 0}
      borderColor={bordered ? "#E0E2E5" : undefined}
      borderRadius={bordered ? "sm" : undefined}
      className="group"
      transition="all 0.32s ease-in-out"
      _focusWithin={
        bordered
          ? { borderColor: "primary.focusRing", outline: "none" }
          : undefined
      }
    >
      {hasPills && (
        <Flex gap={1} wrap="wrap" mb={1}>
          {datasetPillLayers.map((l) => (
            <ContextTag
              key={l.id}
              contextType="layer"
              content={l.name}
              onClose={() => excludeLayerFromContext(l.id)}
              closeable
            />
          ))}
          {areaPillLayers.map((l) => (
            <ContextTag
              key={l.id}
              contextType="area"
              content={l.selectionName ?? l.name}
              onClose={() => excludeLayerFromContext(l.id)}
              closeable
            />
          ))}
          {dateRange && (
            <ContextTag
              contextType="date"
              content={`${format(dateRange.start, "yyyy-MM-dd")} — ${format(
                dateRange.end,
                "yyyy-MM-dd"
              )}`}
              onClose={clearDateRange}
              closeable
            />
          )}
        </Flex>
      )}
      {voiceInputEnabled && speech && speech.phase === "listening" ? (
        <VoiceListeningPanel
          seconds={speech.seconds}
          committed={speech.committed}
          interim={speech.interim}
          lang={speech.lang}
          onLangChange={speech.setLang}
          onStop={speech.stop}
          reducedMotion={prefersReducedMotion}
        />
      ) : voiceInputEnabled &&
        speech &&
        speech.phase === "error" &&
        speech.errorType ? (
        <VoiceErrorPanel
          errorType={speech.errorType}
          onRetry={speech.retry}
          onDismiss={speech.dismissError}
          reducedMotion={prefersReducedMotion}
        />
      ) : (
        <>
          <Textarea
            ref={setFocusEl}
            aria-label="Ask a question..."
            placeholder={message}
            // 16px on mobile — iOS Safari auto-zooms focused inputs below 16px.
            fontSize={{ base: "md", md: "sm" }}
            minH="20px"
            autoresize
            maxH="10lh"
            border="none"
            p={0}
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={disabled}
            _disabled={{ opacity: 1 }}
            _focus={{ outline: "none", boxShadow: "none" }}
            _placeholder={{ color: disabled ? "gray.400" : "gray.600" }}
          />
          <Flex justifyContent="space-between" alignItems="center" w="full">
            <Flex gap="2">
              {/* The pickers these open (catalog / areas panels) only exist in
                  the map layout — hide them on other surfaces (dashboards). */}
              {isAppRoute(pathname) && (
                <>
                  <ContextButton
                    contextType="layer"
                    onClick={openLayerPicker}
                    disabled={disabled}
                    borderColor={dataCatalogOpen ? "primary.solid" : "#E0E2E5"}
                    color={dataCatalogOpen ? "primary.solid" : undefined}
                    aria-expanded={dataCatalogOpen}
                  />
                  <ContextButton
                    contextType="area"
                    onClick={openAreaPicker}
                    disabled={disabled}
                    borderColor={areasPanelOpen ? "primary.solid" : "#E0E2E5"}
                    color={areasPanelOpen ? "primary.solid" : undefined}
                    aria-expanded={areasPanelOpen}
                  />
                </>
              )}
              {/* The Analyses pane is mounted on the map and on a dashboard's
                  detail page, so its opener shows on both (unlike the map-only
                  pickers above). */}
              {(isAppRoute(pathname) || isDashboardDetailRoute(pathname)) &&
                !isMobile && (
                  <Button
                    size="xs"
                    variant="outline"
                    borderRadius="sm"
                    borderWidth="1px"
                    px="2"
                    h="8"
                    gap="1"
                    fontSize="xs"
                    fontWeight="normal"
                    onClick={openInsightsPanel}
                    disabled={disabled}
                    borderColor={
                      insightsPanelOpen ? "primary.solid" : "#E0E2E5"
                    }
                    color={insightsPanelOpen ? "primary.solid" : undefined}
                    aria-expanded={insightsPanelOpen}
                    aria-label="Analyses"
                  >
                    <ChartLineIcon />
                    Analyses
                  </Button>
                )}
            </Flex>
            <Flex gap="2" ml="auto" alignItems="center">
              {voiceInputEnabled && speech && (
                <Button
                  p="0"
                  borderRadius="full"
                  variant="outline"
                  bg="white"
                  borderColor="#E0E2E5"
                  color="gray.700"
                  type="button"
                  size="xs"
                  aria-label="Start voice input"
                  title="Start voice input"
                  onClick={speech.start}
                  disabled={disabled}
                >
                  <MicrophoneIcon />
                </Button>
              )}
              {canCancelRequest ? (
                <Button
                  p="0"
                  borderRadius="full"
                  variant="solid"
                  colorPalette="primary"
                  type="button"
                  size="xs"
                  aria-label="Cancel request"
                  onClick={cancelRequest}
                  title="Cancel request"
                >
                  <StopIcon weight="fill" />
                </Button>
              ) : (
                <Button
                  p="0"
                  borderRadius="full"
                  variant="solid"
                  colorPalette="primary"
                  _disabled={{
                    opacity: 0.36,
                  }}
                  type="button"
                  size="xs"
                  aria-label="Send prompt"
                  onClick={submitPrompt}
                  disabled={isButtonDisabled}
                >
                  <ArrowBendRightUpIcon weight="bold" />
                </Button>
              )}
            </Flex>
          </Flex>
        </>
      )}
    </Flex>
  );

  const contextMenu = selectedContextType && (
    <Portal>
      <ContextMenu
        contextType={selectedContextType}
        open={contextModalOpen}
        onOpenChange={handleContextModalOpenChange}
      />
    </Portal>
  );

  // For desktop, return the UI directly.
  if (!isMobile) {
    return (
      <>
        {chatInputUI}
        {contextMenu}
      </>
    );
  }

  // For mobile, return a trigger and a modal containing the UI.
  return (
    <>
      {/* Mobile Trigger Bar */}
      <Flex
        onClick={onInputModalOpen}
        flexDir="column"
        align="flex-start"
        justifyContent="space-between"
        m={0}
        p={3}
        bg="gray.100"
        maxH="7rem"
        overflowY="auto"
        borderTopWidth="1px"
        borderColor="gray.300"
        cursor="pointer"
        position="relative"
        borderRadius="lg"
        borderWidth="1px"
        className="group"
        transition="all 0.32s ease-in-out"
        _active={{
          borderColor: "primary.focusRing",
        }}
        _focusWithin={{
          borderColor: "primary.focusRing",
        }}
      >
        <Text
          fontSize="sm"
          color={inputValue ? "fg" : "fg.subtle"}
          wordBreak="break-word"
        >
          {inputValue || message}
        </Text>
        <Flex justifyContent="space-between" alignItems="center" w="full">
          <Flex gap="2">
            <ContextButton
              contextType="layer"
              onClick={(e: React.MouseEvent<HTMLButtonElement>) => {
                e.stopPropagation();
                openLayerPicker();
              }}
              disabled={disabled}
              aria-expanded={
                isMobile
                  ? contextModalOpen && selectedContextType === "layer"
                  : dataCatalogOpen
              }
            />
            <ContextButton
              contextType="area"
              onClick={(e: React.MouseEvent<HTMLButtonElement>) => {
                e.stopPropagation();
                openAreaPicker();
              }}
              disabled={disabled}
              aria-expanded={
                isMobile
                  ? contextModalOpen && selectedContextType === "area"
                  : areasPanelOpen
              }
            />
          </Flex>
          {canCancelRequest ? (
            <Button
              p={0}
              flexShrink={0}
              colorPalette="primary"
              title="Cancel request"
              aria-label="Cancel request"
              ml="auto"
              borderRadius="full"
              variant="solid"
              type="button"
              size="xs"
              onClick={(e: React.MouseEvent<HTMLButtonElement>) => {
                e.stopPropagation();
                cancelRequest();
              }}
            >
              <StopIcon weight="fill" />
            </Button>
          ) : (
            <Button
              p={0}
              flexShrink={0}
              colorPalette="primary"
              title="Send message"
              aria-label="Send prompt"
              aria-hidden
              ml="auto"
              borderRadius="full"
              variant="solid"
              _disabled={{ opacity: 0.36, cursor: "not-allowed" }}
              type="button"
              size="xs"
              onClick={(e: React.MouseEvent<HTMLButtonElement>) => {
                e.stopPropagation();
                submitPrompt();
              }}
              disabled={isButtonDisabled}
            >
              <ArrowBendRightUpIcon weight="bold" />
            </Button>
          )}
        </Flex>
      </Flex>
      {contextMenu}
      {/* Input Modal appears on tap when on mobile device */}
      <Dialog.Root
        open={inputModalOpen}
        onOpenChange={onInputModalClose}
        initialFocusEl={focusEl ? () => focusEl : undefined}
        placement="center"
        motionPreset="slide-in-bottom"
        scrollBehavior="inside"
      >
        <Portal>
          <Dialog.Backdrop bg="blackAlpha.400" backdropFilter="blur(2px)" />
          <Dialog.Positioner>
            <Dialog.Content
              bg="transparent"
              boxShadow="none"
              position="fixed"
              w="full"
              maxW="calc(100vw - 1rem)"
            >
              {chatInputUI}
            </Dialog.Content>
          </Dialog.Positioner>
        </Portal>
      </Dialog.Root>
    </>
  );
}

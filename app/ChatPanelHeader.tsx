import { Flex, IconButton, Text } from "@chakra-ui/react";
import {
  CaretDownIcon,
  CaretUpIcon,
  ClockCounterClockwiseIcon,
  NotePencilIcon,
  SidebarSimpleIcon,
  SparkleIcon,
} from "@phosphor-icons/react";
import { Tooltip } from "./components/ui/tooltip";
import { useStartNewConversation } from "./hooks/useStartNewConversation";
import useSidebarStore from "./store/sidebarStore";

interface ChatPanelHeaderProps {
  /** Whether the panel is in full-size mode (vs compact) */
  isFullSize?: boolean;
  /** Called when the user clicks the SidebarSimpleIcon (size toggle) */
  onToggleSize: () => void;
}

function PanelIconButton({
  label,
  active,
  onClick,
  children,
}: {
  label: string;
  active?: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <Tooltip
      content={label}
      variant="dark"
      positioning={{ placement: "top" }}
      showArrow
    >
      <IconButton
        size="2xs"
        variant="ghost"
        color={active ? "primary.fg" : "neutral.600"}
        bg={active ? "neutral.300" : undefined}
        aria-label={label}
        aria-pressed={active}
        onClick={onClick}
      >
        {children}
      </IconButton>
    </Tooltip>
  );
}

/**
 * The chat panel's own header: "AI ASSISTANT" and, in order, New
 * conversation, Conversation history, the size toggle and Collapse. Collapse
 * from full-size lands on the collapsed compact panel; while collapsed, a
 * click anywhere on the bar opens the panel again.
 */
function ChatPanelHeader({
  isFullSize = false,
  onToggleSize,
}: ChatPanelHeaderProps) {
  const startNewConversation = useStartNewConversation();
  const isChatCollapsed = useSidebarStore((s) => s.isChatCollapsed);
  const setChatCollapsed = useSidebarStore((s) => s.setChatCollapsed);
  const chatHistoryOpen = useSidebarStore((s) => s.chatHistoryOpen);
  const setChatHistoryOpen = useSidebarStore((s) => s.setChatHistoryOpen);
  const isCollapsed = !isFullSize && isChatCollapsed;

  return (
    <Flex
      h="40px"
      px="3"
      py="1"
      bg="neutral.200"
      alignItems="center"
      gap="2"
      hideBelow="md"
      flexShrink={0}
      cursor={isCollapsed ? "pointer" : undefined}
      onClick={isCollapsed ? () => setChatCollapsed(false) : undefined}
      data-testid="chat-panel-header"
    >
      <SparkleIcon size={16} color="var(--chakra-colors-neutral-500)" />
      <Text
        fontFamily="mono"
        fontSize="10px"
        lineHeight="16px"
        fontWeight="normal"
        letterSpacing="0.3px"
        textTransform="uppercase"
        color="neutral.500"
      >
        AI Assistant
      </Text>
      <Flex ml="auto" gap={1}>
        <PanelIconButton
          label="New conversation"
          onClick={() => {
            startNewConversation();
            setChatHistoryOpen(false);
          }}
        >
          <NotePencilIcon size={16} />
        </PanelIconButton>
        <PanelIconButton
          label="Conversation history"
          active={chatHistoryOpen}
          onClick={() => setChatHistoryOpen(!chatHistoryOpen)}
        >
          <ClockCounterClockwiseIcon size={16} />
        </PanelIconButton>
        <PanelIconButton
          label={
            isFullSize ? "Switch to compact view" : "Switch to full-size view"
          }
          onClick={onToggleSize}
        >
          <SidebarSimpleIcon size={16} />
        </PanelIconButton>
        <PanelIconButton
          label={isCollapsed ? "Expand panel" : "Collapse panel"}
          onClick={() => setChatCollapsed(!isCollapsed)}
        >
          {isCollapsed ? (
            <CaretDownIcon size={16} />
          ) : (
            <CaretUpIcon size={16} />
          )}
        </PanelIconButton>
      </Flex>
    </Flex>
  );
}

export default ChatPanelHeader;

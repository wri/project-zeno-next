import { Flex, IconButton, Text } from "@chakra-ui/react";
import {
  SidebarSimpleIcon,
  SparkleIcon,
  CaretDownIcon,
  CaretUpIcon,
} from "@phosphor-icons/react";
import { Tooltip } from "./components/ui/tooltip";

interface ChatPanelHeaderProps {
  /** Whether the panel is in full-size mode (vs compact) */
  isFullSize?: boolean;
  /** Whether there is active chat data — controls caret visibility in compact */
  hasConversation: boolean;
  /** Called when the user clicks the SidebarSimpleIcon (size toggle) */
  onToggleSize: () => void;
  /** Whether compact panel is currently collapsed (header-only). Compact only. */
  isCollapsed?: boolean;
  /** Called when the user clicks the caret (collapse/expand compact). Compact only. */
  onToggleCollapse?: () => void;
}

function ChatPanelHeader({
  isFullSize = false,
  onToggleSize,
  isCollapsed = false,
  onToggleCollapse,
}: ChatPanelHeaderProps) {
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
        <Tooltip
          content={
            isFullSize ? "Switch to compact view" : "Switch to full-size view"
          }
          showArrow
        >
          <IconButton
            size="2xs"
            variant="ghost"
            color="neutral.600"
            aria-label={
              isFullSize ? "Switch to compact view" : "Switch to full-size view"
            }
            onClick={onToggleSize}
          >
            <SidebarSimpleIcon size={16} />
          </IconButton>
        </Tooltip>
        {/* Caret in compact — always shown */}
        {!isFullSize && (
          <Tooltip
            content={isCollapsed ? "Expand panel" : "Collapse panel"}
            showArrow
          >
            <IconButton
              size="2xs"
              variant="ghost"
              color="neutral.600"
              aria-label={isCollapsed ? "Expand panel" : "Collapse panel"}
              onClick={onToggleCollapse}
            >
              {isCollapsed ? (
                <CaretDownIcon size={16} />
              ) : (
                <CaretUpIcon size={16} />
              )}
            </IconButton>
          </Tooltip>
        )}
      </Flex>
    </Flex>
  );
}

export default ChatPanelHeader;

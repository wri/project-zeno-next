import { Flex, IconButton, Text, Box } from "@chakra-ui/react";
import {
  SidebarSimpleIcon,
  SparkleIcon,
  CaretDownIcon,
  CaretUpIcon,
  DotsSixVerticalIcon,
  InfoIcon,
} from "@phosphor-icons/react";
import { Tooltip } from "./components/ui/tooltip";
import type { DragControls } from "framer-motion";

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
  /** Framer-motion drag controls — when provided, shows a drag handle icon */
  dragControls?: DragControls;
}

function ChatPanelHeader({
  isFullSize = false,
  hasConversation,
  onToggleSize,
  isCollapsed = false,
  onToggleCollapse,
  dragControls,
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
      {/* [PROTOTYPE] Drag handle — only rendered in floating compact mode.
          onPointerDown calls dragControls.start(e) which tells framer-motion
          to begin a drag on the parent motion.div. Because the parent has
          dragListener={false}, this is the ONLY way a drag can start, keeping
          clicks on buttons and text from accidentally moving the panel. */}
      {dragControls && (
        <Box
          as="span"
          cursor="grab"
          color="neutral.400"
          display="flex"
          alignItems="center"
          flexShrink={0}
          onPointerDown={(e: React.PointerEvent) => dragControls.start(e)}
          _active={{ cursor: "grabbing" }}
        >
          <DotsSixVerticalIcon size={16} />
        </Box>
      )}
      <SparkleIcon size={16} color="var(--chakra-colors-neutral-500)" />
      <Flex alignItems="center" gap={1}>
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
        {/* [PROTOTYPE] Disclaimer info icon — shown inline with the label in
            floating mode instead of the frosted-glass text below the cards.
            The full disclaimer text lives in the Tooltip content. */}
        {dragControls && (
          <Tooltip
            content="AI makes mistakes. Verify outputs and do not share any sensitive or personal information."
            showArrow
          >
            <Box
              as="span"
              color="neutral.400"
              display="flex"
              alignItems="center"
              cursor="default"
            >
              <InfoIcon size={12} />
            </Box>
          </Tooltip>
        )}
      </Flex>
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
        {!isFullSize && hasConversation && (
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

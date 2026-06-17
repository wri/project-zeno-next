import { Box } from "@chakra-ui/react";

import { CHAT_DISCLAIMER_TEXT } from "./chatPanelShared";

interface ChatPanelDisclaimerProps {
  /**
   * "inline" — a flush single line that sits in the panel's flex flow
   * (full-size panel), truncated with an ellipsis if space is tight.
   * "frosted" — a frosted-glass overlay that floats below the input card
   * (compact panel).
   */
  variant: "inline" | "frosted";
}

// Shared base: same copy size and colour in both variants; spacing/position
// and opacity differ per variant below.
const baseStyle = {
  fontSize: "10px",
  lineHeight: "20px",
  color: "#131619",
  whiteSpace: "nowrap",
} as const;

const variantStyle = {
  inline: {
    px: 3,
    py: 1,
    mt: -1,
    flexShrink: 0,
    overflow: "hidden",
    textOverflow: "ellipsis",
  },
  frosted: {
    px: 2,
    py: 0,
    mt: 1,
    opacity: 0.8,
    borderRadius: "sm",
    backdropFilter: "blur(24px)",
    bg: "whiteAlpha.200",
  },
} as const;

function ChatPanelDisclaimer({ variant }: ChatPanelDisclaimerProps) {
  return (
    <Box {...baseStyle} {...variantStyle[variant]}>
      {CHAT_DISCLAIMER_TEXT}
    </Box>
  );
}

export default ChatPanelDisclaimer;

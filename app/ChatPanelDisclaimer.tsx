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

// Shared base: same copy size, position offset and colour in both variants.
const baseStyle = {
  px: 2,
  py: 0,
  mt: 1,
  fontSize: "10px",
  lineHeight: "20px",
  color: "#131619",
  whiteSpace: "nowrap",
} as const;

const variantStyle = {
  inline: {
    opacity: 0.5,
    flexShrink: 0,
    overflow: "hidden",
    textOverflow: "ellipsis",
  },
  frosted: {
    opacity: 0.6,
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

/**
 * Shared chrome for the chat panel cards.
 *
 * Compact and full-size deliberately use DIFFERENT widths (the full-size panel
 * is wider), so width is intentionally NOT part of this object — each panel
 * sets its own. Everything else about the card surface is identical and lives
 * here so the two panels can't drift.
 */
export const chatPanelCardStyle = {
  bg: "bg",
  borderRadius: { base: 0, md: "sm" } as const,
  borderWidth: { base: 0, md: "1px" } as const,
  borderColor: "border.emphasized",
  overflow: "hidden",
} as const;

/**
 * Compliance copy shown beneath the chat input in both panels. Kept in one
 * place because the wording must never drift between layouts.
 */
export const CHAT_DISCLAIMER_TEXT =
  "AI makes mistakes. Verify outputs and do not share sensitive or personal information.";

import {
  CATALOG_COLUMN_Z_INDEX,
  CATALOG_PANEL_WIDTH_PX,
} from "@/app/explorationLayout";

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
 * Shared layout chrome for the catalog column (`CatalogPanel` + `AreasPanel`).
 * Width is fixed so toggling datasets ↔ areas cannot resize the column.
 */
export function getCatalogColumnPanelFlexProps(isChatFullSize: boolean) {
  return {
    h: "100%",
    w: `${CATALOG_PANEL_WIDTH_PX}px`,
    minW: `${CATALOG_PANEL_WIDTH_PX}px`,
    maxW: `${CATALOG_PANEL_WIDTH_PX}px`,
    flexShrink: 0,
    flexDirection: "column" as const,
    display: { base: "none", md: "flex" } as const,
    ...chatPanelCardStyle,
    // Full-size column docks against the chat panel's right border — no second
    // left border here, or the seam width shifts when toggling panels.
    borderLeftWidth: 0,
    borderRadius: {
      base: 0,
      md: isChatFullSize ? "0 sm sm 0" : "sm",
    },
  };
}

/** Absolute positioning shell shared by both catalog-column panels. */
export function getCatalogColumnMotionStyle(leftPx: number) {
  return {
    position: "absolute" as const,
    top: 0,
    bottom: 0,
    left: leftPx,
    width: CATALOG_PANEL_WIDTH_PX,
    boxSizing: "border-box" as const,
    zIndex: CATALOG_COLUMN_Z_INDEX,
    pointerEvents: "auto" as const,
  };
}

/**
 * Compliance copy shown beneath the chat input in both panels. Kept in one
 * place because the wording must never drift between layouts.
 */
export const CHAT_DISCLAIMER_TEXT =
  "AI makes mistakes. Verify outputs and do not share sensitive or personal information.";

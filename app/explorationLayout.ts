/** Shared geometry for the desktop exploration layout (chat + catalog + map). */

export const COMPACT_CHAT_INSET_PX = 12;
export const COMPACT_CHAT_PANEL_WIDTH_PX = 400;
export const FULLSIZE_CHAT_PANEL_WIDTH_PX = 428;
export const CATALOG_PANEL_WIDTH_PX = 400;
export const CATALOG_CARD_WIDTH_PX = 376;
export const CATALOG_CARD_HEIGHT_PX = 115;
/** Gap between adjacent exploration panels (chat ↔ catalog, catalog ↔ map controls). */
export const EXPLORATION_PANEL_GAP_PX = 8;
/** Catalog / areas slide-out column — shared with `app/app/(chat)/layout.tsx`. */
export const CATALOG_COLUMN_Z_INDEX = 1095;
/** Map feedback (selection mode, area validation) — above catalog column, below chat. */
export const MAP_FEEDBACK_Z_INDEX = 1096;

/**
 * Left offset of the catalog column (data catalog OR areas panel — they share
 * the same column slot and are mutually exclusive). Flush left when chat is
 * compact; flush against chat when full-size.
 */
export function getCatalogLeftPx(isChatFullSize: boolean): number {
  return isChatFullSize ? FULLSIZE_CHAT_PANEL_WIDTH_PX : 0;
}

/** Left inset for the compact chat column — shifts right when a catalog column panel is open. */
export function getCompactChatLeftPx(isCatalogColumnOpen: boolean): number {
  if (!isCatalogColumnOpen) return COMPACT_CHAT_INSET_PX;
  return CATALOG_PANEL_WIDTH_PX + EXPLORATION_PANEL_GAP_PX;
}

/** Left offset for map chrome (zoom, basemap) beside the chat and/or catalog column panels. */
export function getMapControlsLeftPx(
  isChatFullSize: boolean,
  isCatalogColumnOpen: boolean
): number {
  if (isChatFullSize) {
    if (!isCatalogColumnOpen) {
      return FULLSIZE_CHAT_PANEL_WIDTH_PX + EXPLORATION_PANEL_GAP_PX;
    }
    return (
      getCatalogLeftPx(true) + CATALOG_PANEL_WIDTH_PX + EXPLORATION_PANEL_GAP_PX
    );
  }

  return (
    getCompactChatLeftPx(isCatalogColumnOpen) +
    COMPACT_CHAT_PANEL_WIDTH_PX +
    EXPLORATION_PANEL_GAP_PX
  );
}

/**
 * Left margin for the top area-tool buttons (upload, select, draw).
 * In compact mode the chat is bottom-anchored, so when a catalog column panel
 * (data catalog OR areas) is open these tools sit beside that column — not
 * past the shifted chat panel. `MapAreaControls` applies `COMPACT_CHAT_INSET_PX`
 * via wrapper padding in compact mode, so this value is net of that inset.
 */
export function getMapAreaToolsLeftPx(
  isChatFullSize: boolean,
  isCatalogColumnOpen: boolean
): number {
  if (!isChatFullSize && isCatalogColumnOpen) {
    return (
      CATALOG_PANEL_WIDTH_PX + EXPLORATION_PANEL_GAP_PX - COMPACT_CHAT_INSET_PX
    );
  }

  if (isChatFullSize || isCatalogColumnOpen) {
    return getMapControlsLeftPx(isChatFullSize, isCatalogColumnOpen);
  }

  return 0;
}

/**
 * Left inset for dashboard page content beside the fixed chat overlay.
 * Only the full-size panel needs clearance — it spans the full viewport
 * height, so the centered content must re-center in the remaining space.
 * The compact panel is bottom-anchored and intentionally allowed to float
 * over the content, matching its behaviour over the map.
 */
export function getDashboardContentLeftPx(isChatFullSize: boolean): number {
  return isChatFullSize
    ? FULLSIZE_CHAT_PANEL_WIDTH_PX + EXPLORATION_PANEL_GAP_PX
    : 0;
}

/** Left offset for map feedback toasts (selection mode, draw validation). */
export function getMapFeedbackLeftPx(
  isChatFullSize: boolean,
  isCatalogColumnOpen: boolean
): number {
  if (isCatalogColumnOpen) {
    return (
      getCatalogLeftPx(isChatFullSize) +
      CATALOG_PANEL_WIDTH_PX +
      EXPLORATION_PANEL_GAP_PX
    );
  }
  return isChatFullSize
    ? getMapControlsLeftPx(true, false)
    : COMPACT_CHAT_INSET_PX;
}

/**
 * Width of the map's left edge hidden under the floating exploration panels,
 * for camera framing. A compact chat collapsed to its header bar leaves the
 * map's height clear, so only an open catalog column then covers it.
 */
export function getMapCoveredLeftPx(
  isChatFullSize: boolean,
  isChatCollapsed: boolean,
  isCatalogColumnOpen: boolean
): number {
  if (isChatCollapsed) {
    return isCatalogColumnOpen
      ? CATALOG_PANEL_WIDTH_PX + EXPLORATION_PANEL_GAP_PX
      : 0;
  }
  return getMapControlsLeftPx(isChatFullSize, isCatalogColumnOpen);
}

export const MAP_FIT_PADDING_PX = 50;
/** Narrowest visible strip still worth framing into. */
const MIN_FRAMED_WIDTH_PX = 240;

/**
 * fitBounds padding that frames bounds in the part of the map the floating
 * panels leave visible. Falls back to even padding when that strip is too
 * narrow, since MapLibre refuses to fit and leaves the camera where it was.
 */
export function getMapFitPadding(
  coveredLeftPx: number,
  mapWidthPx: number
): { top: number; bottom: number; left: number; right: number } {
  const left = coveredLeftPx + MAP_FIT_PADDING_PX;
  const visibleWidth = mapWidthPx - left - MAP_FIT_PADDING_PX;
  return {
    top: MAP_FIT_PADDING_PX,
    bottom: MAP_FIT_PADDING_PX,
    right: MAP_FIT_PADDING_PX,
    left: visibleWidth >= MIN_FRAMED_WIDTH_PX ? left : MAP_FIT_PADDING_PX,
  };
}

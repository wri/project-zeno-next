/** Shared geometry for the desktop exploration layout (chat + catalog + map). */

export const COMPACT_CHAT_INSET_PX = 12;
export const COMPACT_CHAT_PANEL_WIDTH_PX = 400;
export const FULLSIZE_CHAT_PANEL_WIDTH_PX = 428;
export const DATA_CATALOG_PANEL_WIDTH_PX = 400;
export const DATA_CATALOG_CARD_WIDTH_PX = 376;
export const DATA_CATALOG_CARD_HEIGHT_PX = 115;
/** Gap between adjacent exploration panels (chat ↔ catalog, catalog ↔ map controls). */
export const EXPLORATION_PANEL_GAP_PX = 8;

/** Left offset of the data-catalog column. Flush left when chat is compact; flush against chat when full-size. */
export function getDataCatalogLeftPx(isChatFullSize: boolean): number {
  return isChatFullSize ? FULLSIZE_CHAT_PANEL_WIDTH_PX : 0;
}

/** Left inset for the compact chat column — shifts right when the catalog is open. */
export function getCompactChatLeftPx(isDataCatalogOpen: boolean): number {
  if (!isDataCatalogOpen) return COMPACT_CHAT_INSET_PX;
  return DATA_CATALOG_PANEL_WIDTH_PX + EXPLORATION_PANEL_GAP_PX;
}

/** Left offset for map chrome (zoom, basemap) beside the chat and/or catalog panels. */
export function getMapControlsLeftPx(
  isChatFullSize: boolean,
  isDataCatalogOpen: boolean
): number {
  if (isChatFullSize) {
    if (!isDataCatalogOpen) {
      return FULLSIZE_CHAT_PANEL_WIDTH_PX + EXPLORATION_PANEL_GAP_PX;
    }
    return (
      getDataCatalogLeftPx(true) +
      DATA_CATALOG_PANEL_WIDTH_PX +
      EXPLORATION_PANEL_GAP_PX
    );
  }

  return (
    getCompactChatLeftPx(isDataCatalogOpen) +
    COMPACT_CHAT_PANEL_WIDTH_PX +
    EXPLORATION_PANEL_GAP_PX
  );
}

/**
 * Shared dimensions for the AOI map label and its actions button.
 *
 * The design (Figma "AoI menu selection") draws them as two separate chips in a
 * horizontal row, so both surfaces have to agree on height, radius, padding and
 * colour or the pair stops reading as one control.
 *
 * The background is the literal hex rather than `primary.700`: Figma names this
 * token "Primary/700", but the app theme's `primary.700` is #002C6C, a visibly
 * darker blue. Following the design here, as three other components already do.
 * Reconciling the two palettes is a wider job than this feature.
 */
export const AOI_LABEL_BG = "#21509A";
/** One step darker, for the actions chip's hover state. */
export const AOI_LABEL_BG_HOVER = "#1A4079";
export const AOI_LABEL_HEIGHT = "32px";
export const AOI_LABEL_RADIUS = "4px";
export const AOI_LABEL_PADDING = "8px";
/** Between the label's own contents: icon, name, close. */
export const AOI_LABEL_GAP = "10px";
/** Between the two chips. Tighter than the internal gap, so the pair still
 *  reads as one control rather than two unrelated buttons. */
export const AOI_CHIP_GAP = "4px";

import { StackSimpleIcon } from "@phosphor-icons/react";

/**
 * The icon that marks an output made straight from a dataset ("SOURCE: …"),
 * beside the AI sparkle. Internal review is still choosing between stack,
 * check circle and seal check (PZB-1738), so every surface reads it from here.
 * Outline only, like the sparkle: render it with `weight="thin"`.
 */
export const SourceDataIcon = StackSimpleIcon;

export const SOURCE_DATA_ICON_COLOR = "#009E77";

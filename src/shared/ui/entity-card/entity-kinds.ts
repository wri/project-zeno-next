import {
  ChartLineIcon,
  CheckCircleIcon,
  PolygonIcon,
  SparkleIcon,
  SquaresFourIcon,
  StackSimpleIcon,
  type Icon,
  type IconWeight,
} from "@phosphor-icons/react";

/**
 * The four things the app lists as cards — in chat, in the catalogue panels
 * and in the composer's picker. Each kind's label, accent and glyph live here
 * so every surface renders an area (or a dataset, …) the same way.
 */
export type EntityKind = "area" | "dataset" | "analysis" | "dashboard";

export interface EntityKindSpec {
  /** Mono eyebrow label on chat cards. */
  label: string;
  /** Accent for the eyebrow, panel header icons and thumbnail fallbacks. */
  color: string;
  /** Light wash of `color` behind a kind's glyph or thumbnail fallback. */
  tint: string;
  /** Glyph for a thumbnail with nothing better to show, and for panel headers. */
  Icon: Icon;
  /** Leaves `Icon` off the chat-card eyebrow, so the label stands alone. */
  plainEyebrow?: boolean;
}

export const ENTITY_KINDS: Record<EntityKind, EntityKindSpec> = {
  area: {
    label: "AREA",
    color: "#2D6BE4",
    tint: "rgba(45, 107, 228, 0.06)",
    Icon: PolygonIcon,
  },
  dataset: {
    label: "DATA",
    color: "#1AA915",
    tint: "rgba(26, 169, 21, 0.06)",
    Icon: StackSimpleIcon,
    plainEyebrow: true,
  },
  analysis: {
    label: "ANALYSIS",
    color: "#0049AA",
    tint: "rgba(0, 73, 170, 0.06)",
    Icon: ChartLineIcon,
  },
  dashboard: {
    label: "DASHBOARD",
    color: "#CE8303",
    tint: "rgba(206, 131, 3, 0.06)",
    Icon: SquaresFourIcon,
  },
};

/**
 * How an analysis was produced. Structurally identical to the insight
 * entity's `InsightVerification`, spelled out here so the shared layer does
 * not import the entity.
 */
export type AnalysisVerification = "verified" | "ai-generated";

export interface EyebrowSpec {
  label: string;
  color: string;
  Icon?: Icon;
  iconColor?: string;
  iconWeight?: IconWeight;
}

/**
 * An analysis card's eyebrow says both what it is and how it was made, in
 * one badge, on every surface: a green check for a curated (direct-query)
 * analysis, a grey sparkle for an AI-assisted one. Colours match the
 * workspace's `InsightCaption`.
 */
export const VERIFICATION_EYEBROW: Record<AnalysisVerification, EyebrowSpec> = {
  verified: {
    label: "CURATED ANALYSIS",
    color: "#656E7B",
    Icon: CheckCircleIcon,
    iconColor: "#009E77",
  },
  "ai-generated": {
    label: "AI-ASSISTED ANALYSIS",
    color: "#737C94",
    Icon: SparkleIcon,
    iconColor: "#737C94",
    iconWeight: "thin",
  },
};

/** Default tooltip for a card's (i) button, by kind. */
export const KIND_INFO_LABEL: Record<EntityKind, string> = {
  area: "Show area info",
  dataset: "Show dataset info",
  analysis: "View analysis",
  dashboard: "Show dashboard info",
};

import { InsightWidget } from "./chat";

/**
 * A slimmed-down InsightWidget safe for persistence.
 * Strips `generation` (base64-heavy provenance) entirely — users navigate
 * back to the source chat thread for that.
 */
export interface PinnedWidget {
  type: InsightWidget["type"];
  title: string;
  description: string;
  data: unknown;
  xAxis: string;
  yAxis: string;
  sourceThreadId: string;
  sourceTraceId?: string;
  sourceMessageId?: string;
  /** When set, indicates the table was truncated from this many rows. */
  truncatedFrom?: number;
}

export interface ReportBlock {
  id: string;
  kind: "title" | "text" | "insight";
  /** For "title" and "text" blocks */
  content?: string;
  /** For "insight" blocks — snapshot of the widget at pin time */
  widget?: PinnedWidget;
  /** Grid span — full width (2 cols) or half (1 col) */
  size: "full" | "half";
  /** Position in the report (0-indexed) */
  order: number;
  createdAt: string;
}

export interface Report {
  id: string;
  title: string;
  blocks: ReportBlock[];
  createdAt: string;
  updatedAt: string;
}

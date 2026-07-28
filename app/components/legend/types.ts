import { ReactNode } from "react";

/**
 * A single read-only parameter chip shown beneath a layer title.
 * e.g. { label: "YEAR", value: "2025" } or { label: "CANOPY", value: "> 30%" }
 */
export interface LegendParam {
  label: string;
  value: string;
  /** ParamChip passthrough for values wider than the 15ch default (dates). */
  maxValueWidth?: string;
}

/**
 * A contextual sub-layer shown indented under a parent layer card with a
 * "within" prefix. e.g. "within ■ Primary Forests (2001)".
 */
export interface LegendContextLayer {
  id: string;
  title: string;
  color: string;
  opacity: number;
  info?: string;
}

/**
 * Represents a single layer in the legend.
 */
export interface LegendLayer {
  id: string;
  title: string;
  opacity: number;
  params?: LegendParam[];
  contextLayer?: LegendContextLayer;
  symbology: ReactNode;
  children?: ReactNode;
  info?: string;
  hideOpacityControl?: boolean;
  hideRemoveControl?: boolean;
}

/**
 * One Sentinel-2 mosaic in the imagery legend group — a single show_imagery
 * run, backed by one raster map layer.
 */
export interface ImageryLegendCapture {
  layerId: string;
  /** Mosaic AOI names joined — the group header the capture sorts under. */
  areaLabel: string;
  /** e.g. "15 Jun 2026" */
  dateLabel: string;
  /** e.g. "cloud <50% · 9 scenes" — empty when the payload lacks the fields */
  metaLabel: string;
  visible: boolean;
  /** The most recent capture — the one the agent updates in place. */
  live: boolean;
  thumbnailUrl?: string;
}

/**
 * The single "Satellite Imagery" legend section grouping every imagery
 * capture on the map. Summary fields (params/info/note/thumbnail) reflect
 * the live capture.
 */
export interface ImageryLegendGroup {
  kind: "imagery";
  id: string;
  title: string;
  opacity: number;
  subtitle: string;
  params: LegendParam[];
  info?: string;
  note?: string;
  captures: ImageryLegendCapture[];
  areaCount: number;
  /** show_imagery announced but its result not yet streamed. */
  updating: boolean;
  thumbnailUrl?: string;
  /** Hosts where the layer isn't removable (dashboard map widgets). */
  hideRemoveControl?: boolean;
}

/** A renderable legend entry: a dataset layer card or the imagery group. */
export type LegendEntry = LegendLayer | ImageryLegendGroup;

export const isImageryGroup = (
  entry: LegendEntry
): entry is ImageryLegendGroup =>
  (entry as ImageryLegendGroup).kind === "imagery";

export type LayerActionArgs =
  | {
      action: "remove";
      payload: { id: string };
    }
  | {
      action: "opacity";
      payload: { id: string; opacity: number };
    }
  | {
      action: "visibility";
      payload: { id: string; visible: boolean };
    }
  | {
      action: "reorder";
      payload: { layers: LegendEntry[] };
    };

export type LayerActionHandler = (args: LayerActionArgs) => void;

export type SymbolColor = string;
export type SymbolColorValue<T = number | string> = {
  color: string;
  value?: T;
  label?: T;
};

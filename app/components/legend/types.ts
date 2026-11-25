import { ReactNode } from "react";
import type { ImageryMetadata } from "@/app/constants/planet-metadata";
import type {
  CaptureStatus,
  Scene,
  Sentinel2Request,
} from "@/src/features/imagery";

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
  /**
   * Symbol list for context layers whose legend has more than one class.
   * Single-class layers (e.g. Primary Forests) are fully described by the
   * swatch beside the title, so they leave this unset; multi-class ones
   * (Intact Forest Landscapes, with its reduction epochs) would otherwise
   * render with no legend for every class but the first.
   */
  symbology?: ReactNode;
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
  /**
   * Client-rendered capture: its scenes and the area's bounds, for a
   * thumbnail cropped to the area (SceneThumbnail). Replaces thumbnailUrl.
   */
  thumbnail?: CaptureThumbnail;
}

export interface CaptureThumbnail {
  scenes: Scene[];
  bounds?: [number, number, number, number];
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
  /** The live provider's full metadata; when set, the info button opens the
   * metadata dialog instead of the `info` popover. */
  metadata?: ImageryMetadata;
  /** The live capture's start date, for the citation's image year. */
  imageDate?: string;
  captures: ImageryLegendCapture[];
  areaCount: number;
  /** show_imagery announced but its result not yet streamed. */
  updating: boolean;
  thumbnailUrl?: string;
  /** The live capture's scene thumbnail (client-rendered imagery). */
  thumbnail?: CaptureThumbnail;
  /**
   * Set when the live capture is rendered in the browser (Sentinel-2,
   * `?ff=client-imagery`): its request, which the focus editor starts from,
   * and its scene search status.
   */
  sentinel2?: { request: Sentinel2Request; status: CaptureStatus };
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
    }
  | {
      /** Show a Sentinel-2 capture for this request (the focus editor's draft, or a quick fix). */
      action: "imagery-request";
      payload: { request: Sentinel2Request };
    };

export type LayerActionHandler = (args: LayerActionArgs) => void;

export type SymbolColor = string;
export type SymbolColorValue<T = number | string> = {
  color: string;
  value?: T;
  label?: T;
};

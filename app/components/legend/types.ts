import { ReactNode } from "react";

/**
 * A single read-only parameter chip shown beneath a layer title.
 * e.g. { label: "YEAR", value: "2025" } or { label: "CANOPY", value: "> 30%" }
 */
export interface LegendParam {
  label: string;
  value: string;
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
      action: "reorder";
      payload: { layers: LegendLayer[] };
    };

export type LayerActionHandler = (args: LayerActionArgs) => void;

export type SymbolColor = string;
export type SymbolColorValue<T = number | string> = {
  color: string;
  value?: T;
  label?: T;
};

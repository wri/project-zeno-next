import { ReactNode } from "react";
import type { ParamSpec } from "@/app/constants/datasets";

/**
 * Represents a single layer in the legend.
 */
export interface LegendLayer {
  id: string;
  title: string;
  visible: boolean;
  opacity: number;
  dateRange?: string;
  symbology: ReactNode;
  children?: ReactNode;
  info?: string;
  /** Whether this layer has user-editable parameters. */
  configurable?: boolean;
  /** Current active param values (e.g. { start_year: 2010, end_year: 2024, confidence: "highest" }). */
  params?: Record<string, number | string>;
  /** Specs describing each configurable parameter. */
  paramSpecs?: Record<string, ParamSpec>;
}

export type LayerActionArgs =
  | {
      action: "remove";
      payload: { id: string };
    }
  | {
      action: "visibility";
      payload: { id: string; visible: boolean };
    }
  | {
      action: "opacity";
      payload: { id: string; opacity: number };
    }
  | {
      action: "reorder";
      payload: { layers: LegendLayer[] };
    }
  | {
      action: "params";
      payload: { id: string; params: Record<string, number | string> };
    };

export type LayerActionHandler = (args: LayerActionArgs) => void;

export type SymbolColor = string;
export type SymbolColorValue<T = number | string> = {
  color: string;
  value?: T;
  label?: T;
};

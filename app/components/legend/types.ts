import { ReactNode } from "react";

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
    };

export type LayerActionHandler = (args: LayerActionArgs) => void;

export type SymbolColor = string;
export type SymbolColorValue<T = number | string> = {
  color: string;
  value: T;
};

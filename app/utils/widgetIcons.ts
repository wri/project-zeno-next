import {
  ChartBarIcon,
  ChartLineIcon,
  ChartPieSliceIcon,
  ChartPolarIcon,
  ChartScatterIcon,
  ListNumbersIcon,
  StackIcon,
} from "@phosphor-icons/react";
import type { Icon } from "@phosphor-icons/react";
import type { InsightWidget } from "@/app/types/chat";

/**
 * Maps an InsightWidget type to the Phosphor icon *component* (not an
 * instance), so callers can pass their own size/color/weight props.
 *
 * Mirrors the `WidgetIcons` element map in ChatPanelHeader.tsx — kept in
 * sync manually for now since the two have different ergonomics.
 */
export const WidgetIconComponent: Record<InsightWidget["type"], Icon> = {
  line: ChartLineIcon,
  bar: ChartBarIcon,
  "stacked-bar": ChartBarIcon,
  "grouped-bar": ChartBarIcon,
  pie: ChartPieSliceIcon,
  area: ChartPolarIcon,
  scatter: ChartScatterIcon,
  table: ListNumbersIcon,
  "dataset-card": StackIcon,
};

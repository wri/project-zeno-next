import {
  ChartBarIcon,
  ChartLineIcon,
  ChartPieSliceIcon,
  ChartPolarIcon,
  ChartScatterIcon,
  ListNumbersIcon,
  PresentationChartIcon,
  StackIcon,
} from "@phosphor-icons/react";
import type { Icon } from "@phosphor-icons/react";
import type { InsightWidget } from "@/app/types/chat";

/**
 * Maps an InsightWidget type to the Phosphor icon *component* (not an
 * instance), so callers can pass their own size/color/weight props.
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

/** Element-instance map for inline rendering without size/color overrides. */
export const WidgetIcons = {
  line: <ChartLineIcon />,
  table: <ListNumbersIcon />,
  bar: <ChartBarIcon />,
  "stacked-bar": <ChartBarIcon />,
  "grouped-bar": <ChartBarIcon />,
  pie: <ChartPieSliceIcon />,
  insight: <PresentationChartIcon />,
  "dataset-card": <StackIcon />,
  scatter: <ChartScatterIcon />,
  area: <ChartPolarIcon />,
};

"use client";
import { InsightWidget } from "@/app/types/chat";
import { WidgetIconComponent } from "@/app/utils/widgetIcons";
import { InfoCard } from "./InfoCard";

const CHART_TYPE_LABEL: Record<InsightWidget["type"], string> = {
  line: "Line chart",
  bar: "Bar chart",
  "stacked-bar": "Stacked bar chart",
  "grouped-bar": "Grouped bar chart",
  pie: "Pie chart",
  area: "Area chart",
  scatter: "Scatter chart",
  table: "Table",
  "dataset-card": "Dataset",
};

const ROW_NOUN: Record<InsightWidget["type"], string> = {
  table: "rows",
  "dataset-card": "items",
  line: "data points",
  bar: "data points",
  "stacked-bar": "data points",
  "grouped-bar": "data points",
  pie: "data points",
  area: "data points",
  scatter: "data points",
};

function buildSubtitle(widget: InsightWidget): string {
  const chartLabel = CHART_TYPE_LABEL[widget.type] ?? widget.type;
  if (!Array.isArray(widget.data)) return chartLabel;
  const count = widget.data.length;
  const noun = ROW_NOUN[widget.type] ?? "data points";
  const label = count === 1 ? noun.replace(/s$/, "") : noun;
  return `${chartLabel} · ${count} ${label}`;
}

interface AnalysisCardProps {
  widget: InsightWidget;
  onClick?: () => void;
  selected?: boolean;
}

export function AnalysisCard({ widget, onClick, selected }: AnalysisCardProps) {
  const Icon = WidgetIconComponent[widget.type];
  return (
    <InfoCard
      thumbnail={<Icon size={32} color="#0049AA" />}
      thumbnailBg="#F7F9FF"
      typeLabel="ANALYSIS"
      typeLabelColor="#8E9954"
      title={widget.title}
      description={buildSubtitle(widget)}
      onClick={onClick}
      selected={selected}
    />
  );
}

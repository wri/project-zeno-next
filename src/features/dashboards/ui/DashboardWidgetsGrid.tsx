"use client";

import { useMemo, useState } from "react";
import { Grid, GridItem } from "@chakra-ui/react";

import useAuthStore from "@/app/store/authStore";
import type { InsightWidget } from "@/app/types/chat";
import type { Dashboard, DashboardWidget } from "../api/schemas";
import {
  chartSize,
  computeReorder,
  dashboardWidgetToInsightWidgets,
  widgetSize,
  withChartSize,
  withSize,
} from "../lib/widgets";
import {
  useDeleteWidget,
  useReorderWidgets,
  useUpdateWidget,
} from "./dashboardQueries";
import DashboardWidgetCard from "./DashboardWidgetCard";

/**
 * One grid cell. A widget whose insight has several charts renders one cell
 * per chart (each its own card, per design); placeholder cells (unsupported
 * widget type, hidden insight) carry `card: null` and placeholder copy.
 */
interface GridCell {
  key: string;
  widget: DashboardWidget;
  card: InsightWidget | null;
  placeholder: string | null;
  chartCount: number;
}

function cellsForWidget(
  widget: DashboardWidget,
  areaName: string | undefined
): GridCell[] {
  if (widget.widget_type !== "insight") {
    return [
      {
        key: widget.id,
        widget,
        card: null,
        placeholder: `This ${widget.widget_type} widget isn't supported here yet.`,
        chartCount: 0,
      },
    ];
  }
  const cards = dashboardWidgetToInsightWidgets(widget, { areaName });
  if (cards.length === 0) {
    return [
      {
        key: widget.id,
        widget,
        card: null,
        placeholder: "This analysis is not available.",
        chartCount: 0,
      },
    ];
  }
  return cards.map((card) => ({
    key: `${widget.id}:${card.id}`,
    widget,
    card,
    placeholder: null,
    chartCount: cards.length,
  }));
}

/**
 * The dashboard's widget grid. Reordering is native HTML5 drag-and-drop,
 * armed only while the card's drag handle is pressed (so text selection and
 * chart interactions inside the card keep working); the drop target gets the
 * design's dashed outline. Cells map 1:1 to charts, but position and column
 * span persist on the underlying widget via the PATCH endpoint
 * (optimistically, in dashboardQueries) — dragging any card of a multi-chart
 * widget moves the whole widget, and its cards stay adjacent.
 */
export default function DashboardWidgetsGrid({
  dashboard,
}: {
  dashboard: Dashboard;
}) {
  const userId = useAuthStore((s) => s.userId);
  const isOwner = !!userId && userId === dashboard.user_id;

  const updateWidget = useUpdateWidget(dashboard.id);
  const deleteWidget = useDeleteWidget(dashboard.id);
  const reorderWidgets = useReorderWidgets(dashboard.id);

  // grabbedKey arms draggable on one grid item; dragIndex/overIndex track the
  // HTML5 drag in flight (cell indices).
  const [grabbedKey, setGrabbedKey] = useState<string | null>(null);
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [overIndex, setOverIndex] = useState<number | null>(null);

  const widgets = useMemo(
    () => [...dashboard.widgets].sort((a, b) => a.position - b.position),
    [dashboard.widgets]
  );
  const areaName = dashboard.aois[0]?.name;
  const cells = useMemo(
    () => widgets.flatMap((widget) => cellsForWidget(widget, areaName)),
    [widgets, areaName]
  );

  const endDrag = () => {
    setGrabbedKey(null);
    setDragIndex(null);
    setOverIndex(null);
  };

  // Cards of the same widget share a position — dropping on a sibling is a no-op.
  const isDropTarget = (index: number) =>
    dragIndex !== null &&
    cells[dragIndex]?.widget.id !== cells[index]?.widget.id;

  const dropOn = (targetIndex: number) => {
    if (dragIndex !== null && isDropTarget(targetIndex)) {
      const fromIndex = widgets.findIndex(
        (w) => w.id === cells[dragIndex].widget.id
      );
      const toIndex = widgets.findIndex(
        (w) => w.id === cells[targetIndex].widget.id
      );
      const { patches } = computeReorder(widgets, fromIndex, toIndex);
      if (patches.length > 0) reorderWidgets.mutate(patches);
    }
    endDrag();
  };

  return (
    <Grid templateColumns={{ base: "1fr", lg: "repeat(2, 1fr)" }} gap={4}>
      {cells.map((cell, i) => {
        const { widget, card } = cell;
        const size = card?.id
          ? chartSize(widget.config, card.id)
          : widgetSize(widget.config);
        const title =
          card?.title ??
          (typeof widget.config.title === "string" ? widget.config.title : "");
        return (
          <GridItem
            key={cell.key}
            colSpan={{ base: 1, lg: size === "double" ? 2 : 1 }}
            draggable={isOwner && grabbedKey === cell.key}
            onDragStart={() => setDragIndex(i)}
            onDragEnd={endDrag}
            onDragOver={(e) => {
              if (dragIndex === null) return;
              e.preventDefault();
              setOverIndex(i);
            }}
            onDrop={() => dropOn(i)}
            opacity={dragIndex === i ? 0.4 : 1}
            outline={
              overIndex === i && dragIndex !== null && isDropTarget(i)
                ? "2px dashed"
                : undefined
            }
            outlineColor="primary.solid"
            borderRadius="sm"
          >
            <DashboardWidgetCard
              title={title}
              card={card}
              placeholder={cell.placeholder}
              chartCount={cell.chartCount}
              isOwner={isOwner}
              isDouble={size === "double"}
              onArmDrag={() => setGrabbedKey(cell.key)}
              onDisarmDrag={() => setGrabbedKey(null)}
              onToggleSize={() =>
                updateWidget.mutate({
                  widgetId: widget.id,
                  patch: {
                    config: card?.id
                      ? withChartSize(
                          widget.config,
                          card.id,
                          size === "double" ? "single" : "double"
                        )
                      : withSize(
                          widget.config,
                          size === "double" ? "single" : "double"
                        ),
                  },
                })
              }
              onRemove={() => deleteWidget.mutate(widget.id)}
            />
          </GridItem>
        );
      })}
    </Grid>
  );
}

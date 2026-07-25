"use client";

import { useMemo, useState } from "react";
import { Grid, GridItem } from "@chakra-ui/react";

import useAuthStore from "@/app/store/authStore";
import type { InsightWidget } from "@/app/types/chat";
import type { Dashboard, DashboardWidget } from "../api/schemas";
import type { DashboardMode } from "../hooks/useDashboardMode";
import {
  chartSize,
  computeReorder,
  dashboardWidgetToInsightWidgets,
  widgetSize,
  widgetText,
  withChartHidden,
  withChartSize,
  withChartTitle,
  withSize,
  withText,
  withWidgetTitle,
} from "../lib/widgets";
import {
  mapWidgetLayer,
  mapWidgetViewportBbox,
  type MapWidgetLayer,
} from "../lib/mapWidgets";
import {
  useDeleteWidget,
  useReorderWidgets,
  useUpdateWidget,
} from "./dashboardQueries";
import DashboardWidgetCard from "./DashboardWidgetCard";
import DashboardTextWidgetCard from "./DashboardTextWidgetCard";

/**
 * One grid cell. A widget whose insight has several charts renders one cell
 * per chart (each its own card, per design); map widgets render one cell
 * with `map` set; placeholder cells (unsupported widget type, hidden
 * insight, malformed map config) carry `card: null` and placeholder copy.
 */
interface GridCell {
  key: string;
  widget: DashboardWidget;
  card: InsightWidget | null;
  map: MapWidgetLayer | null;
  text: string | null;
  placeholder: string | null;
  chartCount: number;
}

function cellsForWidget(
  widget: DashboardWidget,
  areaName: string | undefined
): GridCell[] {
  if (widget.widget_type === "map") {
    const map = mapWidgetLayer(widget.config);
    return [
      {
        key: widget.id,
        widget,
        card: null,
        map,
        text: null,
        placeholder: map ? null : "This map widget can't be displayed.",
        chartCount: 0,
      },
    ];
  }
  if (widget.widget_type === "text") {
    const text = widgetText(widget.config);
    return [
      {
        key: widget.id,
        widget,
        card: null,
        map: null,
        text,
        placeholder: text ? null : "This note is empty.",
        chartCount: 0,
      },
    ];
  }
  if (widget.widget_type !== "insight") {
    return [
      {
        key: widget.id,
        widget,
        card: null,
        map: null,
        text: null,
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
        map: null,
        text: null,
        placeholder: "This analysis is not available.",
        chartCount: 0,
      },
    ];
  }
  return cards.map((card) => ({
    key: `${widget.id}:${card.id}`,
    widget,
    card,
    map: null,
    text: null,
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
 *
 * `mode` is presentation only: report mode renders the same cells (same keys,
 * so maps and chart state never remount) with the editing chrome absent —
 * `canEdit` folds it into the ownership gate everywhere chrome is rendered.
 */
export default function DashboardWidgetsGrid({
  dashboard,
  mode = "edit",
}: {
  dashboard: Dashboard;
  mode?: DashboardMode;
}) {
  const userId = useAuthStore((s) => s.userId);
  const isOwner = !!userId && userId === dashboard.user_id;
  // The two bits the cards act on: canEdit gates chrome, isReport picks the
  // document styling. Derived here once so the pair stays consistent.
  const canEdit = isOwner && mode === "edit";
  const isReport = mode === "report";

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
  const areaAoi = dashboard.aois[0];
  const areaName = areaAoi?.name;
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
  const isDropTarget = (index: number) => {
    const dragged = dragIndex !== null ? cells[dragIndex] : undefined;
    const target = cells[index];
    return !!dragged && !!target && dragged.widget.id !== target.widget.id;
  };

  const dropOn = (targetIndex: number) => {
    const draggedCell = dragIndex !== null ? cells[dragIndex] : undefined;
    const targetCell = cells[targetIndex];
    if (
      draggedCell &&
      targetCell &&
      draggedCell.widget.id !== targetCell.widget.id
    ) {
      const fromIndex = widgets.findIndex(
        (w) => w.id === draggedCell.widget.id
      );
      const toIndex = widgets.findIndex((w) => w.id === targetCell.widget.id);
      if (fromIndex >= 0 && toIndex >= 0) {
        const { patches } = computeReorder(widgets, fromIndex, toIndex);
        if (patches.length > 0) reorderWidgets.mutate(patches);
      }
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
          cell.map?.title ??
          (typeof widget.config.title === "string" ? widget.config.title : "");
        return (
          <GridItem
            key={cell.key}
            colSpan={{ base: 1, lg: size === "double" ? 2 : 1 }}
            draggable={canEdit && grabbedKey === cell.key}
            onDragStart={(e) => {
              // Required for Firefox to initiate drag-and-drop.
              e.dataTransfer.setData("text/plain", cell.key);
              e.dataTransfer.effectAllowed = "move";
              setDragIndex(i);
            }}
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
            {widget.widget_type === "text" ? (
              <DashboardTextWidgetCard
                text={cell.text}
                placeholder={cell.placeholder}
                canEdit={canEdit}
                isReport={isReport}
                isDouble={size === "double"}
                onArmDrag={() => setGrabbedKey(cell.key)}
                onDisarmDrag={() => setGrabbedKey(null)}
                onToggleSize={() =>
                  updateWidget.mutate({
                    widgetId: widget.id,
                    patch: {
                      config: withSize(
                        widget.config,
                        size === "double" ? "single" : "double"
                      ),
                    },
                  })
                }
                onSaveText={(next) =>
                  updateWidget.mutate({
                    widgetId: widget.id,
                    patch: { config: withText(widget.config, next) },
                  })
                }
                onRemove={() => deleteWidget.mutate(widget.id)}
              />
            ) : (
              <DashboardWidgetCard
                title={title}
                card={card}
                map={cell.map}
                aoi={areaAoi}
                viewportBbox={
                  cell.map ? mapWidgetViewportBbox(widget.config) : null
                }
                placeholder={cell.placeholder}
                chartCount={cell.chartCount}
                canEdit={canEdit}
                isReport={isReport}
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
                onRename={
                  // Renamable only for renderable cells (map/imagery/chart);
                  // per-chart titles key on card.id, single-card widgets on
                  // config.title.
                  cell.placeholder
                    ? undefined
                    : (name) =>
                        updateWidget.mutate({
                          widgetId: widget.id,
                          patch: {
                            config: card?.id
                              ? withChartTitle(widget.config, card.id, name)
                              : withWidgetTitle(widget.config, name),
                          },
                        })
                }
                onRemove={() => {
                  // A chart card hides just its chart from the widget's shown
                  // set; the widget is deleted only when its last chart goes
                  // (or for placeholder cells that have no chart id).
                  const chartId = card?.id;
                  const charts = widget.insight?.charts;
                  if (!chartId || !charts) {
                    deleteWidget.mutate(widget.id);
                    return;
                  }
                  const allChartIds = [...charts]
                    .sort((a, b) => a.position - b.position)
                    .map((c) => c.id);
                  const next = withChartHidden(
                    widget.config,
                    chartId,
                    allChartIds
                  );
                  if (next === null) deleteWidget.mutate(widget.id);
                  else
                    updateWidget.mutate({
                      widgetId: widget.id,
                      patch: { config: next },
                    });
                }}
              />
            )}
          </GridItem>
        );
      })}
    </Grid>
  );
}

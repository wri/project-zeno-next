"use client";

import { useMemo, useState } from "react";
import { Box, Flex } from "@chakra-ui/react";

import useAuthStore from "@/app/store/authStore";
import type { Dashboard, DashboardWidget } from "../api/schemas";
import { packCells } from "../lib/packing";
import {
  computeReorder,
  mapWidgetSize,
  widgetSize,
  widgetText,
  withSize,
  withText,
  withWidgetTitle,
  type WidgetSize,
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
import { TWO_COLUMN_QUERY } from "./gridLayout";
import DashboardInsightModule from "./DashboardInsightModule";
import DashboardWidgetCard from "./DashboardWidgetCard";
import DashboardTextWidgetCard from "./DashboardTextWidgetCard";

/**
 * The body of a standalone (non-insight) grid item: the map layer for map
 * widgets, the markdown text for notes, or placeholder copy when the config
 * can't be rendered. Insight widgets don't come through here — they render
 * whole as `DashboardInsightModule`.
 */
interface StandaloneBody {
  map: MapWidgetLayer | null;
  text: string | null;
  placeholder: string | null;
}

function standaloneBody(widget: DashboardWidget): StandaloneBody {
  if (widget.widget_type === "map") {
    const map = mapWidgetLayer(widget.config);
    return {
      map,
      text: null,
      placeholder: map ? null : "This map widget can't be displayed.",
    };
  }
  if (widget.widget_type === "text") {
    const text = widgetText(widget.config);
    return {
      map: null,
      text,
      placeholder: text ? null : "This note is empty.",
    };
  }
  return {
    map: null,
    text: null,
    placeholder: `This ${widget.widget_type} widget isn't supported here yet.`,
  };
}

/** The persisted column span for a top-level item (insights always span both). */
function topLevelSize(widget: DashboardWidget): WidgetSize {
  if (widget.widget_type === "insight") return "double";
  if (widget.widget_type === "map") return mapWidgetSize(widget.config);
  return widgetSize(widget.config);
}

/**
 * The dashboard's widget grid. Each widget is one top-level item: insight
 * widgets render as a full-width `DashboardInsightModule` (header · summary ·
 * their chart cards packed inside), while map/text widgets keep their single
 * cards and can still pair into two columns via `packCells`.
 *
 * Reordering is native HTML5 drag-and-drop at widget level, armed only while
 * a drag handle is pressed (so text selection and chart interactions keep
 * working); the drop target gets the design's dashed outline. Items are keyed
 * on `widget.id` — never fold position in, or React remounts map widgets
 * mid-drag (see DashboardWidgetsGrid.reorder.test.tsx).
 *
 * Layout is `packCells`' segments rather than CSS grid rows: each card is
 * only as tall as its content, and a run of half-width cells deals into two
 * tightly-stacked columns so short cards don't leave voids beside tall
 * neighbours. Below `TWO_COLUMN_QUERY` everything is one column — the segment
 * wrappers flatten away (`display: contents`) and each item's `order` restores
 * the flat arrangement order.
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

  // grabbedId arms draggable on one grid item; dragIndex/overIndex track the
  // HTML5 drag in flight (widget indices).
  const [grabbedId, setGrabbedId] = useState<string | null>(null);
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [overIndex, setOverIndex] = useState<number | null>(null);

  const widgets = useMemo(
    () => [...dashboard.widgets].sort((a, b) => a.position - b.position),
    [dashboard.widgets]
  );
  const areaAoi = dashboard.aois[0];

  const endDrag = () => {
    setGrabbedId(null);
    setDragIndex(null);
    setOverIndex(null);
  };

  const isDropTarget = (index: number) => {
    const dragged = dragIndex !== null ? widgets[dragIndex] : undefined;
    const target = widgets[index];
    return !!dragged && !!target && dragged.id !== target.id;
  };

  const dropOn = (targetIndex: number) => {
    if (dragIndex !== null && isDropTarget(targetIndex)) {
      const { patches } = computeReorder(widgets, dragIndex, targetIndex);
      if (patches.length > 0) reorderWidgets.mutate(patches);
    }
    endDrag();
  };

  // Half-width runs deal into two packed columns; sizes and order both come
  // from persisted widget state, so the packing is stable across loads.
  const segments = useMemo(
    () => packCells(widgets, (widget) => topLevelSize(widget) === "double"),
    [widgets]
  );

  const renderWidget = (widget: DashboardWidget, i: number) => {
    const size = topLevelSize(widget);
    const body =
      widget.widget_type === "insight" ? null : standaloneBody(widget);
    const title =
      body?.map?.title ??
      (typeof widget.config.title === "string" ? widget.config.title : "");
    return (
      <Box
        key={widget.id}
        // One column flattens the column wrappers, so the flat arrangement
        // order is restored per item; in two columns, DOM order rules each
        // column. Cards clip internally rather than force the page wider than
        // the container near the two-column threshold.
        minW={0}
        css={{ order: i, [TWO_COLUMN_QUERY]: { order: 0 } }}
        draggable={isOwner && grabbedId === widget.id}
        onDragStart={(e) => {
          // Required for Firefox to initiate drag-and-drop.
          e.dataTransfer.setData("text/plain", widget.id);
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
        {widget.widget_type === "insight" ? (
          <DashboardInsightModule
            widget={widget}
            areaAoi={areaAoi}
            isOwner={isOwner}
            onArmDrag={() => setGrabbedId(widget.id)}
            onDisarmDrag={() => setGrabbedId(null)}
            onUpdateConfig={(config) =>
              updateWidget.mutate({ widgetId: widget.id, patch: { config } })
            }
            onRemove={() => deleteWidget.mutate(widget.id)}
          />
        ) : widget.widget_type === "text" ? (
          <DashboardTextWidgetCard
            text={body?.text ?? null}
            placeholder={body?.placeholder ?? null}
            isOwner={isOwner}
            isDouble={size === "double"}
            onArmDrag={() => setGrabbedId(widget.id)}
            onDisarmDrag={() => setGrabbedId(null)}
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
            card={null}
            map={body?.map}
            aoi={areaAoi}
            viewportBbox={
              body?.map ? mapWidgetViewportBbox(widget.config) : null
            }
            placeholder={body?.placeholder ?? null}
            chartCount={0}
            isOwner={isOwner}
            isDouble={size === "double"}
            onArmDrag={() => setGrabbedId(widget.id)}
            onDisarmDrag={() => setGrabbedId(null)}
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
            onRename={
              body?.placeholder
                ? undefined
                : (name) =>
                    updateWidget.mutate({
                      widgetId: widget.id,
                      patch: { config: withWidgetTitle(widget.config, name) },
                    })
            }
            onRemove={() => deleteWidget.mutate(widget.id)}
          />
        )}
      </Box>
    );
  };

  return (
    <Box css={{ containerType: "inline-size", containerName: "widgets-grid" }}>
      <Flex direction="column" gap={4} align="stretch">
        {segments.map((segment) =>
          segment.kind === "full" ? (
            renderWidget(segment.cell.item, segment.cell.index)
          ) : (
            <Flex
              key={`columns-${segment.left[0]?.item.id ?? "empty"}`}
              gap={4}
              align="flex-start"
              display="contents"
              css={{ [TWO_COLUMN_QUERY]: { display: "flex" } }}
            >
              {[segment.left, segment.right].map((column, side) => (
                <Flex
                  key={side === 0 ? "left" : "right"}
                  direction="column"
                  gap={4}
                  flex="1"
                  minW={0}
                  display="contents"
                  css={{ [TWO_COLUMN_QUERY]: { display: "flex" } }}
                >
                  {column.map((packed) =>
                    renderWidget(packed.item, packed.index)
                  )}
                </Flex>
              ))}
            </Flex>
          )
        )}
      </Flex>
    </Box>
  );
}

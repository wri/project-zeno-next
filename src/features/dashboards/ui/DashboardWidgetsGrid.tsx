"use client";

import { useMemo, useState } from "react";
import { Grid, GridItem } from "@chakra-ui/react";

import useAuthStore from "@/app/store/authStore";
import type { Dashboard } from "../api/schemas";
import { computeReorder, widgetSize, withSize } from "../lib/widgets";
import {
  useDeleteWidget,
  useReorderWidgets,
  useUpdateWidget,
} from "./dashboardQueries";
import DashboardWidgetCard from "./DashboardWidgetCard";

/**
 * The dashboard's widget grid. Reordering is native HTML5 drag-and-drop,
 * armed only while the card's drag handle is pressed (so text selection and
 * chart interactions inside the card keep working); the drop target gets the
 * design's dashed outline. Position and column span persist via the widget
 * PATCH endpoint (optimistically, in dashboardQueries).
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
  // HTML5 drag in flight.
  const [grabbedId, setGrabbedId] = useState<string | null>(null);
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [overIndex, setOverIndex] = useState<number | null>(null);

  const widgets = useMemo(
    () => [...dashboard.widgets].sort((a, b) => a.position - b.position),
    [dashboard.widgets]
  );

  const endDrag = () => {
    setGrabbedId(null);
    setDragIndex(null);
    setOverIndex(null);
  };

  const dropOn = (targetIndex: number) => {
    if (dragIndex !== null && dragIndex !== targetIndex) {
      const { patches } = computeReorder(widgets, dragIndex, targetIndex);
      if (patches.length > 0) reorderWidgets.mutate(patches);
    }
    endDrag();
  };

  return (
    <Grid templateColumns={{ base: "1fr", lg: "repeat(2, 1fr)" }} gap={4}>
      {widgets.map((widget, i) => (
        <GridItem
          key={widget.id}
          colSpan={{
            base: 1,
            lg: widgetSize(widget.config) === "double" ? 2 : 1,
          }}
          draggable={isOwner && grabbedId === widget.id}
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
            overIndex === i && dragIndex !== null && dragIndex !== i
              ? "2px dashed"
              : undefined
          }
          outlineColor="primary.solid"
          borderRadius="sm"
        >
          <DashboardWidgetCard
            widget={widget}
            isOwner={isOwner}
            onArmDrag={() => setGrabbedId(widget.id)}
            onDisarmDrag={() => setGrabbedId(null)}
            onToggleSize={() =>
              updateWidget.mutate({
                widgetId: widget.id,
                patch: {
                  config: withSize(
                    widget.config,
                    widgetSize(widget.config) === "double" ? "single" : "double"
                  ),
                },
              })
            }
            onRemove={() => deleteWidget.mutate(widget.id)}
          />
        </GridItem>
      ))}
    </Grid>
  );
}

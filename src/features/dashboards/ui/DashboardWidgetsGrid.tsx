"use client";

import { Fragment, useEffect, useMemo, useRef } from "react";
import { Box, type BoxProps, Flex, Text } from "@chakra-ui/react";

import useAuthStore from "@/app/store/authStore";
import type { Dashboard, DashboardWidget } from "../api/schemas";
import {
  computeSectionMove,
  widgetContainers,
  type WidgetContainer,
} from "../model/dashboard-sections";
import { computeWidgetMove } from "../model/widget-move";
import {
  insightWidgetSize,
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
  useMoveSections,
  useMoveWidgets,
  useUpdateWidget,
} from "./dashboardQueries";
import { TWO_COLUMN_QUERY } from "./gridLayout";
import DashboardInsightModule from "./DashboardInsightModule";
import DashboardSection from "./DashboardSection";
import DashboardWidgetCard from "./DashboardWidgetCard";
import DashboardTextWidgetCard from "./DashboardTextWidgetCard";
import DashboardWidgetBoundary from "./DashboardWidgetBoundary";
import {
  DRAG_ITEM_ATTR,
  SECTION_ITEM_ATTR,
  SECTION_ZONE_ATTR,
  useDrag,
  type DragState,
} from "./useDrag";

/**
 * The body of a standalone (non-insight) grid item: the map layer for map
 * widgets, the markdown text for notes, or placeholder copy when the config
 * can't be rendered.
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

/** The persisted column span for a top-level item. */
function topLevelSize(widget: DashboardWidget): WidgetSize {
  if (widget.widget_type === "insight") return insightWidgetSize(widget.config);
  if (widget.widget_type === "map") return mapWidgetSize(widget.config);
  return widgetSize(widget.config);
}

/**
 * Where an item is lifted from: its box relative to `within` — the grid,
 * whose container query makes it the containing block a lifted item is
 * positioned in — and the pointer's offset inside it.
 */
function liftFrom(
  event: React.PointerEvent,
  item: Element | null,
  within: Element | null
): Pick<DragState, "rect" | "grab"> {
  const box = item?.getBoundingClientRect();
  const bounds = within?.getBoundingClientRect();
  return {
    rect: {
      left: (box?.left ?? 0) - (bounds?.left ?? 0),
      top: (box?.top ?? 0) - (bounds?.top ?? 0),
      width: box?.width ?? 0,
      height: box?.height ?? 0,
    },
    grab: {
      x: event.clientX - (box?.left ?? 0),
      y: event.clientY - (box?.top ?? 0),
    },
  };
}

/**
 * The item in flight leaves the layout (its slot is the placeholder) and
 * keeps its measured box, so a map inside never resizes. `useDrag` moves and
 * shrinks it with a `transform`, around the grab point.
 */
function liftedProps({ rect, grab, dropped }: DragState): BoxProps {
  return {
    position: "absolute",
    // Dropped: the slot marks the landing spot until the data catches up.
    visibility: dropped ? "hidden" : undefined,
    left: `${rect.left}px`,
    top: `${rect.top}px`,
    w: `${rect.width}px`,
    transformOrigin: `${grab.x}px ${grab.y}px`,
    opacity: 0.98,
    zIndex: 2000,
    pointerEvents: "none",
    boxShadow: "0 16px 32px rgba(19,22,25,0.22), 0 3px 8px rgba(19,22,25,0.14)",
  };
}

/** The dashed slot a lifted item would drop into. */
function DropSlot({ height, ...props }: { height: number } & BoxProps) {
  return (
    <Box
      minW={0}
      h={`${Math.max(height, 80)}px`}
      bg="#F0F4FF"
      border="2px dashed"
      borderColor="primary.solid"
      borderRadius="sm"
      aria-hidden
      {...props}
    />
  );
}

/** A grid item's flex basis: half a row for a single card, the whole row
    for a double one; one column below `TWO_COLUMN_QUERY`. */
function cellCss(double: boolean) {
  return {
    flex: "1 1 100%",
    [TWO_COLUMN_QUERY]: { flex: `1 1 ${double ? "100%" : "calc(50% - 8px)"}` },
  };
}

/**
 * One container's grid — the ungrouped top level, or one section's widgets.
 *
 * Cards flow in arrangement order into rows of at most two, per the design:
 * a wrapping flex list where every card is a sibling. That is what makes the
 * drop slot an exact preview — it takes a cell and every later card shifts
 * along — and a lone card on the last row stretches to the full width.
 *
 * Items are keyed on `widget.id` — never fold position in, or React remounts
 * map widgets mid-drag (see DashboardWidgetsGrid.reorder.test.tsx).
 */
function ContainerGrid({
  dashboard,
  container,
  isOwner,
  drag,
  liftedRef,
  onDragStart,
}: {
  dashboard: Dashboard;
  container: WidgetContainer;
  isOwner: boolean;
  drag: DragState | null;
  /** Attached to the card in flight, which the drag moves via `transform`. */
  liftedRef: React.Ref<HTMLDivElement>;
  onDragStart: (event: React.PointerEvent, widget: DashboardWidget) => void;
}) {
  const updateWidget = useUpdateWidget(dashboard.id);
  const deleteWidget = useDeleteWidget(dashboard.id);

  const areaAoi = dashboard.aois[0];

  const isDropTarget = !!drag && drag.key === container.key;
  const slotBeforeId = isDropTarget ? drag.beforeId : null;
  // The slot takes the cell the card in flight would: its own span.
  const dragged = drag && dashboard.widgets.find((w) => w.id === drag.id);

  const toggleSize = (widget: DashboardWidget) =>
    updateWidget.mutate({
      widgetId: widget.id,
      patch: {
        config: withSize(
          widget.config,
          topLevelSize(widget) === "double" ? "single" : "double"
        ),
      },
    });

  const placeholder = (
    <DropSlot
      data-testid="widget-drop-slot"
      height={drag?.rect.height ?? 0}
      css={cellCss(!!dragged && topLevelSize(dragged) === "double")}
    />
  );

  const renderWidget = (widget: DashboardWidget) => {
    const size = topLevelSize(widget);
    const body =
      widget.widget_type === "insight" ? null : standaloneBody(widget);
    const title =
      body?.map?.title ??
      (typeof widget.config.title === "string" ? widget.config.title : "");
    const lifted = drag?.id === widget.id ? drag : null;
    const armDrag = (event: React.PointerEvent) => onDragStart(event, widget);

    return (
      <Box
        key={widget.id}
        ref={lifted ? liftedRef : undefined}
        // The drop hit-test resolves its target from the DOM, so each item
        // names the widget it carries — except the one in flight, which can't
        // be a slot for itself.
        data-widget-id={widget.id}
        {...(lifted ? {} : { [DRAG_ITEM_ATTR]: widget.id })}
        minW={0}
        css={cellCss(size === "double")}
        borderRadius="sm"
        {...(lifted && liftedProps(lifted))}
      >
        <DashboardWidgetBoundary resetKey={JSON.stringify(widget.config)}>
          {widget.widget_type === "insight" ? (
            <DashboardInsightModule
              widget={widget}
              areaAoi={areaAoi}
              isOwner={isOwner}
              isDouble={size === "double"}
              onArmDrag={armDrag}
              onToggleSize={() => toggleSize(widget)}
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
              onArmDrag={armDrag}
              onToggleSize={() => toggleSize(widget)}
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
              removeMode="widget"
              isOwner={isOwner}
              isDouble={size === "double"}
              onArmDrag={armDrag}
              onToggleSize={() => toggleSize(widget)}
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
        </DashboardWidgetBoundary>
      </Box>
    );
  };

  if (container.widgets.length === 0) {
    if (isDropTarget) return placeholder;
    // An empty top level is only on screen mid-drag, as the panel the dragged
    // widget can be put back into — it just holds the space.
    return container.section ? (
      <Text fontSize="14px" color="fg.muted">
        Nothing in this section yet.
      </Text>
    ) : (
      <Box minH="48px" />
    );
  }

  return (
    <Flex wrap="wrap" gap={4} align="flex-start">
      {container.widgets.map((widget) => (
        <Fragment key={widget.id}>
          {slotBeforeId === widget.id && placeholder}
          {renderWidget(widget)}
        </Fragment>
      ))}
      {/* "After everything" — the one slot that follows no card. */}
      {isDropTarget && slotBeforeId === null && placeholder}
    </Flex>
  );
}

/**
 * The dashboard's widgets, grouped into their containers: the ungrouped
 * top-level list first, then one panel per section (`widgetContainers` does
 * the grouping — the API's flat `widgets` is never a render order on its own).
 *
 * Two drags live here. A widget drag can cross containers: a widget dropped
 * in a section is a `section_id` PATCH alongside the renumbering of both
 * containers (`computeWidgetMove`). A section drag reorders the panels
 * themselves (`computeSectionMove`); the top-level panel always stays first.
 */
export default function DashboardWidgetsGrid({
  dashboard,
}: {
  dashboard: Dashboard;
}) {
  const userId = useAuthStore((s) => s.userId);
  const isOwner = !!userId && userId === dashboard.user_id;
  const moveWidgets = useMoveWidgets(dashboard.id);
  const moveSections = useMoveSections(dashboard.id);

  // Read by the drop callbacks, which outlive the render that created them.
  const containersRef = useRef<WidgetContainer[]>([]);
  // Lifted items are positioned inside this box.
  const gridRef = useRef<HTMLDivElement>(null);

  const drag = useDrag({
    onDrop: (widgetId, slot) => {
      const containers = containersRef.current;
      const target = containers.find((c) => c.key === slot.key);
      if (!target) return false;
      // The slot's index counts the container without the dragged widget,
      // which is what `computeWidgetMove` expects.
      const ids = target.widgets
        .map((widget) => widget.id)
        .filter((id) => id !== widgetId);
      const at = slot.beforeId ? ids.indexOf(slot.beforeId) : -1;
      const patches = computeWidgetMove(
        containers,
        widgetId,
        slot.key,
        at === -1 ? ids.length : at
      );
      if (patches.length > 0) moveWidgets.mutate(patches);
      return patches.length > 0;
    },
  });

  const sectionDrag = useDrag({
    attrs: { zone: SECTION_ZONE_ATTR, item: SECTION_ITEM_ATTR },
    tilt: 1,
    onDrop: (sectionId, slot) => {
      const ids = containersRef.current.flatMap((c) =>
        c.section && c.section.id !== sectionId ? [c.section.id] : []
      );
      const at = slot.beforeId ? ids.indexOf(slot.beforeId) : -1;
      const patches = computeSectionMove(
        dashboard.sections,
        sectionId,
        at === -1 ? ids.length : at
      );
      if (patches.length > 0) moveSections.mutate(patches);
      return patches.length > 0;
    },
  });

  const dragState = drag.state;
  const sectionState = sectionDrag.state;

  // A dropped drag ends once the dashboard reflects the move (the optimistic
  // update, or its rollback), so the item lands straight in its new slot.
  const { finish: finishDrag } = drag;
  const { finish: finishSectionDrag } = sectionDrag;
  useEffect(() => {
    finishDrag();
    finishSectionDrag();
  }, [dashboard, finishDrag, finishSectionDrag]);

  // A drag keeps every container on screen, the empty ones included: the panel
  // a widget was lifted out of has to stay somewhere it can go back to.
  const containers = useMemo(
    () =>
      widgetContainers(dashboard, {
        keepEmptySections: isOwner,
        keepEmptyTopLevel: !!dragState,
      }),
    [dashboard, isOwner, dragState]
  );
  useEffect(() => {
    containersRef.current = containers;
  });
  const sections = containers.flatMap((c) => (c.section ? [c.section] : []));

  return (
    <Box
      ref={gridRef}
      css={{ containerType: "inline-size", containerName: "widgets-grid" }}
    >
      {/* Panels read as bands of the page: the grey gutter between them is the
          only grey a widget ever sits next to. */}
      <Flex
        direction="column"
        gap="12px"
        align="stretch"
        {...{ [SECTION_ZONE_ATTR]: "sections" }}
      >
        {containers.map((container) => {
          const section = container.section;
          const lifted =
            section && sectionState?.id === section.id ? sectionState : null;
          return (
            <Fragment key={container.key}>
              {section && sectionState?.beforeId === section.id && (
                <DropSlot
                  data-testid="section-drop-slot"
                  height={sectionState.rect.height}
                  borderRadius="8px"
                />
              )}
              <Box
                ref={lifted ? sectionDrag.liftedRef : undefined}
                data-section-id={section?.id}
                {...(section && !lifted
                  ? { [SECTION_ITEM_ATTR]: section.id }
                  : {})}
                {...(lifted && liftedProps(lifted))}
              >
                <DashboardSection
                  section={section}
                  isOwner={isOwner}
                  isDropTarget={!!dragState && dragState.key === container.key}
                  dropZoneKey={container.key}
                  onArmDrag={
                    section
                      ? (event) => {
                          const next = sections[sections.indexOf(section) + 1];
                          sectionDrag.start(event, {
                            id: section.id,
                            key: "sections",
                            // The slot opens where the section was.
                            beforeId: next?.id ?? null,
                            ...liftFrom(
                              event,
                              (event.currentTarget as HTMLElement).closest(
                                "[data-section-id]"
                              ),
                              gridRef.current
                            ),
                          });
                        }
                      : undefined
                  }
                >
                  <ContainerGrid
                    dashboard={dashboard}
                    container={container}
                    isOwner={isOwner}
                    drag={dragState}
                    liftedRef={drag.liftedRef}
                    onDragStart={(event, widget) => {
                      const next =
                        container.widgets[
                          container.widgets.indexOf(widget) + 1
                        ];
                      drag.start(event, {
                        id: widget.id,
                        key: container.key,
                        // The slot opens where the card was.
                        beforeId: next?.id ?? null,
                        ...liftFrom(
                          event,
                          (event.currentTarget as HTMLElement).closest(
                            "[data-widget-id]"
                          ),
                          gridRef.current
                        ),
                      });
                    }}
                  />
                </DashboardSection>
              </Box>
            </Fragment>
          );
        })}
        {/* "After everything" — the slot below the last section. */}
        {sectionState && sectionState.beforeId === null && (
          <DropSlot
            data-testid="section-drop-slot"
            height={sectionState.rect.height}
            borderRadius="8px"
          />
        )}
      </Flex>
    </Box>
  );
}

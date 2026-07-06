"use client";

import { useState } from "react";
import { Box, Flex, Heading, IconButton, Text } from "@chakra-ui/react";
import { MapTrifoldIcon, XIcon } from "@phosphor-icons/react";
import WidgetMessage from "@/app/components/WidgetMessage";
import { Tooltip } from "@/app/components/ui/tooltip";
import ConfirmDialog from "./ConfirmDialog";
import DashboardMapWidget from "./DashboardMapWidget";
import TextWidgetCard from "./TextWidgetCard";
import {
  dashboardWidgetToInsightWidgets,
  dashboardWidgetToMapSpec,
} from "@/app/lib/dashboard-widgets";
import type {
  DashboardAoi,
  DashboardWidget,
} from "@/app/schemas/api/dashboards/get";

function PlaceholderCard({
  title,
  message,
  icon,
}: {
  title: string;
  message: string;
  icon?: React.ReactNode;
}) {
  return (
    <Box
      rounded="md"
      border="1px solid"
      borderColor="border.emphasized"
      overflow="hidden"
      bg="neutral.100"
    >
      <Flex px={4} py={3} gap={2} align="center">
        {icon}
        <Heading size="xs" fontWeight="medium" m={0}>
          {title}
        </Heading>
      </Flex>
      <Text px={4} pb={4} fontSize="sm" color="fg.muted">
        {message}
      </Text>
    </Box>
  );
}

interface DashboardWidgetCardProps {
  widget: DashboardWidget;
  /** The dashboard's area — map widgets fit their viewport to it. */
  aois?: DashboardAoi[] | null;
  onRemove: () => void;
  /** Persists a text widget's markdown (required to edit text widgets). */
  onUpdateText?: (text: string) => void;
}

export default function DashboardWidgetCard({
  widget,
  aois,
  onRemove,
  onUpdateText,
}: DashboardWidgetCardProps) {
  const [confirmOpen, setConfirmOpen] = useState(false);
  const insightWidgets = dashboardWidgetToInsightWidgets(widget);
  const mapSpec =
    widget.widget_type === "map" ? dashboardWidgetToMapSpec(widget) : null;
  // Text widgets carry their own toolbar (edit/save/remove) — no overlay X.
  const isText = widget.widget_type === "text";

  return (
    <Box position="relative">
      {isText ? (
        <TextWidgetCard
          text={widget.config?.text ?? ""}
          startEditing={!widget.config?.text}
          onChange={(text) => onUpdateText?.(text)}
          onDelete={() => setConfirmOpen(true)}
        />
      ) : widget.widget_type === "map" ? (
        mapSpec ? (
          <DashboardMapWidget spec={mapSpec} aoi={aois?.[0]} />
        ) : (
          <PlaceholderCard
            title={widget.config?.title ?? "Map"}
            message="This map widget has no renderable layer."
            icon={<MapTrifoldIcon size={16} />}
          />
        )
      ) : widget.widget_type === "insight" ? (
        insightWidgets.length ? (
          // An insight can hold several charts — stack one card per chart
          // inside the widget's grid cell (reordering stays per-widget).
          <Flex direction="column" gap={3}>
            {insightWidgets.map((insightWidget) => (
              <WidgetMessage key={insightWidget.id} widget={insightWidget} />
            ))}
          </Flex>
        ) : (
          // Per the API contract, a null insight means it isn't visible to
          // this viewer (e.g. made private again) — a placeholder, not an
          // error.
          <PlaceholderCard
            title="Insight not available"
            message="This insight is not available anymore."
          />
        )
      ) : (
        // A widget kind this build doesn't know (newer backend) — keep the
        // dashboard rendering and mark just this cell.
        <PlaceholderCard
          title={widget.config?.title ?? "Unsupported widget"}
          message="This widget type isn't supported in this version."
        />
      )}
      {!isText && (
        <Tooltip content="Remove from dashboard" showArrow>
          <IconButton
            size="xs"
            variant="ghost"
            position="absolute"
            top={1.5}
            right={1.5}
            onClick={() => setConfirmOpen(true)}
            aria-label="Remove widget from dashboard"
          >
            <XIcon size={14} />
          </IconButton>
        </Tooltip>
      )}
      <ConfirmDialog
        title="Remove widget?"
        body={
          isText
            ? "The note will be removed from this dashboard."
            : "The widget will be removed from this dashboard. The underlying insight is not deleted."
        }
        confirmLabel="Remove"
        onConfirm={onRemove}
        isOpen={confirmOpen}
        onOpenChange={setConfirmOpen}
      />
    </Box>
  );
}

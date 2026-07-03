"use client";

import { useState } from "react";
import { Box, Flex, Heading, IconButton, Text } from "@chakra-ui/react";
import { MapTrifoldIcon, XIcon } from "@phosphor-icons/react";
import WidgetMessage from "@/app/components/WidgetMessage";
import { Tooltip } from "@/app/components/ui/tooltip";
import ConfirmDialog from "./ConfirmDialog";
import { dashboardWidgetToInsightWidget } from "@/app/lib/dashboard-widgets";
import type { DashboardWidget } from "@/app/schemas/api/dashboards/get";

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
  onRemove: () => void;
}

export default function DashboardWidgetCard({
  widget,
  onRemove,
}: DashboardWidgetCardProps) {
  const [confirmOpen, setConfirmOpen] = useState(false);
  const insightWidget = dashboardWidgetToInsightWidget(widget);

  return (
    <Box position="relative">
      {widget.widget_type === "map" ? (
        <PlaceholderCard
          title={widget.config?.title ?? "Map"}
          message="Map widgets are coming soon."
          icon={<MapTrifoldIcon size={16} />}
        />
      ) : insightWidget ? (
        <WidgetMessage widget={insightWidget} />
      ) : (
        // Per the API contract, a null insight means it isn't visible to this
        // viewer (e.g. made private again) — a placeholder, not an error.
        <PlaceholderCard
          title="Insight not available"
          message="This insight is not available anymore."
        />
      )}
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
      <ConfirmDialog
        title="Remove widget?"
        body="The widget will be removed from this dashboard. The underlying insight is not deleted."
        confirmLabel="Remove"
        onConfirm={onRemove}
        isOpen={confirmOpen}
        onOpenChange={setConfirmOpen}
      />
    </Box>
  );
}

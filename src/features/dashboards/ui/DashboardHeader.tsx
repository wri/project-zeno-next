"use client";

import { useState } from "react";
import { Box, Button, Flex, IconButton, Input } from "@chakra-ui/react";
import {
  FilePdfIcon,
  FileTextIcon,
  PencilSimpleIcon,
  ShareIcon,
} from "@phosphor-icons/react";

import { toaster } from "@/app/components/ui/toaster";
import type { Dashboard } from "../api/schemas";
import { searchWithMode, type DashboardMode } from "../hooks/useDashboardMode";
import { useRenameDashboard } from "./dashboardQueries";
import { DashboardTitleHeading, DashboardUpdatedLabel } from "./DashboardTitle";

/**
 * The header's 24px outline action-button style — shared with the report
 * page's action bar so the dashboard action buttons match everywhere.
 */
export const dashboardActionStyle = {
  h: "24px",
  px: "8px",
  gap: "4px",
  borderColor: "rgba(19,22,25,0.2)",
  rounded: "sm",
  fontSize: "12px",
  fontWeight: "medium",
  color: "rgba(19,22,25,0.7)",
} as const;

/**
 * Dashboard page header per the Figma "Dashboard default" frame: editable
 * 30px title with a pencil affordance (owner only, edit mode only), the mono
 * "Updated…" label, and actions top-right — an Edit/Report mode toggle
 * (owners only; everyone else is already in report mode) ahead of Export /
 * Share. Export opens the print/export surface at /dashboards/[id]/report;
 * Share remains a false door — measure interest before building the flow.
 */
export default function DashboardHeader({
  dashboard,
  isOwner,
  mode,
  onModeChange,
  condensed = false,
}: {
  dashboard: Dashboard;
  isOwner: boolean;
  mode: DashboardMode;
  onModeChange: (mode: DashboardMode) => void;
  /** Pinned-bar variant: the title truncates with an ellipsis instead of wrapping. */
  condensed?: boolean;
}) {
  const [draft, setDraft] = useState<string | null>(null);
  const renameDashboard = useRenameDashboard(dashboard.id);
  const editing = draft !== null;

  const commit = () => {
    const name = draft?.trim();
    setDraft(null);
    if (!name || name === dashboard.name) return;
    renameDashboard.mutate(name, {
      onError: () =>
        toaster.create({
          title: "Rename failed",
          description:
            "The dashboard name couldn't be saved. Please try again.",
          type: "error",
          duration: 4000,
        }),
    });
  };

  const falseDoor = (description: string) => () =>
    toaster.create({
      title: "Coming soon",
      description,
      type: "info",
      duration: 3000,
    });

  const openReport = () => {
    // New tab so the interactive dashboard stays put. Drop ?mode= — the
    // report route is always the report, regardless of the detail page's
    // current mode.
    const search = searchWithMode(window.location.search, null);
    window.open(
      `/dashboards/${dashboard.id}/report${search}`,
      "_blank",
      "noopener"
    );
  };

  return (
    <Flex justify="space-between" align="flex-start" gap={6}>
      <Box minW={0} flex="1">
        <Flex align="center" gap="12px" minW={0}>
          {editing ? (
            <Input
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onBlur={commit}
              onKeyDown={(e) => {
                if (e.key === "Enter") commit();
                if (e.key === "Escape") setDraft(null);
              }}
              autoFocus
              aria-label="Dashboard name"
              variant="flushed"
              fontSize="30px"
              lineHeight="36px"
              h="40px"
              maxW="2xl"
            />
          ) : (
            <DashboardTitleHeading
              name={dashboard.name}
              condensed={condensed}
            />
          )}
          {isOwner && mode === "edit" && !editing && (
            <IconButton
              aria-label="Rename dashboard"
              title="Rename dashboard"
              size="xs"
              variant="ghost"
              color="fg.muted"
              onClick={() => setDraft(dashboard.name)}
            >
              <PencilSimpleIcon size={20} />
            </IconButton>
          )}
        </Flex>
        <DashboardUpdatedLabel
          updatedAt={dashboard.updated_at}
          createdAt={dashboard.created_at}
        />
      </Box>

      <Flex gap="12px" align="center" flexShrink={0}>
        {/* Edit/Report — the same segmented control as the chart card's
            Chart/Table toggle. Report strips the editing chrome for a clean,
            document-like read; the toggle stays visible so editing is always
            one click away. */}
        {isOwner && (
          <Flex
            gap={0}
            border="1px solid"
            borderColor="rgba(19,22,25,0.2)"
            rounded="sm"
            overflow="hidden"
            role="group"
            aria-label="Dashboard mode"
          >
            {(
              [
                { value: "edit", Icon: PencilSimpleIcon, label: "Edit" },
                { value: "report", Icon: FileTextIcon, label: "Report" },
              ] as const
            ).map(({ value, Icon, label }) => (
              <Button
                key={value}
                size="xs"
                variant={mode === value ? "solid" : "ghost"}
                colorPalette={mode === value ? "primary" : undefined}
                color={mode === value ? undefined : "rgba(19,22,25,0.7)"}
                onClick={() => onModeChange(value)}
                h="24px"
                px="8px"
                gap="4px"
                rounded="none"
                fontSize="12px"
                fontWeight="medium"
                aria-pressed={mode === value}
              >
                <Icon size={14} />
                {label}
              </Button>
            ))}
          </Flex>
        )}
        <Button
          variant="outline"
          {...dashboardActionStyle}
          onClick={openReport}
        >
          <FilePdfIcon size={16} />
          Export
        </Button>
        <Button
          variant="outline"
          {...dashboardActionStyle}
          onClick={falseDoor("Sharing dashboards isn't available yet.")}
        >
          <ShareIcon size={16} />
          Share
        </Button>
      </Flex>
    </Flex>
  );
}

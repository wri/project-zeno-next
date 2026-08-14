"use client";

import { useState } from "react";
import {
  Box,
  Button,
  Flex,
  Heading,
  IconButton,
  Input,
  Text,
} from "@chakra-ui/react";
import {
  FilePdfIcon,
  FileTextIcon,
  PencilSimpleIcon,
  ShareIcon,
} from "@phosphor-icons/react";

import { toaster } from "@/app/components/ui/toaster";
import type { Dashboard } from "../api/schemas";
import type { DashboardMode } from "../hooks/useDashboardMode";
import { updatedLabel, wasJustCreated } from "../lib/dates";
import { useRenameDashboard } from "./dashboardQueries";

/**
 * Dashboard page header per the Figma "Dashboard default" frame: editable
 * 30px title with a pencil affordance (owner only, edit mode only), the mono
 * "Updated…" label, and actions top-right — an Edit/Report mode toggle
 * (owners only; everyone else is already in report mode) ahead of Export /
 * Share. Export and Share are false doors — measure interest before building
 * the real flows.
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

  const actionStyle = {
    h: "24px",
    px: "8px",
    gap: "4px",
    borderColor: "rgba(19,22,25,0.2)",
    rounded: "sm",
    fontSize: "12px",
    fontWeight: "medium",
    color: "rgba(19,22,25,0.7)",
  } as const;

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
            <Heading
              // The pinned bar duplicates the page title — keep one h1 per page.
              as={condensed ? "h2" : "h1"}
              fontSize="30px"
              lineHeight="36px"
              fontWeight="normal"
              color="#131619"
              // The theme's globalCss gives every h2 a 16px margin-bottom,
              // which would stretch the title row in the condensed variant.
              mb="0"
              {...(condensed
                ? { truncate: true, minW: 0 }
                : { wordBreak: "break-word" as const })}
            >
              {dashboard.name}
            </Heading>
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
        {wasJustCreated(dashboard.created_at) ? (
          <Box
            mt="8px"
            display="inline-flex"
            bg="#F0F4B4"
            px="4px"
            rounded="sm"
          >
            <Text
              fontFamily="mono"
              fontSize="10px"
              lineHeight="16px"
              color="#5B5F3A"
            >
              Created just now
            </Text>
          </Box>
        ) : (
          <Text
            // 8px title-to-timestamp gap per the Figma header frames.
            mt="8px"
            fontFamily="mono"
            fontSize="10px"
            lineHeight="16px"
            color="rgba(19,22,25,0.7)"
          >
            {updatedLabel(dashboard.updated_at)}
          </Text>
        )}
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
          {...actionStyle}
          onClick={falseDoor(
            "Exporting dashboards to PDF isn't available yet."
          )}
        >
          <FilePdfIcon size={16} />
          Export
        </Button>
        <Button
          variant="outline"
          {...actionStyle}
          onClick={falseDoor("Sharing dashboards isn't available yet.")}
        >
          <ShareIcon size={16} />
          Share
        </Button>
      </Flex>
    </Flex>
  );
}

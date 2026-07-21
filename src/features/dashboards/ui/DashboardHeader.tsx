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
  PencilSimpleIcon,
  ShareIcon,
} from "@phosphor-icons/react";

import { toaster } from "@/app/components/ui/toaster";
import type { Dashboard } from "../api/schemas";
import { updatedLabel } from "../lib/dates";
import { useRenameDashboard } from "./dashboardQueries";

/**
 * Dashboard page header per the Figma "Dashboard default" frame: editable
 * 30px title with a pencil affordance (owner only), the mono "Updated…"
 * label, and Export / Share actions top-right. Export and Share are false
 * doors — measure interest before building the real flows.
 */
export default function DashboardHeader({
  dashboard,
  isOwner,
  condensed = false,
}: {
  dashboard: Dashboard;
  isOwner: boolean;
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
              {...(condensed
                ? { truncate: true, minW: 0 }
                : { wordBreak: "break-word" as const })}
            >
              {dashboard.name}
            </Heading>
          )}
          {isOwner && !editing && (
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
        <Text
          mt="7px"
          fontFamily="mono"
          fontSize="10px"
          lineHeight="16px"
          color="rgba(19,22,25,0.7)"
        >
          {updatedLabel(dashboard.updated_at)}
        </Text>
      </Box>

      <Flex gap="12px" align="center" flexShrink={0}>
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

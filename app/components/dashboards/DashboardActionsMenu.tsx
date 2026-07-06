"use client";

import { useState } from "react";
import { IconButton, Menu, Portal } from "@chakra-ui/react";
import {
  DotsThreeVerticalIcon,
  PencilSimpleIcon,
  ShareIcon,
  TrashIcon,
} from "@phosphor-icons/react";

import ConfirmDialog from "@/app/components/dashboards/ConfirmDialog";
import DashboardShareDialog from "@/app/components/dashboards/DashboardShareDialog";
import { useDeleteDashboard } from "@/app/hooks/useDashboards";
import type { Dashboard } from "@/app/schemas/api/dashboards/get";

/** "…" actions menu on a gallery card. Rename is delegated to the caller
 *  (inline edit lives in the card); share + delete are handled here. */
export default function DashboardActionsMenu({
  dashboard,
  onRename,
  onDeleted,
  size = "xs",
}: {
  dashboard: Dashboard;
  onRename: () => void;
  onDeleted?: () => void;
  size?: "2xs" | "xs" | "sm";
}) {
  const deleteDashboard = useDeleteDashboard();
  const [shareOpen, setShareOpen] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);

  return (
    <>
      <Menu.Root positioning={{ placement: "bottom-end" }}>
        <Menu.Trigger asChild>
          <IconButton
            aria-label={`Actions for ${dashboard.name}`}
            size={size}
            variant="ghost"
            color="fg.muted"
          >
            <DotsThreeVerticalIcon size={16} />
          </IconButton>
        </Menu.Trigger>
        <Portal>
          <Menu.Positioner>
            <Menu.Content minW="160px">
              <Menu.Item value="rename" onClick={onRename}>
                <PencilSimpleIcon size={14} />
                Rename
              </Menu.Item>
              <Menu.Item value="share" onClick={() => setShareOpen(true)}>
                <ShareIcon size={14} />
                Share
              </Menu.Item>
              <Menu.Separator />
              <Menu.Item
                value="delete"
                color="fg.error"
                _hover={{ bg: "bg.error", color: "fg.error" }}
                onClick={() => setConfirmOpen(true)}
              >
                <TrashIcon size={14} />
                Delete
              </Menu.Item>
            </Menu.Content>
          </Menu.Positioner>
        </Portal>
      </Menu.Root>
      <DashboardShareDialog
        dashboard={dashboard}
        isOpen={shareOpen}
        onOpenChange={setShareOpen}
      />
      <ConfirmDialog
        title="Delete dashboard?"
        body={
          <p>
            This will permanently delete the dashboard{" "}
            <strong>{dashboard.name}</strong>. The insights it references are
            not deleted.
          </p>
        }
        confirmLabel="Delete"
        onConfirm={() =>
          deleteDashboard.mutate(dashboard.id, { onSuccess: onDeleted })
        }
        isOpen={confirmOpen}
        onOpenChange={setConfirmOpen}
      />
    </>
  );
}

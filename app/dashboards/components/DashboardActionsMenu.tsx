"use client";

import { useState } from "react";
import { IconButton, Menu, Portal } from "@chakra-ui/react";
import {
  DotsThreeVerticalIcon,
  PencilSimpleIcon,
  ShareIcon,
  TrashIcon,
} from "@phosphor-icons/react";
import useDashboardStore from "@/app/store/dashboardStore";
import DashboardShareDialog from "@/app/dashboards/components/DashboardShareDialog";
import type { Dashboard } from "@/app/types/dashboard";

/** "…" actions menu shared by the gallery card and list views. Rename is
 *  delegated to the caller (inline edit differs per view); share + delete are
 *  handled here against the store. */
export default function DashboardActionsMenu({
  dashboard,
  onRename,
  size = "xs",
}: {
  dashboard: Dashboard;
  onRename: () => void;
  size?: "2xs" | "xs" | "sm";
}) {
  const updateDashboard = useDashboardStore((s) => s.updateDashboard);
  const deleteDashboard = useDashboardStore((s) => s.deleteDashboard);
  const [shareOpen, setShareOpen] = useState(false);

  return (
    <>
      <Menu.Root positioning={{ placement: "bottom-end" }}>
        <Menu.Trigger asChild>
          <IconButton
            aria-label={`Actions for ${dashboard.title}`}
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
                onClick={() => deleteDashboard(dashboard.id)}
              >
                <TrashIcon size={14} />
                Delete
              </Menu.Item>
            </Menu.Content>
          </Menu.Positioner>
        </Portal>
      </Menu.Root>
      <DashboardShareDialog
        dashboardId={dashboard.id}
        title={dashboard.title}
        isPublic={dashboard.isPublic}
        isOpen={shareOpen}
        onOpenChange={setShareOpen}
        onShare={(isPublic) => updateDashboard(dashboard.id, { isPublic })}
      />
    </>
  );
}

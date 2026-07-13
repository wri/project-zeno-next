"use client";

import { useRef, useState } from "react";
import {
  Button,
  Dialog,
  IconButton,
  Input,
  Menu,
  Portal,
} from "@chakra-ui/react";
import {
  DotsThreeVerticalIcon,
  PencilSimpleIcon,
  TrashIcon,
} from "@phosphor-icons/react";

import { toaster } from "@/app/components/ui/toaster";
import type { Dashboard } from "../api/schemas";
import { useDeleteDashboard, useRenameDashboard } from "./dashboardQueries";

export default function DashboardActionsMenu({
  dashboard,
}: {
  dashboard: Dashboard;
}) {
  const [renameOpen, setRenameOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const renameDashboard = useRenameDashboard(dashboard.id);
  const deleteDashboard = useDeleteDashboard();

  const onRename = (name: string) => {
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

  const onDelete = () => {
    deleteDashboard.mutate(dashboard.id, {
      onError: () =>
        toaster.create({
          title: "Delete failed",
          description: "The dashboard couldn't be deleted. Please try again.",
          type: "error",
          duration: 4000,
        }),
    });
  };

  return (
    <>
      <Menu.Root positioning={{ strategy: "fixed", hideWhenDetached: true }}>
        <Menu.Trigger asChild>
          <IconButton
            aria-label={`Dashboard actions for ${dashboard.name}`}
            variant="ghost"
            size="xs"
            rounded="sm"
            color="fg.muted"
            bg="whiteAlpha.500"
            _hover={{ bg: "blackAlpha.50" }}
          >
            <DotsThreeVerticalIcon size={16} weight="bold" />
          </IconButton>
        </Menu.Trigger>
        <Menu.Positioner>
          <Menu.Content>
            <Menu.Item
              value="rename dashboard"
              color="fg.muted"
              onSelect={() => setRenameOpen(true)}
            >
              <PencilSimpleIcon />
              Rename
            </Menu.Item>
            <Menu.Item
              value="delete dashboard"
              color="fg.error"
              _hover={{ bg: "bg.error", color: "fg.error" }}
              onSelect={() => setDeleteOpen(true)}
            >
              <TrashIcon />
              Delete
            </Menu.Item>
          </Menu.Content>
        </Menu.Positioner>
      </Menu.Root>
      <DashboardRenameDialog
        name={dashboard.name}
        isOpen={renameOpen}
        onOpenChange={setRenameOpen}
        onRename={onRename}
      />
      <DashboardDeleteDialog
        dashboardName={dashboard.name}
        isOpen={deleteOpen}
        onOpenChange={setDeleteOpen}
        onConfirm={onDelete}
      />
    </>
  );
}

function DashboardRenameDialog({
  name,
  isOpen,
  onOpenChange,
  onRename,
}: {
  name: string;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onRename: (newName: string) => void;
}) {
  const ref = useRef<HTMLInputElement>(null);
  const [draft, setDraft] = useState(name);
  // Re-seed the draft from the current name each time the dialog opens
  // (render-time derived state, not an effect, to avoid a cascading render).
  const [prevOpen, setPrevOpen] = useState(isOpen);
  if (prevOpen !== isOpen) {
    setPrevOpen(isOpen);
    if (isOpen) setDraft(name);
  }

  return (
    <Dialog.Root
      initialFocusEl={() => ref.current}
      open={isOpen}
      onOpenChange={({ open }) => onOpenChange(open)}
    >
      <Portal>
        <Dialog.Backdrop />
        <Dialog.Positioner>
          <Dialog.Content
            as="form"
            onSubmit={(e) => {
              e.preventDefault();
              if (!draft.trim()) return;
              onRename(draft.trim());
              onOpenChange(false);
            }}
          >
            <Dialog.Header>
              <Dialog.Title>Rename dashboard</Dialog.Title>
            </Dialog.Header>
            <Dialog.Body pb="4">
              <Input
                ref={ref}
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
              />
            </Dialog.Body>
            <Dialog.Footer>
              <Dialog.ActionTrigger asChild>
                <Button variant="outline">Cancel</Button>
              </Dialog.ActionTrigger>
              <Button
                colorPalette="blue"
                disabled={!draft.trim()}
                type="submit"
              >
                Save
              </Button>
            </Dialog.Footer>
          </Dialog.Content>
        </Dialog.Positioner>
      </Portal>
    </Dialog.Root>
  );
}

function DashboardDeleteDialog({
  dashboardName,
  isOpen,
  onOpenChange,
  onConfirm,
}: {
  dashboardName: string;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
}) {
  return (
    <Dialog.Root
      role="alertdialog"
      open={isOpen}
      onOpenChange={({ open }) => onOpenChange(open)}
    >
      <Portal>
        <Dialog.Backdrop />
        <Dialog.Positioner>
          <Dialog.Content>
            <Dialog.Header>
              <Dialog.Title>Are you sure?</Dialog.Title>
            </Dialog.Header>
            <Dialog.Body>
              <p>
                This action cannot be undone. This will permanently delete the
                dashboard <strong>{dashboardName}</strong> and its widgets.
                Insights referenced by the dashboard are kept.
              </p>
            </Dialog.Body>
            <Dialog.Footer>
              <Dialog.ActionTrigger asChild>
                <Button variant="outline">Cancel</Button>
              </Dialog.ActionTrigger>
              <Dialog.ActionTrigger asChild>
                <Button
                  colorPalette="red"
                  onClick={() => {
                    onOpenChange(false);
                    onConfirm();
                  }}
                >
                  Delete
                </Button>
              </Dialog.ActionTrigger>
            </Dialog.Footer>
          </Dialog.Content>
        </Dialog.Positioner>
      </Portal>
    </Dialog.Root>
  );
}

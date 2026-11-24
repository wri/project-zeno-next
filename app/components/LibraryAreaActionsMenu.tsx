import { useRef, useState } from "react";
import { Button, Dialog, Input, Menu, Portal } from "@chakra-ui/react";
import { PencilSimpleIcon, TrashIcon } from "@phosphor-icons/react";

import { toaster } from "@/app/components/ui/toaster";
import useMapStore from "@/app/store/mapStore";
import { findLibraryAreaLayer } from "@/app/utils/libraryAreaMap";
import { renameCustomArea } from "@/app/utils/renameCustomArea";
import {
  useDeleteUserAoi,
  useRenameUserAoi,
  type UserAoi,
} from "@/src/entities/user-aoi";

import { AreaCardMenu } from "./AreaCardMenu";

/**
 * Kebab (⋮) menu for a "My areas" card: rename and remove, with toast
 * feedback and map synchronisation.
 *
 * An owned custom area is renamed or deleted itself, so the map's copies of
 * it follow. A saved source area only changes in the user's library: its
 * label, or whether it is listed. The area itself, and any map layer or
 * dashboard showing it, stay as they are.
 */
export default function LibraryAreaActionsMenu({ entry }: { entry: UserAoi }) {
  const [renameOpen, setRenameOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);

  const rename = useRenameUserAoi();
  const remove = useDeleteUserAoi();
  const isOwned = entry.relationship === "owner";

  // Dialogs stay open on failure so the user can retry; success closes them.
  const handleRename = async (newName: string) => {
    if (newName === entry.name) {
      setRenameOpen(false);
      return;
    }
    try {
      await rename.mutateAsync({ entryId: entry.id, name: newName });
      if (isOwned) renameCustomArea({ id: entry.src_id, name: newName });
      setRenameOpen(false);
      toaster.create({
        title: "Area renamed",
        description: `Renamed to “${newName}”.`,
        type: "success",
        duration: 4000,
      });
    } catch {
      toaster.create({
        title: "Rename failed",
        description: "The area name couldn't be saved. Please try again.",
        type: "error",
        duration: 4000,
      });
    }
  };

  const handleDelete = async () => {
    try {
      await remove.mutateAsync(entry.id);
      setDeleteOpen(false);
      if (isOwned) {
        // The area no longer exists, so it can't stay on the map.
        const { layers, removeLayer } = useMapStore.getState();
        const layer = findLibraryAreaLayer(layers, entry);
        if (layer) removeLayer(layer.id);
      }
      toaster.create({
        title: isOwned ? "Area deleted" : "Area removed",
        description: `“${entry.name}” was removed from your areas.`,
        type: "success",
        duration: 4000,
      });
    } catch {
      toaster.create({
        title: isOwned ? "Delete failed" : "Remove failed",
        description: "The area couldn't be removed. Please try again.",
        type: "error",
        duration: 4000,
      });
    }
  };

  return (
    <>
      <AreaCardMenu label={`Actions for ${entry.name}`}>
        <Menu.Item
          value="rename"
          color="fg.muted"
          onSelect={() => setRenameOpen(true)}
        >
          <PencilSimpleIcon />
          Rename
        </Menu.Item>
        <Menu.Item
          value="delete"
          color="fg.error"
          _hover={{ bg: "bg.error", color: "fg.error" }}
          onSelect={() => setDeleteOpen(true)}
        >
          <TrashIcon />
          {isOwned ? "Delete" : "Remove from my areas"}
        </Menu.Item>
      </AreaCardMenu>
      {renameOpen && (
        <CustomAreaRenameDialog
          name={entry.name}
          onClose={() => setRenameOpen(false)}
          onRename={handleRename}
          isPending={rename.isPending}
        />
      )}
      {deleteOpen && (
        <CustomAreaDeleteDialog
          areaName={entry.name}
          isOwned={isOwned}
          onClose={() => setDeleteOpen(false)}
          onConfirm={handleDelete}
          isPending={remove.isPending}
        />
      )}
    </>
  );
}

function CustomAreaRenameDialog({
  name,
  onClose,
  onRename,
  isPending,
}: {
  name: string;
  onClose: () => void;
  onRename: (newName: string) => Promise<void>;
  isPending: boolean;
}) {
  const ref = useRef<HTMLInputElement>(null);
  // Mounted fresh on each open, so this seeds from the current name.
  const [draft, setDraft] = useState(name);

  return (
    <Dialog.Root
      initialFocusEl={() => ref.current}
      open
      onOpenChange={({ open }) => {
        if (!open) onClose();
      }}
    >
      <Portal>
        <Dialog.Backdrop />
        <Dialog.Positioner>
          <Dialog.Content
            as="form"
            onSubmit={(e) => {
              e.preventDefault();
              const trimmed = draft.trim();
              if (!trimmed || isPending) return;
              void onRename(trimmed);
            }}
          >
            <Dialog.Header>
              <Dialog.Title>Rename area</Dialog.Title>
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
                <Button variant="outline" disabled={isPending}>
                  Cancel
                </Button>
              </Dialog.ActionTrigger>
              <Button
                colorPalette="blue"
                type="submit"
                loading={isPending}
                disabled={!draft.trim()}
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

function CustomAreaDeleteDialog({
  areaName,
  isOwned,
  onClose,
  onConfirm,
  isPending,
}: {
  areaName: string;
  /** A saved area is only unlisted; an owned area is deleted for good. */
  isOwned: boolean;
  onClose: () => void;
  onConfirm: () => Promise<void>;
  isPending: boolean;
}) {
  return (
    <Dialog.Root
      role="alertdialog"
      open
      onOpenChange={({ open }) => {
        if (!open) onClose();
      }}
    >
      <Portal>
        <Dialog.Backdrop />
        <Dialog.Positioner>
          <Dialog.Content>
            <Dialog.Header>
              <Dialog.Title>Are you sure?</Dialog.Title>
            </Dialog.Header>
            <Dialog.Body>
              {isOwned ? (
                <p>
                  This action cannot be undone. This will permanently delete the
                  area <strong>{areaName}</strong>.
                </p>
              ) : (
                <p>
                  <strong>{areaName}</strong> will be removed from your areas.
                  Dashboards built on it are not affected.
                </p>
              )}
            </Dialog.Body>
            <Dialog.Footer>
              <Dialog.ActionTrigger asChild>
                <Button variant="outline" disabled={isPending}>
                  Cancel
                </Button>
              </Dialog.ActionTrigger>
              <Button
                colorPalette="red"
                loading={isPending}
                onClick={() => void onConfirm()}
              >
                {isOwned ? "Delete" : "Remove"}
              </Button>
            </Dialog.Footer>
          </Dialog.Content>
        </Dialog.Positioner>
      </Portal>
    </Dialog.Root>
  );
}

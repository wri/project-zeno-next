"use client";

import { useRef, useState } from "react";
import { Button, Dialog, Input, Menu, Portal } from "@chakra-ui/react";
import { PencilSimpleIcon, TrashIcon } from "@phosphor-icons/react";

import { toaster } from "@/app/components/ui/toaster";
import {
  useCustomAreasDelete,
  useCustomAreasUpdate,
} from "@/app/hooks/useCustomAreasMutations";
import type { CustomArea } from "@/app/schemas/api/custom_areas/get";
import useMapStore from "@/app/store/mapStore";

import { AreaCardMenu } from "./AreaCardMenu";

/**
 * Kebab (⋮) menu for a saved custom area card: rename + delete, with toast
 * feedback and map synchronisation.
 *
 * Acts on the persisted area (`area.id` / `area.name`), so it renders regardless
 * of whether the area is currently shown on the map. React Query invalidation of
 * `["customAreas"]` refreshes the card list, but it does NOT touch the Zustand
 * `mapStore`, so on delete we also mirror the map-removal done elsewhere in the
 * Areas panel.
 *
 * Known limitation: an on-map layer is keyed by the area's old name, so renaming
 * an area that is currently on the map does not relabel the live layer until it
 * is toggled off and on again. Tracked for follow-up.
 */
export default function CustomAreaActionsMenu({ area }: { area: CustomArea }) {
  const [renameOpen, setRenameOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);

  const { renameAreaAsync, isRenaming } = useCustomAreasUpdate();
  const { deleteAreaAsync, isDeleting } = useCustomAreasDelete();

  // Dialogs stay open on failure so the user can retry; success closes them.
  const handleRename = async (newName: string) => {
    if (newName === area.name) {
      setRenameOpen(false);
      return;
    }
    try {
      await renameAreaAsync({ areaId: area.id, name: newName });
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
      await deleteAreaAsync(area.id);
      setDeleteOpen(false);
      // Map isn't auto-synced by the query invalidation — mirror the removal
      // done by the card's show-on-map toggle when the area is on the map.
      const { layers, removeLayer, removeFromRegistry } =
        useMapStore.getState();
      if (layers.some((l) => l.id === area.id)) {
        removeFromRegistry({ name: area.name, source: "custom" });
        removeLayer(area.id);
      }
      toaster.create({
        title: "Area deleted",
        description: `“${area.name}” was removed.`,
        type: "success",
        duration: 4000,
      });
    } catch {
      toaster.create({
        title: "Delete failed",
        description: "The area couldn't be deleted. Please try again.",
        type: "error",
        duration: 4000,
      });
    }
  };

  return (
    <>
      <AreaCardMenu label={`Actions for ${area.name}`}>
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
          Delete
        </Menu.Item>
      </AreaCardMenu>
      {renameOpen && (
        <CustomAreaRenameDialog
          name={area.name}
          onClose={() => setRenameOpen(false)}
          onRename={handleRename}
          isPending={isRenaming}
        />
      )}
      {deleteOpen && (
        <CustomAreaDeleteDialog
          areaName={area.name}
          onClose={() => setDeleteOpen(false)}
          onConfirm={handleDelete}
          isPending={isDeleting}
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
  onClose,
  onConfirm,
  isPending,
}: {
  areaName: string;
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
              <p>
                This action cannot be undone. This will permanently delete the
                area <strong>{areaName}</strong>.
              </p>
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
                Delete
              </Button>
            </Dialog.Footer>
          </Dialog.Content>
        </Dialog.Positioner>
      </Portal>
    </Dialog.Root>
  );
}

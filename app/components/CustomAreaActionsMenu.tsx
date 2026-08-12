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
import { useShallow } from "zustand/react/shallow";

import { toaster } from "@/app/components/ui/toaster";
import {
  useCustomAreasDelete,
  useCustomAreasUpdate,
} from "@/app/hooks/useCustomAreasMutations";
import type { CustomArea } from "@/app/schemas/api/custom_areas/get";
import useMapStore from "@/app/store/mapStore";

/** Matches the Areas panel accent used by the sibling card actions. */
const AREA_LABEL_COLOR = "#2D6BE4";

/** Compact 16px icon styling shared with the card's other title actions. */
const compactIconProps = {
  variant: "ghost" as const,
  color: AREA_LABEL_COLOR,
  boxSize: "16px",
  minW: "16px",
  maxW: "16px",
  minH: "16px",
  maxH: "16px",
  p: 0,
  css: {
    "& svg": {
      width: "16px",
      height: "16px",
    },
  },
};

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

  const removeLayer = useMapStore((s) => s.removeLayer);
  const removeFromRegistry = useMapStore((s) => s.removeFromRegistry);
  const isOnMap = useMapStore(
    useShallow((s) => s.layers.some((l) => l.id === area.id))
  );

  // Returns true when the dialog should close (success or a no-op rename).
  const handleRename = async (newName: string): Promise<boolean> => {
    if (newName === area.name) return true;
    try {
      await renameAreaAsync({ areaId: area.id, name: newName });
      toaster.create({
        title: "Area renamed",
        description: `Renamed to “${newName}”.`,
        type: "success",
        duration: 4000,
      });
      return true;
    } catch {
      toaster.create({
        title: "Rename failed",
        description: "The area name couldn't be saved. Please try again.",
        type: "error",
        duration: 4000,
      });
      return false;
    }
  };

  // Returns true when the dialog should close (deletion succeeded).
  const handleDelete = async (): Promise<boolean> => {
    try {
      await deleteAreaAsync(area.id);
      // Map isn't auto-synced by the query invalidation — mirror the removal
      // done by the card's show-on-map toggle when the area is on the map.
      if (isOnMap) {
        removeFromRegistry({ name: area.name, source: "custom" });
        removeLayer(area.id);
      }
      toaster.create({
        title: "Area deleted",
        description: `“${area.name}” was removed.`,
        type: "success",
        duration: 4000,
      });
      return true;
    } catch {
      toaster.create({
        title: "Delete failed",
        description: "The area couldn't be deleted. Please try again.",
        type: "error",
        duration: 4000,
      });
      return false;
    }
  };

  return (
    <>
      <Menu.Root positioning={{ placement: "bottom-end" }}>
        <Menu.Trigger asChild>
          <IconButton
            aria-label={`Actions for ${area.name}`}
            {...compactIconProps}
            onClick={(e) => e.stopPropagation()}
          >
            <DotsThreeVerticalIcon size={16} color={AREA_LABEL_COLOR} />
          </IconButton>
        </Menu.Trigger>
        <Portal>
          <Menu.Positioner>
            <Menu.Content zIndex={1500}>
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
            </Menu.Content>
          </Menu.Positioner>
        </Portal>
      </Menu.Root>
      {renameOpen && (
        <CustomAreaRenameDialog
          name={area.name}
          isOpen={renameOpen}
          onOpenChange={setRenameOpen}
          onRename={handleRename}
          isPending={isRenaming}
        />
      )}
      {deleteOpen && (
        <CustomAreaDeleteDialog
          areaName={area.name}
          isOpen={deleteOpen}
          onOpenChange={setDeleteOpen}
          onConfirm={handleDelete}
          isPending={isDeleting}
        />
      )}
    </>
  );
}

function CustomAreaRenameDialog({
  name,
  isOpen,
  onOpenChange,
  onRename,
  isPending,
}: {
  name: string;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onRename: (newName: string) => Promise<boolean>;
  isPending: boolean;
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

  const submit = async () => {
    const trimmed = draft.trim();
    if (!trimmed || isPending) return;
    if (await onRename(trimmed)) onOpenChange(false);
  };

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
              void submit();
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
  isOpen,
  onOpenChange,
  onConfirm,
  isPending,
}: {
  areaName: string;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => Promise<boolean>;
  isPending: boolean;
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
                onClick={async () => {
                  if (await onConfirm()) onOpenChange(false);
                }}
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

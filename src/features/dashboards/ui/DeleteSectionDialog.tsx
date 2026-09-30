"use client";

import { Button, Dialog, Portal, Text } from "@chakra-ui/react";

/**
 * Confirmation for deleting a section that holds modules. The backend can
 * delete the section alone, dropping its modules to the top of the dashboard,
 * or delete them with it; the owner picks. An empty section has nothing to
 * lose, so its X deletes without asking.
 */
export default function DeleteSectionDialog({
  open,
  onOpenChange,
  title,
  moduleCount,
  onConfirm,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  moduleCount: number;
  onConfirm: (deleteWidgets: boolean) => void;
}) {
  const confirm = (deleteWidgets: boolean) => {
    onOpenChange(false);
    onConfirm(deleteWidgets);
  };
  const modules = moduleCount === 1 ? "1 module" : `${moduleCount} modules`;

  return (
    <Dialog.Root
      open={open}
      onOpenChange={(e) => onOpenChange(e.open)}
      size="md"
      role="alertdialog"
    >
      <Portal>
        <Dialog.Backdrop />
        <Dialog.Positioner>
          <Dialog.Content>
            <Dialog.Header>
              <Dialog.Title>Delete section?</Dialog.Title>
            </Dialog.Header>
            <Dialog.Body>
              <Text>
                &ldquo;{title}&rdquo; holds {modules}. Delete them with the
                section, or keep them on the dashboard, above the sections. The
                underlying analyses are not deleted.
              </Text>
            </Dialog.Body>
            <Dialog.Footer>
              <Dialog.ActionTrigger asChild>
                <Button variant="outline" size="sm">
                  Cancel
                </Button>
              </Dialog.ActionTrigger>
              <Button
                variant="outline"
                size="sm"
                onClick={() => confirm(false)}
              >
                Keep modules
              </Button>
              <Button
                colorPalette="red"
                size="sm"
                onClick={() => confirm(true)}
              >
                Delete section and modules
              </Button>
            </Dialog.Footer>
          </Dialog.Content>
        </Dialog.Positioner>
      </Portal>
    </Dialog.Root>
  );
}

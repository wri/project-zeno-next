"use client";

import { Button, Dialog, Portal, Text } from "@chakra-ui/react";

/**
 * Confirmation for removing a whole analysis from a dashboard — the widget
 * DELETE, not a per-chart hide.
 *
 * Shared by every surface that can trigger that delete: the grid module's
 * header X, the Analyses pane card toggle, and the chat-side "On dashboard"
 * button. They used to disagree (the grid confirmed, the toggles removed
 * silently) even though all three discard the same thing.
 */
export default function RemoveAnalysisDialog({
  open,
  onOpenChange,
  customized,
  onConfirm,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /**
   * Whether the widget carries hand-arranged config
   * (`hasWidgetCustomization`) — the copy names what the delete throws away,
   * since none of it is recoverable by re-adding the analysis.
   */
  customized: boolean;
  onConfirm: () => void;
}) {
  return (
    <Dialog.Root
      open={open}
      onOpenChange={(e) => onOpenChange(e.open)}
      size="sm"
      role="alertdialog"
    >
      <Portal>
        <Dialog.Backdrop />
        <Dialog.Positioner>
          <Dialog.Content>
            <Dialog.Header>
              <Dialog.Title>Remove analysis?</Dialog.Title>
            </Dialog.Header>
            <Dialog.Body>
              <Text>
                All its charts and summary are removed from this dashboard.
                {customized
                  ? " Its layout and visibility changes are lost."
                  : ""}{" "}
                The underlying analysis is not deleted.
              </Text>
            </Dialog.Body>
            <Dialog.Footer>
              <Dialog.ActionTrigger asChild>
                <Button variant="outline" size="sm">
                  Cancel
                </Button>
              </Dialog.ActionTrigger>
              <Button
                colorPalette="red"
                size="sm"
                onClick={() => {
                  onOpenChange(false);
                  onConfirm();
                }}
              >
                Remove
              </Button>
            </Dialog.Footer>
          </Dialog.Content>
        </Dialog.Positioner>
      </Portal>
    </Dialog.Root>
  );
}

import { useRef, useState } from "react";
import { Button, Dialog, Portal, Text } from "@chakra-ui/react";
import { toSentenceCase } from "@/app/utils/formatText";
import type { TypeChange } from "./useUserTypeChange";

export function SuperuserConfirmDialog({
  change,
  onConfirm,
  onCancel,
}: {
  change: TypeChange | null;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  const cancelRef = useRef<HTMLButtonElement>(null);
  // Keep the last change on screen while the dialog animates out.
  const [shown, setShown] = useState(change);
  if (change !== null && change !== shown) setShown(change);
  if (shown === null) return null;

  const { email } = shown.user;
  const promote = shown.to === "superuser";
  const newType = toSentenceCase(shown.to);

  return (
    <Dialog.Root
      role="alertdialog"
      open={change !== null}
      onOpenChange={({ open }) => {
        if (!open) onCancel();
      }}
      initialFocusEl={() => cancelRef.current}
    >
      <Portal>
        <Dialog.Backdrop />
        <Dialog.Positioner>
          <Dialog.Content>
            <Dialog.Header>
              <Dialog.Title>
                {promote
                  ? `Make ${email} a superuser?`
                  : `Remove superuser from ${email}?`}
              </Dialog.Title>
            </Dialog.Header>
            <Dialog.Body>
              <Text color="fg.muted">
                {promote
                  ? "Superusers can see every user, change anyone's type and download the full user list."
                  : `They lose access to Manage Users, Trace Analytics and Evals and become ${newType}.`}
              </Text>
            </Dialog.Body>
            <Dialog.Footer>
              <Dialog.ActionTrigger asChild>
                <Button ref={cancelRef} variant="outline">
                  Cancel
                </Button>
              </Dialog.ActionTrigger>
              <Button colorPalette="primary" onClick={onConfirm}>
                {promote ? "Make superuser" : `Change to ${newType}`}
              </Button>
            </Dialog.Footer>
          </Dialog.Content>
        </Dialog.Positioner>
      </Portal>
    </Dialog.Root>
  );
}

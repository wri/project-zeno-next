import { Dialog, Button, Portal } from "@chakra-ui/react";

interface ConfirmDialogProps {
  title: string;
  body: React.ReactNode;
  confirmLabel: string;
  onConfirm: () => void;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
}

function ConfirmDialog(props: ConfirmDialogProps) {
  const { title, body, confirmLabel, onConfirm, isOpen, onOpenChange } = props;

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
              <Dialog.Title>{title}</Dialog.Title>
            </Dialog.Header>
            <Dialog.Body>{body}</Dialog.Body>
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
                  {confirmLabel}
                </Button>
              </Dialog.ActionTrigger>
            </Dialog.Footer>
          </Dialog.Content>
        </Dialog.Positioner>
      </Portal>
    </Dialog.Root>
  );
}

export default ConfirmDialog;

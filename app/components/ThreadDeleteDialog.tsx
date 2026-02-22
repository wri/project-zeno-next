import { Dialog, Button, Portal } from "@chakra-ui/react";
import { useTranslations } from "next-intl";

interface ThreadDeleteDialogProps {
  threadName: string;
  onConfirm: () => void;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
}

function ThreadDeleteDialog(props: ThreadDeleteDialogProps) {
  const t = useTranslations("dialogs");
  const tc = useTranslations("common");
  const { threadName, onConfirm, isOpen, onOpenChange } = props;

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
              <Dialog.Title>{t("deleteThread.title")}</Dialog.Title>
            </Dialog.Header>
            <Dialog.Body>
              <p>
                {t("deleteThread.body", { name: threadName })}
              </p>
            </Dialog.Body>
            <Dialog.Footer>
              <Dialog.ActionTrigger asChild>
                <Button variant="outline">{tc("buttons.cancel")}</Button>
              </Dialog.ActionTrigger>
              <Dialog.ActionTrigger asChild>
                <Button
                  colorPalette="red"
                  onClick={() => {
                    onOpenChange(false);
                    onConfirm();
                  }}
                >
                  {t("thread.delete")}
                </Button>
              </Dialog.ActionTrigger>
            </Dialog.Footer>
          </Dialog.Content>
        </Dialog.Positioner>
      </Portal>
    </Dialog.Root>
  );
}

export default ThreadDeleteDialog;

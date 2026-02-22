import { useRef, useCallback, useState, useEffect } from "react";
import { Dialog, Portal, Button, Input } from "@chakra-ui/react";
import { useTranslations } from "next-intl";

interface ThreadRenameDialogProps {
  name: string;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onRename: (newName: string) => void;
}

function ThreadRenameDialog(props: ThreadRenameDialogProps) {
  const t = useTranslations("dialogs");
  const tc = useTranslations("common");
  const { name, isOpen, onOpenChange, onRename } = props;
  const ref = useRef<HTMLInputElement>(null);
  const [threadName, setThreadName] = useState("");

  useEffect(() => {
    setThreadName(name);
  }, [name, isOpen]);

  const rename = useCallback(() => {
    onRename(threadName);
    onOpenChange(false);
  }, [threadName, onRename, onOpenChange]);

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
              if (!threadName) return;
              rename();
            }}
          >
            <Dialog.Header>
              <Dialog.Title>{t("renameThread.title")}</Dialog.Title>
            </Dialog.Header>
            <Dialog.Body pb="4">
              <Input
                value={threadName}
                onChange={(e) => setThreadName(e.target.value)}
              />
            </Dialog.Body>
            <Dialog.Footer>
              <Dialog.ActionTrigger asChild>
                <Button variant="outline">{tc("buttons.cancel")}</Button>
              </Dialog.ActionTrigger>
              <Button colorPalette="blue" disabled={!threadName} type="submit">
                {tc("buttons.save")}
              </Button>
            </Dialog.Footer>
          </Dialog.Content>
        </Dialog.Positioner>
      </Portal>
    </Dialog.Root>
  );
}
export default ThreadRenameDialog;

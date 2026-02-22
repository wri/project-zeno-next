import { useRef, useCallback, useState, useEffect } from "react";
import {
  Dialog,
  useClipboard,
  Portal,
  Button,
  CloseButton,
  Input,
  HStack,
  Select,
  createListCollection,
  Field,
  Link,
} from "@chakra-ui/react";
import { useTranslations } from "next-intl";
import { toaster } from "@/app/components/ui/toaster";
import {
  GlobeIcon,
  LinkIcon,
  LockIcon,
  CopyIcon,
  CheckIcon,
} from "@phosphor-icons/react";
import { sendGAEvent } from "@next/third-parties/google";
import ChatDisclaimer from "./ChatDisclaimer";

interface ThreadShareDialogProps {
  threadId: string;
  isPublic?: boolean;
  onShare: (isPublic: boolean) => void;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
}

type ValueChangeDetails = { value: string[] };

function ThreadShareDialog(props: ThreadShareDialogProps) {
  const t = useTranslations("dialogs");
  const tc = useTranslations("common");
  const { threadId, isPublic, onShare, isOpen, onOpenChange } = props;
  const baseUrl =
    process.env.NEXT_PUBLIC_SITE_URL ||
    (typeof window !== "undefined" ? window.location.origin : "");
  const shareUrl = `${baseUrl}/app/threads/${threadId}`;
  const clipboard = useClipboard({ value: shareUrl });
  const ref = useRef<HTMLInputElement>(null);
  const [threadIsPublic, setThreadIsPublic] = useState<boolean>(false);

  useEffect(() => {
    if (isOpen && isPublic !== undefined) {
      setThreadIsPublic(isPublic);
    }
  }, [isPublic, isOpen]);

  const updateVisibility = useCallback(
    async (newIsPublic: boolean) => {
      try {
        setThreadIsPublic(newIsPublic);
        await onShare(newIsPublic);
        toaster.create({
          title: t("shareThread.visibilityUpdated"),
          description: newIsPublic
            ? t("shareThread.nowPublic")
            : t("shareThread.nowPrivate"),
          type: "success",
          duration: 3000,
        });
      } catch (error) {
        setThreadIsPublic(!newIsPublic);
        toaster.create({
          title: t("shareThread.visibilityFailed"),
          description: t("shareThread.visibilityFailedDescription"),
          type: "error",
          duration: 4000,
        });
        console.error("Failed to update thread visibility:", error);
      }
    },
    [onShare, t]
  );

  const shareOptions = createListCollection({
    items: [
      {
        label: t("shareThread.private"),
        icon: <LockIcon />,
        value: "false",
      },
      {
        label: t("shareThread.public"),
        icon: <GlobeIcon />,
        value: "true",
      },
    ],
  });

  return (
    <Dialog.Root
      initialFocusEl={() => ref.current}
      placement="center"
      open={isOpen}
      onOpenChange={({ open }) => onOpenChange(open)}
    >
      <Portal>
        <Dialog.Backdrop />
        <Dialog.Positioner>
          <Dialog.Content>
            <Dialog.CloseTrigger asChild>
              <CloseButton size="sm" />
            </Dialog.CloseTrigger>
            <Dialog.Header>
              <Dialog.Title>{t("shareThread.title")}</Dialog.Title>
            </Dialog.Header>
            <Dialog.Body pb="4" display="flex" flexDir="column" gap="4">
              <ChatDisclaimer m={0}>
                {t("shareThread.disclaimer")}{" "}
                <Link
                  textDecoration="underline"
                  textDecorationStyle="dotted"
                  rel="noreferrer"
                  color="primary.solid"
                  target="_blank"
                  href="https://www.wri.org/about/legal/general-terms-use"
                >
                  {t("shareThread.termsLink")}
                </Link>
                .
              </ChatDisclaimer>
              <Field.Root id="visibility" w="full">
                <Select.Root
                  collection={shareOptions}
                  ref={ref}
                  size="sm"
                  width="full"
                  value={[threadIsPublic.toString()]}
                  positioning={{ strategy: "fixed", hideWhenDetached: true }}
                  onValueChange={(details: ValueChangeDetails) => {
                    if (details.value.length > 0) {
                      const newValue = details.value[0] === "true";
                      updateVisibility(newValue);
                    }
                  }}
                >
                  <Select.HiddenSelect />
                  <Select.Label>{t("shareThread.visibility")}</Select.Label>
                  <Select.Control>
                    <Select.Trigger>
                      <HStack>
                        {threadIsPublic ? <GlobeIcon /> : <LockIcon />}
                        {threadIsPublic
                          ? t("shareThread.public")
                          : t("shareThread.private")}
                      </HStack>
                    </Select.Trigger>
                    <Select.IndicatorGroup>
                      <Select.Indicator />
                    </Select.IndicatorGroup>
                  </Select.Control>

                  <Select.Positioner w="var(--reference-width)">
                    <Select.Content>
                      {shareOptions.items.map((option) => (
                        <Select.Item item={option} key={option.label}>
                          <HStack>
                            {option.icon}
                            {option.label}
                          </HStack>
                          <Select.ItemIndicator />
                        </Select.Item>
                      ))}
                    </Select.Content>
                  </Select.Positioner>
                </Select.Root>
              </Field.Root>
              {threadIsPublic && <Input value={shareUrl} w="full" readOnly />}
            </Dialog.Body>
            <Dialog.Footer>
              <Dialog.ActionTrigger asChild>
                <Button variant="outline">{tc("buttons.cancel")}</Button>
              </Dialog.ActionTrigger>
              {threadIsPublic ? (
                <Button
                  colorPalette="primary"
                  onClick={() => {
                    clipboard.copy();
                    sendGAEvent("event", "share_link_copied", {
                      share_url: shareUrl,
                    });
                  }}
                >
                  {clipboard.copied ? <CheckIcon /> : <CopyIcon />}
                  {clipboard.copied
                    ? t("shareThread.linkCopied")
                    : t("shareThread.copyShareLink")}
                </Button>
              ) : (
                <Button
                  colorPalette="primary"
                  onClick={() => updateVisibility(true)}
                >
                  <LinkIcon />
                  {t("shareThread.createShareLink")}
                </Button>
              )}
            </Dialog.Footer>
          </Dialog.Content>
        </Dialog.Positioner>
      </Portal>
    </Dialog.Root>
  );
}
export default ThreadShareDialog;

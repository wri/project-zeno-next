"use client";

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
import {
  GlobeIcon,
  LinkIcon,
  LockIcon,
  CopyIcon,
  CheckIcon,
} from "@phosphor-icons/react";
import { toaster } from "@/app/components/ui/toaster";
import ChatDisclaimer from "@/app/components/ChatDisclaimer";

interface DashboardShareDialogProps {
  dashboardId: string;
  title: string;
  isPublic?: boolean;
  onShare: (isPublic: boolean) => void;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
}

type ValueChangeDetails = { value: string[] };

// Mirrors ThreadShareDialog so dashboard sharing behaves like conversation
// sharing. Prototype: visibility is persisted to the local dashboard store, not
// the backend, and the "share link" is a plain route to the dashboard.
export default function DashboardShareDialog(props: DashboardShareDialogProps) {
  const { dashboardId, title, isPublic, onShare, isOpen, onOpenChange } = props;
  const baseUrl =
    process.env.NEXT_PUBLIC_SITE_URL ||
    (typeof window !== "undefined" ? window.location.origin : "");
  const shareUrl = `${baseUrl}/dashboards/${dashboardId}`;
  const clipboard = useClipboard({ value: shareUrl });
  const ref = useRef<HTMLInputElement>(null);
  const [dashboardIsPublic, setDashboardIsPublic] = useState<boolean>(false);

  useEffect(() => {
    if (isOpen && isPublic !== undefined) {
      setDashboardIsPublic(isPublic);
    }
  }, [isPublic, isOpen]);

  const updateVisibility = useCallback(
    (newIsPublic: boolean) => {
      setDashboardIsPublic(newIsPublic);
      onShare(newIsPublic);
      toaster.create({
        title: "Visibility updated",
        description: `“${title}” is now ${newIsPublic ? "public" : "private"}`,
        type: "success",
        duration: 3000,
      });
    },
    [onShare, title]
  );

  const shareOptions = createListCollection({
    items: [
      {
        label: "Private (only you can access)",
        icon: <LockIcon />,
        value: "false",
      },
      {
        label: "Public (anyone can access)",
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
              <Dialog.Title>Share dashboard</Dialog.Title>
            </Dialog.Header>
            <Dialog.Body pb="4" display="flex" flexDir="column" gap="4">
              <ChatDisclaimer m={0}>
                Sharing creates a public, view-only link to this dashboard. Make
                sure it contains no personal or sensitive information. You can
                switch Visibility back to private later. For more information,
                read our{" "}
                <Link
                  textDecoration="underline"
                  textDecorationStyle="dotted"
                  rel="noreferrer"
                  color="primary.solid"
                  target="_blank"
                  href="https://www.wri.org/about/legal/general-terms-use"
                >
                  Terms of use
                </Link>
                .
              </ChatDisclaimer>
              <Field.Root id="visibility" w="full">
                <Select.Root
                  collection={shareOptions}
                  ref={ref}
                  size="sm"
                  width="full"
                  value={[dashboardIsPublic.toString()]}
                  positioning={{ strategy: "fixed", hideWhenDetached: true }}
                  onValueChange={(details: ValueChangeDetails) => {
                    if (details.value.length > 0) {
                      updateVisibility(details.value[0] === "true");
                    }
                  }}
                >
                  <Select.HiddenSelect />
                  <Select.Label>Visibility</Select.Label>
                  <Select.Control>
                    <Select.Trigger>
                      <HStack>
                        {dashboardIsPublic ? <GlobeIcon /> : <LockIcon />}
                        {dashboardIsPublic
                          ? "Public (anyone can access)"
                          : "Private (only you can access)"}
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
              {dashboardIsPublic && (
                <Input value={shareUrl} w="full" readOnly />
              )}
            </Dialog.Body>
            <Dialog.Footer>
              <Dialog.ActionTrigger asChild>
                <Button variant="outline">Cancel</Button>
              </Dialog.ActionTrigger>
              {dashboardIsPublic ? (
                <Button colorPalette="primary" onClick={() => clipboard.copy()}>
                  {clipboard.copied ? <CheckIcon /> : <CopyIcon />}
                  {clipboard.copied ? "Link copied" : "Copy share link"}
                </Button>
              ) : (
                <Button
                  colorPalette="primary"
                  onClick={() => updateVisibility(true)}
                >
                  <LinkIcon />
                  Create share link
                </Button>
              )}
            </Dialog.Footer>
          </Dialog.Content>
        </Dialog.Positioner>
      </Portal>
    </Dialog.Root>
  );
}

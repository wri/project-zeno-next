"use client";

import { useEffect, useRef, useState } from "react";
import {
  Button,
  CloseButton,
  Dialog,
  Field,
  HStack,
  Input,
  Link,
  Portal,
  Select,
  Text,
  createListCollection,
  useClipboard,
} from "@chakra-ui/react";
import {
  CheckIcon,
  CopyIcon,
  GlobeIcon,
  LinkIcon,
  LockIcon,
} from "@phosphor-icons/react";

import ChatDisclaimer from "@/app/components/ChatDisclaimer";
import { toaster } from "@/app/components/ui/toaster";
import { usePublishDashboard } from "@/app/hooks/useDashboards";
import type { Dashboard } from "@/app/schemas/api/dashboards/get";

interface DashboardShareDialogProps {
  dashboard: Dashboard;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
}

type ValueChangeDetails = { value: string[] };

// Mirrors ThreadShareDialog so dashboard sharing behaves like conversation
// sharing — with one extra step: visibility changes are confirmed before they
// apply, because publishing cascades is_public to every insight the dashboard
// references (and unpublishing does not undo that).
export default function DashboardShareDialog(props: DashboardShareDialogProps) {
  const { dashboard, isOpen, onOpenChange } = props;
  const baseUrl =
    process.env.NEXT_PUBLIC_SITE_URL ||
    (typeof window !== "undefined" ? window.location.origin : "");
  const shareUrl = `${baseUrl}/dashboards/${dashboard.id}`;
  const clipboard = useClipboard({ value: shareUrl });
  const ref = useRef<HTMLButtonElement>(null);
  const publish = usePublishDashboard(dashboard.id);
  // A visibility change waiting for the user's confirmation, or null.
  const [pending, setPending] = useState<boolean | null>(null);

  useEffect(() => {
    if (isOpen) setPending(null);
  }, [isOpen]);

  const insightWidgetCount = dashboard.widgets.filter(
    (w) => w.widget_type === "insight" && w.insight_id
  ).length;

  const applyVisibility = (isPublic: boolean) => {
    publish.mutate(isPublic, {
      onSuccess: (updated) => {
        setPending(null);
        const publicized = updated.publicized_insight_ids?.length ?? 0;
        toaster.create({
          title: "Visibility updated",
          description:
            `“${dashboard.name}” is now ${isPublic ? "public" : "private"}` +
            (isPublic && publicized > 0
              ? `. ${publicized} insight${publicized === 1 ? " was" : "s were"} also made public.`
              : ""),
          type: "success",
          duration: 5000,
        });
      },
    });
  };

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

  const requestVisibility = (isPublic: boolean) => {
    if (isPublic !== dashboard.is_public) setPending(isPublic);
  };

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
                  size="sm"
                  width="full"
                  value={[(pending ?? dashboard.is_public).toString()]}
                  positioning={{ strategy: "fixed", hideWhenDetached: true }}
                  onValueChange={(details: ValueChangeDetails) => {
                    if (details.value.length > 0) {
                      requestVisibility(details.value[0] === "true");
                    }
                  }}
                >
                  <Select.HiddenSelect />
                  <Select.Label>Visibility</Select.Label>
                  <Select.Control>
                    <Select.Trigger>
                      <HStack>
                        {(pending ?? dashboard.is_public) ? (
                          <GlobeIcon />
                        ) : (
                          <LockIcon />
                        )}
                        {(pending ?? dashboard.is_public)
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
              {pending === true && (
                <Text fontSize="sm" color="fg.muted">
                  Publishing also makes the{" "}
                  {insightWidgetCount === 1
                    ? "insight this dashboard shows"
                    : `${insightWidgetCount} insights this dashboard shows`}{" "}
                  public, so viewers see the full dashboard.
                </Text>
              )}
              {pending === false && (
                <Text fontSize="sm" color="fg.muted">
                  The dashboard becomes private again, but insights that were
                  made public when you shared it <b>stay public</b>.
                </Text>
              )}
              {dashboard.is_public && pending === null && (
                <Input value={shareUrl} w="full" readOnly />
              )}
            </Dialog.Body>
            <Dialog.Footer>
              {pending !== null ? (
                <>
                  <Button variant="outline" onClick={() => setPending(null)}>
                    Cancel
                  </Button>
                  <Button
                    colorPalette="primary"
                    loading={publish.isPending}
                    onClick={() => applyVisibility(pending)}
                  >
                    {pending ? "Make public" : "Make private"}
                  </Button>
                </>
              ) : (
                <>
                  <Dialog.ActionTrigger asChild>
                    <Button variant="outline">Cancel</Button>
                  </Dialog.ActionTrigger>
                  {dashboard.is_public ? (
                    <Button
                      colorPalette="primary"
                      onClick={() => clipboard.copy()}
                    >
                      {clipboard.copied ? <CheckIcon /> : <CopyIcon />}
                      {clipboard.copied ? "Link copied" : "Copy share link"}
                    </Button>
                  ) : (
                    <Button
                      ref={ref}
                      colorPalette="primary"
                      onClick={() => requestVisibility(true)}
                    >
                      <LinkIcon />
                      Create share link
                    </Button>
                  )}
                </>
              )}
            </Dialog.Footer>
          </Dialog.Content>
        </Dialog.Positioner>
      </Portal>
    </Dialog.Root>
  );
}

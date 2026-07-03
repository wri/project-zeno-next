"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import {
  Box,
  Breadcrumb,
  Button,
  Flex,
  Heading,
  IconButton,
  Input,
  SimpleGrid,
  Spinner,
  Text,
} from "@chakra-ui/react";
import {
  CheckIcon,
  PencilSimpleIcon,
  TrashIcon,
  XIcon,
} from "@phosphor-icons/react";
import { formatDistanceToNow } from "date-fns";
import ChatPanel from "@/app/ChatPanel";
import { Tooltip } from "@/app/components/ui/tooltip";
import ConfirmDialog from "@/app/components/dashboards/ConfirmDialog";
import DashboardWidgetCard from "@/app/components/dashboards/DashboardWidgetCard";
import {
  useDashboard,
  useDeleteDashboard,
  useRemoveWidget,
  useRenameDashboard,
} from "@/app/hooks/useDashboards";
import { setActiveDashboard } from "@/app/lib/view-context";
import {
  COMPACT_CHAT_INSET_PX,
  COMPACT_CHAT_PANEL_WIDTH_PX,
} from "@/app/explorationLayout";

export default function DashboardDetailPage() {
  const params = useParams<{ id: string }>();
  const id = params?.id ?? "";
  const router = useRouter();
  const { dashboard, isLoading, error } = useDashboard(id);
  const renameDashboard = useRenameDashboard(id);
  const deleteDashboard = useDeleteDashboard();
  const removeWidget = useRemoveWidget(id);
  const [draftName, setDraftName] = useState<string | null>(null);
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);

  // Tell the chat agent which dashboard is on screen (sent as view_context
  // with every chat request) so "add this to my dashboard" needs no naming.
  const dashboardName = dashboard?.name;
  useEffect(() => {
    if (!dashboardName) return;
    setActiveDashboard({ id, name: dashboardName });
    return () => setActiveDashboard(null);
  }, [id, dashboardName]);

  if (isLoading) {
    return (
      <Flex justify="center" py={16}>
        <Spinner />
      </Flex>
    );
  }

  if (error || !dashboard) {
    return (
      <Flex direction="column" align="center" gap={3} py={16}>
        <Heading size="md">Dashboard not found</Heading>
        <Button asChild variant="outline" size="sm">
          <Link href="/dashboards">Back to dashboards</Link>
        </Button>
      </Flex>
    );
  }

  const saveName = () => {
    const name = draftName?.trim();
    if (name && name !== dashboard.name) {
      renameDashboard.mutate({ name });
    }
    setDraftName(null);
  };

  const widgets = [...dashboard.widgets].sort(
    (a, b) => a.position - b.position
  );

  return (
    <Flex h="100%" minH={0}>
      <Box
        w={`${COMPACT_CHAT_PANEL_WIDTH_PX + 2 * COMPACT_CHAT_INSET_PX}px`}
        flexShrink={0}
        h="100%"
        hideBelow="md"
      >
        <ChatPanel />
      </Box>
      <Box
        flex="1"
        minW={0}
        h="100%"
        overflowY="auto"
        px={{ base: 4, md: 8 }}
        py={6}
      >
        <Breadcrumb.Root mb={4}>
          <Breadcrumb.List>
            <Breadcrumb.Item>
              <Breadcrumb.Link asChild>
                <Link href="/dashboards">Dashboards</Link>
              </Breadcrumb.Link>
            </Breadcrumb.Item>
            <Breadcrumb.Separator />
            <Breadcrumb.Item>
              <Breadcrumb.CurrentLink>{dashboard.name}</Breadcrumb.CurrentLink>
            </Breadcrumb.Item>
          </Breadcrumb.List>
        </Breadcrumb.Root>

        <Flex justify="space-between" align="flex-start" gap={4} mb={2}>
          {draftName !== null ? (
            <Flex align="center" gap={2} flex="1" maxW="lg">
              <Input
                value={draftName}
                onChange={(e) => setDraftName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") saveName();
                  if (e.key === "Escape") setDraftName(null);
                }}
                size="lg"
                autoFocus
                aria-label="Dashboard name"
              />
              <IconButton
                size="sm"
                variant="ghost"
                onClick={saveName}
                aria-label="Save name"
              >
                <CheckIcon size={16} />
              </IconButton>
              <IconButton
                size="sm"
                variant="ghost"
                onClick={() => setDraftName(null)}
                aria-label="Cancel rename"
              >
                <XIcon size={16} />
              </IconButton>
            </Flex>
          ) : (
            <Flex align="center" gap={2} minW={0}>
              <Heading as="h1" size="3xl" fontWeight="normal" m={0}>
                {dashboard.name}
              </Heading>
              <Tooltip content="Rename dashboard" showArrow>
                <IconButton
                  size="sm"
                  variant="ghost"
                  onClick={() => setDraftName(dashboard.name)}
                  aria-label="Rename dashboard"
                >
                  <PencilSimpleIcon size={18} />
                </IconButton>
              </Tooltip>
            </Flex>
          )}
          <Button
            size="xs"
            variant="outline"
            colorPalette="red"
            onClick={() => setConfirmDeleteOpen(true)}
          >
            <TrashIcon size={14} />
            Delete
          </Button>
        </Flex>

        {dashboard.description && (
          <Text color="fg.muted" mb={1}>
            {dashboard.description}
          </Text>
        )}
        <Text fontSize="xs" color="fg.muted" mb={8}>
          Updated{" "}
          {formatDistanceToNow(new Date(dashboard.updated_at), {
            addSuffix: true,
          })}
        </Text>

        {widgets.length === 0 ? (
          <Text color="fg.muted">
            No widgets yet — ask the assistant to add an analysis to this
            dashboard.
          </Text>
        ) : (
          <SimpleGrid columns={{ base: 1, xl: 2 }} gap={4} pb={10}>
            {widgets.map((widget) => (
              <DashboardWidgetCard
                key={widget.id}
                widget={widget}
                aois={dashboard.aois}
                onRemove={() => removeWidget.mutate(widget.id)}
              />
            ))}
          </SimpleGrid>
        )}

        <ConfirmDialog
          title="Delete dashboard?"
          body={
            <p>
              This will permanently delete the dashboard{" "}
              <strong>{dashboard.name}</strong>. The insights it references are
              not deleted.
            </p>
          }
          confirmLabel="Delete"
          onConfirm={() =>
            deleteDashboard.mutate(dashboard.id, {
              onSuccess: () => router.push("/dashboards"),
            })
          }
          isOpen={confirmDeleteOpen}
          onOpenChange={setConfirmDeleteOpen}
        />
      </Box>
    </Flex>
  );
}

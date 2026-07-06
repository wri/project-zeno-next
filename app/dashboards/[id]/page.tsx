"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import {
  Box,
  Button,
  Container,
  Flex,
  Grid,
  GridItem,
  Heading,
  IconButton,
  Input,
  Text,
} from "@chakra-ui/react";
import {
  CaretLeftIcon,
  ChartBarIcon,
  CheckIcon,
  PencilSimpleIcon,
  PlusIcon,
  ShareNetworkIcon,
  SparkleIcon,
  TrashIcon,
  XIcon,
} from "@phosphor-icons/react";
import { formatDistanceToNow } from "date-fns";

import { Tooltip } from "@/app/components/ui/tooltip";
import ConfirmDialog from "@/app/components/dashboards/ConfirmDialog";
import DashboardShareDialog from "@/app/components/dashboards/DashboardShareDialog";
import DashboardSkeleton from "@/app/components/dashboards/DashboardSkeleton";
import DashboardWidgetCard, {
  type ArrangeProps,
} from "@/app/components/dashboards/DashboardWidgetCard";
import DashboardWorkspace from "@/app/components/dashboards/DashboardWorkspace";
import { getLoginUrl } from "@/app/hooks/useAuthGuard";
import {
  useAddWidget,
  useDashboard,
  useDeleteDashboard,
  useRemoveWidget,
  useRenameDashboard,
  useReorderWidgets,
  useUpdateWidget,
} from "@/app/hooks/useDashboards";
import { computeReorder } from "@/app/lib/dashboard-widgets";
import { setActiveDashboard } from "@/app/lib/view-context";
import useAuthStore from "@/app/store/authStore";
import useComposerStore from "@/app/store/composerStore";

/** Placeholder block inserted by the "+" — choose what to put here. */
function EmptyBlock({
  onAskAi,
  onAddAnalysis,
  onAddNote,
  onDismiss,
}: {
  onAskAi: () => void;
  onAddAnalysis: () => void;
  onAddNote: () => void;
  onDismiss: () => void;
}) {
  const OPTIONS = [
    { label: "Ask AI", icon: SparkleIcon, onClick: onAskAi },
    { label: "Add an analysis", icon: ChartBarIcon, onClick: onAddAnalysis },
    { label: "Add note", icon: PencilSimpleIcon, onClick: onAddNote },
  ];
  return (
    <Box
      rounded="8px"
      borderWidth="1px"
      borderStyle="dashed"
      borderColor="#8EA5EA"
      bg="#F7F9FF"
      h="100%"
      minH="160px"
      display="flex"
      flexDirection="column"
      p={3}
    >
      <Flex justify="flex-end" align="center" color="fg.muted">
        <IconButton
          aria-label="Remove block"
          size="2xs"
          variant="ghost"
          onClick={onDismiss}
        >
          <XIcon size={14} />
        </IconButton>
      </Flex>
      <Flex
        flex="1"
        flexDirection="column"
        align="center"
        justify="center"
        gap={2}
        py={4}
      >
        <Text fontSize="sm" color="fg.muted">
          What would you like to add?
        </Text>
        <Flex gap={2} flexWrap="wrap" justify="center">
          {OPTIONS.map((o) => (
            <Button
              key={o.label}
              size="sm"
              variant="outline"
              bg="bg"
              onClick={o.onClick}
            >
              <o.icon size={16} />
              {o.label}
            </Button>
          ))}
        </Flex>
      </Flex>
    </Box>
  );
}

/** Compact white outline button used in the dashboard header action row. */
function HeaderActionButton(props: React.ComponentProps<typeof Button>) {
  return (
    <Button
      variant="outline"
      h="24px"
      px="8px"
      gap="4px"
      fontSize="12px"
      fontWeight="medium"
      bg="#FFFFFF"
      borderColor="rgba(19,22,25,0.2)"
      color="rgba(19,22,25,0.7)"
      _hover={{ bg: "#F4F5F6" }}
      {...props}
    />
  );
}

export default function DashboardDetailPage() {
  const params = useParams<{ id: string }>();
  const id = params?.id ?? "";
  const router = useRouter();
  const { dashboard, isLoading, error } = useDashboard(id);
  const renameDashboard = useRenameDashboard(id);
  const deleteDashboard = useDeleteDashboard();
  const removeWidget = useRemoveWidget(id);
  const updateWidget = useUpdateWidget(id);
  const addWidget = useAddWidget(id);
  const reorderWidgets = useReorderWidgets(id);
  const userId = useAuthStore((s) => s.userId);
  const requestFocus = useComposerStore((s) => s.requestFocus);
  const openSidePane = useComposerStore((s) => s.openSidePane);
  const resetComposer = useComposerStore((s) => s.reset);

  // Close the side panel / restore the floating chat when leaving the page.
  useEffect(() => () => resetComposer(), [resetComposer]);

  const [draftName, setDraftName] = useState<string | null>(null);
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  const [showEmptyBlock, setShowEmptyBlock] = useState(false);

  // Drag-to-reorder state: a grab handle arms its grid item (grabbedId),
  // dragIndex/overIndex track the HTML5 drag in flight.
  const [grabbedId, setGrabbedId] = useState<string | null>(null);
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [overIndex, setOverIndex] = useState<number | null>(null);
  const resetDrag = () => {
    setGrabbedId(null);
    setDragIndex(null);
    setOverIndex(null);
  };

  // Public dashboards render for everyone; edit affordances are owner-only.
  const isOwner =
    !!dashboard &&
    !!userId &&
    !!dashboard.user_id &&
    dashboard.user_id === userId;

  // Tell the chat agent which dashboard is on screen (sent as view_context
  // with every chat request) so "add this to my dashboard" needs no naming.
  const dashboardName = dashboard?.name;
  useEffect(() => {
    if (!dashboardName) return;
    setActiveDashboard({ id, name: dashboardName });
    return () => setActiveDashboard(null);
  }, [id, dashboardName]);

  const status = (error as (Error & { status?: number }) | null)?.status;

  // The owner gets the workspace chrome: floating/dockable AI assistant +
  // the Analyses side panel. Viewers (and loading/error states) get just the
  // scrollable content.
  const pageChrome = (content: React.ReactNode) => {
    const scrollArea = (
      <Box w="100%" h="100%" overflowY="auto" bg="#F4F5F6" py={6}>
        <Container maxW="6xl">
          {/* Breadcrumb */}
          <Flex align="center" gap={1} fontSize="sm" color="fg.muted" mb={3}>
            <Box
              as={Link}
              {...{ href: "/dashboards" }}
              _hover={{ color: "fg" }}
            >
              Dashboards
            </Box>
            <Text>›</Text>
            <Text color="fg" lineClamp={1}>
              {dashboard?.name ?? "…"}
            </Text>
          </Flex>
          {content}
        </Container>
      </Box>
    );

    return isOwner && dashboard ? (
      <DashboardWorkspace dashboard={dashboard}>
        {scrollArea}
      </DashboardWorkspace>
    ) : (
      <Box h="100%" minH={0}>
        {scrollArea}
      </Box>
    );
  };

  if (isLoading) {
    return pageChrome(<DashboardSkeleton />);
  }

  if (status === 401) {
    // Private dashboard, not logged in — viewing needs an account.
    return pageChrome(
      <Flex direction="column" align="center" gap={3} py={16}>
        <Heading size="md">Log in to view this dashboard</Heading>
        <Text color="fg.muted">
          This dashboard is private. Log in to check if you have access.
        </Text>
        <Button
          size="sm"
          colorPalette="primary"
          onClick={() => {
            window.location.href = getLoginUrl(window.location.href);
          }}
        >
          Log in
        </Button>
      </Flex>
    );
  }

  if (error || !dashboard) {
    return pageChrome(
      <Flex direction="column" align="center" gap={3} py={16}>
        <Heading size="md">Dashboard not found</Heading>
        <Text color="fg.muted">
          This dashboard doesn&apos;t exist, was removed, or isn&apos;t shared
          with you.
        </Text>
        <Button asChild variant="outline" size="sm">
          <Link href="/dashboards">
            <CaretLeftIcon /> Back to dashboards
          </Link>
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

  const arrangeFor = (widgetId: string): ArrangeProps => ({
    onMouseDown: () => setGrabbedId(widgetId),
    onMouseUp: () => setGrabbedId(null),
  });

  const handleDrop = (targetIndex: number) => {
    if (dragIndex !== null && dragIndex !== targetIndex) {
      const { patches } = computeReorder(widgets, dragIndex, targetIndex);
      if (patches.length) reorderWidgets.mutate(patches);
    }
    resetDrag();
  };

  const areaName = dashboard.aois?.[0]?.name;

  return pageChrome(
    <Box
      bg="bg"
      borderRadius="8px"
      borderWidth="1px"
      borderColor="rgba(19, 22, 25, 0.1)"
      overflow="hidden"
    >
      {/* Header zone — grid + blue accent background */}
      <Box
        bgColor="#FFFFFF"
        bgImage="url('/dashboard-header-bg.svg')"
        bgSize="cover"
        bgPos="top"
        bgRepeat="no-repeat"
        px={{ base: 5, md: 8 }}
        pt={{ base: 5, md: 8 }}
        pb={6}
      >
        {/* Eyebrow — the dashboard's area */}
        {areaName && (
          <Text fontSize="14px" color="#565E7B" mb={2}>
            {areaName}
          </Text>
        )}

        {/* Title bar */}
        <Flex
          justify="space-between"
          align="flex-start"
          gap={4}
          flexWrap="wrap"
        >
          <Box minW={0}>
            {draftName !== null ? (
              <Flex align="center" gap={2}>
                <Input
                  value={draftName}
                  onChange={(e) => setDraftName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") saveName();
                    if (e.key === "Escape") setDraftName(null);
                  }}
                  size="lg"
                  fontSize="30px"
                  autoFocus
                  maxW="640px"
                  aria-label="Dashboard name"
                />
                <IconButton aria-label="Save name" size="sm" onClick={saveName}>
                  <CheckIcon />
                </IconButton>
                <IconButton
                  aria-label="Cancel rename"
                  size="sm"
                  variant="ghost"
                  onClick={() => setDraftName(null)}
                >
                  <XIcon />
                </IconButton>
              </Flex>
            ) : (
              <Flex align="center" gap={3}>
                <Heading
                  as="h1"
                  fontSize="30px"
                  fontWeight="normal"
                  lineHeight="36px"
                  color="#131619"
                  lineClamp={2}
                  m={0}
                >
                  {dashboard.name}
                </Heading>
                {isOwner && (
                  <Tooltip content="Rename dashboard" showArrow>
                    <IconButton
                      aria-label="Rename dashboard"
                      size="xs"
                      variant="ghost"
                      color="rgba(19,22,25,0.5)"
                      onClick={() => setDraftName(dashboard.name)}
                    >
                      <PencilSimpleIcon size={20} />
                    </IconButton>
                  </Tooltip>
                )}
              </Flex>
            )}
            {dashboard.description && (
              <Text fontSize="sm" color="fg.muted" mt={2}>
                {dashboard.description}
              </Text>
            )}
            <Text
              fontFamily="mono"
              fontSize="10px"
              color="rgba(19,22,25,0.7)"
              mt={2}
            >
              Updated{" "}
              {formatDistanceToNow(new Date(dashboard.updated_at), {
                addSuffix: true,
              })}
            </Text>
          </Box>

          {isOwner && (
            <Flex gap={3} flexShrink={0}>
              <HeaderActionButton onClick={() => setShareOpen(true)}>
                <ShareNetworkIcon size={16} />
                Share
              </HeaderActionButton>
              <HeaderActionButton onClick={() => setConfirmDeleteOpen(true)}>
                <TrashIcon size={16} />
                Delete
              </HeaderActionButton>
            </Flex>
          )}
        </Flex>
      </Box>

      {/* White body — widget grid */}
      <Box px={{ base: 5, md: 8 }} py={{ base: 5, md: 8 }}>
        {widgets.length === 0 && !showEmptyBlock ? (
          <Flex
            direction="column"
            align="center"
            gap={2}
            py={16}
            borderWidth="2px"
            borderStyle="dashed"
            borderColor="border.emphasized"
            rounded="md"
            color="fg.muted"
          >
            <Text>This dashboard is empty.</Text>
            {isOwner && (
              <Text fontSize="sm">
                Describe what you want to explore in the chat, or add a block
                below.
              </Text>
            )}
          </Flex>
        ) : (
          <Grid templateColumns={{ base: "1fr", lg: "repeat(2, 1fr)" }} gap={4}>
            {widgets.map((widget, i) => (
              <GridItem
                key={widget.id}
                draggable={isOwner && grabbedId === widget.id}
                onDragStart={() => setDragIndex(i)}
                onDragOver={(e) => {
                  if (dragIndex === null) return;
                  e.preventDefault();
                  setOverIndex(i);
                }}
                onDrop={(e) => {
                  e.preventDefault();
                  handleDrop(i);
                }}
                onDragEnd={resetDrag}
                opacity={dragIndex === i ? 0.4 : 1}
                outline={
                  overIndex === i && dragIndex !== null && dragIndex !== i
                    ? "2px dashed"
                    : undefined
                }
                outlineColor="fg.link"
                outlineOffset="2px"
                rounded="md"
                position="relative"
                transition="opacity 0.1s ease"
                _hover={{ zIndex: 2 }}
              >
                <DashboardWidgetCard
                  widget={widget}
                  aois={dashboard.aois}
                  readOnly={!isOwner}
                  arrange={isOwner ? arrangeFor(widget.id) : undefined}
                  onRemove={() => removeWidget.mutate(widget.id)}
                  onUpdateText={(text) =>
                    // The API replaces config wholesale — merge client-side.
                    updateWidget.mutate({
                      widgetId: widget.id,
                      config: { ...widget.config, text },
                    })
                  }
                />
              </GridItem>
            ))}
            {showEmptyBlock && (
              <GridItem>
                <EmptyBlock
                  onDismiss={() => setShowEmptyBlock(false)}
                  onAskAi={() => {
                    requestFocus();
                    setShowEmptyBlock(false);
                  }}
                  onAddAnalysis={() => {
                    openSidePane("insights");
                    setShowEmptyBlock(false);
                  }}
                  onAddNote={() => {
                    addWidget.mutate({
                      widget_type: "text",
                      config: { text: "" },
                    });
                    setShowEmptyBlock(false);
                  }}
                />
              </GridItem>
            )}
          </Grid>
        )}

        {/* Add block — lime divider with a centered + (per design) */}
        {isOwner && !showEmptyBlock && (
          <Flex align="center" mt={6}>
            <Box flex="1" h="1px" bg="#E3F37F" />
            <Tooltip content="Add a block" showArrow>
              <IconButton
                aria-label="Add a block"
                size="xs"
                mx={3}
                rounded="4px"
                bg="#F0F9B9"
                color="#8E9954"
                _hover={{ bg: "#E3F37F" }}
                onClick={() => setShowEmptyBlock(true)}
              >
                <PlusIcon size={16} />
              </IconButton>
            </Tooltip>
            <Box flex="1" h="1px" bg="#E3F37F" />
          </Flex>
        )}
      </Box>

      {isOwner && (
        <>
          <DashboardShareDialog
            dashboard={dashboard}
            isOpen={shareOpen}
            onOpenChange={setShareOpen}
          />
          <ConfirmDialog
            title="Delete dashboard?"
            body={
              <p>
                This will permanently delete the dashboard{" "}
                <strong>{dashboard.name}</strong>. The insights it references
                are not deleted.
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
        </>
      )}
    </Box>
  );
}

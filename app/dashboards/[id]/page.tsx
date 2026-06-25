"use client";

import { useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import {
  Box,
  Container,
  Flex,
  Grid,
  GridItem,
  Heading,
  Text,
  Button,
  IconButton,
  Input,
  Center,
  Spinner,
} from "@chakra-ui/react";
import {
  PencilSimpleIcon,
  BellIcon,
  FilePdfIcon,
  ShareNetworkIcon,
  TrashIcon,
  PlusIcon,
  XIcon,
  SparkleIcon,
  ChartBarIcon,
  CaretLeftIcon,
  CheckIcon,
  ArrowsOutCardinalIcon,
  ArrowsOutIcon,
  ArrowsInIcon,
} from "@phosphor-icons/react";
import DashboardInsightCard from "@/app/dashboards/components/DashboardInsightCard";
import MapWidgetPlaceholder from "@/app/dashboards/components/MapWidgetPlaceholder";
import TextWidgetCard from "@/app/dashboards/components/TextWidgetCard";
import { Tooltip } from "@/app/components/ui/tooltip";
import useDashboardStore from "@/app/store/dashboardStore";
import useComposerStore from "@/app/dashboards/lib/composerStore";
import { formatUpdated } from "@/app/dashboards/lib/fixtures";
import { toaster } from "@/app/components/ui/toaster";
import type { DashboardWidget } from "@/app/types/dashboard";

const LOREM =
  "Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat.";

const stub = (action: string) =>
  toaster.create({
    title: `${action} — prototype`,
    description: "This action isn't wired up in the prototype.",
    type: "info",
    duration: 2500,
  });

interface ArrangeProps {
  onMouseDown?: () => void;
  onMouseUp?: () => void;
}

/** Titled card (map widget) with Arrange / Expand / Delete controls. */
function FrameCard({
  title,
  expanded,
  onToggleExpand,
  onDelete,
  arrange,
  children,
}: {
  title: string;
  expanded: boolean;
  onToggleExpand: () => void;
  onDelete: () => void;
  arrange: ArrangeProps;
  children: React.ReactNode;
}) {
  return (
    <Box
      rounded="md"
      border="1px solid"
      borderColor="blue.fg"
      overflow="hidden"
      bg="neutral.100"
      h="100%"
    >
      <Flex px={3} py={2} gap={1} bgGradient="LCLGradientLight" align="center">
        <Tooltip content="Drag to reorder" showArrow>
          <IconButton
            aria-label="Drag to reorder"
            size="2xs"
            variant="ghost"
            color="primary.fg"
            cursor="grab"
            onMouseDown={arrange.onMouseDown}
            onMouseUp={arrange.onMouseUp}
          >
            <ArrowsOutCardinalIcon size={14} />
          </IconButton>
        </Tooltip>
        <Heading
          size="xs"
          fontWeight="medium"
          color="primary.fg"
          m={0}
          flex={1}
          lineClamp={1}
        >
          {title}
        </Heading>
        <IconButton
          aria-label="Toggle width"
          size="2xs"
          variant="ghost"
          color="primary.fg"
          onClick={onToggleExpand}
        >
          {expanded ? <ArrowsInIcon size={14} /> : <ArrowsOutIcon size={14} />}
        </IconButton>
        <IconButton
          aria-label="Remove widget"
          size="2xs"
          variant="ghost"
          color="primary.fg"
          onClick={onDelete}
        >
          <TrashIcon size={14} />
        </IconButton>
      </Flex>
      <Box p={4}>{children}</Box>
    </Box>
  );
}

/** Placeholder block inserted by the "+" — choose what to put here. */
function EmptyBlock({
  onAskAi,
  onAddAnalysis,
  onAddNote,
  onDismiss,
  arrange,
}: {
  onAskAi: () => void;
  onAddAnalysis: () => void;
  onAddNote: () => void;
  onDismiss: () => void;
  arrange: ArrangeProps;
}) {
  const OPTIONS = [
    { label: "Ask AI", icon: SparkleIcon, onClick: onAskAi },
    { label: "Add an analysis", icon: ChartBarIcon, onClick: onAddAnalysis },
    { label: "Add note", icon: PencilSimpleIcon, onClick: onAddNote },
  ];
  return (
    <Box
      rounded="md"
      borderWidth="1px"
      borderStyle="dashed"
      borderColor="border.emphasized"
      bg="bg"
      h="100%"
      minH="160px"
      display="flex"
      flexDirection="column"
      p={3}
    >
      <Flex justify="space-between" align="center" color="neutral.500">
        <Tooltip content="Drag to reorder" showArrow>
          <IconButton
            aria-label="Drag to reorder"
            size="2xs"
            variant="ghost"
            cursor="grab"
            onMouseDown={arrange.onMouseDown}
            onMouseUp={arrange.onMouseUp}
          >
            <ArrowsOutCardinalIcon size={14} />
          </IconButton>
        </Tooltip>
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

export default function DashboardDetailPage() {
  const params = useParams();
  const rawId = params?.id;
  const dashboardId = Array.isArray(rawId) ? rawId[0] : (rawId ?? "");

  const hydrated = useDashboardStore((s) => s.hydrated);
  const dashboard = useDashboardStore((s) =>
    s.dashboards.find((d) => d.id === dashboardId)
  );
  const updateDashboard = useDashboardStore((s) => s.updateDashboard);
  const removeWidget = useDashboardStore((s) => s.removeWidget);
  const addWidget = useDashboardStore((s) => s.addWidget);
  const updateWidget = useDashboardStore((s) => s.updateWidget);
  const reorderWidgets = useDashboardStore((s) => s.reorderWidgets);
  const openAnalyses = useComposerStore((s) => s.openAnalyses);
  const requestFocus = useComposerStore((s) => s.requestFocus);

  const [editing, setEditing] = useState(false);
  const [draftTitle, setDraftTitle] = useState("");

  // Drag-to-reorder state.
  const [grabbedId, setGrabbedId] = useState<string | null>(null);
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [overIndex, setOverIndex] = useState<number | null>(null);
  const resetDrag = () => {
    setGrabbedId(null);
    setDragIndex(null);
    setOverIndex(null);
  };

  if (!hydrated) {
    return (
      <Center py={20}>
        <Spinner />
      </Center>
    );
  }

  if (!dashboard) {
    return (
      <Container maxW="6xl" py={10}>
        <Heading size="md" mb={2}>
          Dashboard not found
        </Heading>
        <Text color="fg.muted" mb={4}>
          This dashboard doesn&apos;t exist or was removed.
        </Text>
        <Button as={Link} {...{ href: "/dashboards" }} variant="outline">
          <CaretLeftIcon /> Back to dashboards
        </Button>
      </Container>
    );
  }

  const startEdit = () => {
    setDraftTitle(dashboard.title);
    setEditing(true);
  };
  const commitEdit = () => {
    if (draftTitle.trim())
      updateDashboard(dashboard.id, { title: draftTitle.trim() });
    setEditing(false);
  };

  const arrangeFor = (id: string): ArrangeProps => ({
    onMouseDown: () => setGrabbedId(id),
    onMouseUp: () => setGrabbedId(null),
  });

  const renderWidget = (wgt: DashboardWidget) => {
    const expanded = wgt.span === 2;
    const toggleExpand = () =>
      updateWidget(dashboard.id, wgt.id, { span: expanded ? 1 : 2 });
    const onDelete = () => removeWidget(dashboard.id, wgt.id);

    if (wgt.kind === "insight" && wgt.insight) {
      return (
        <DashboardInsightCard
          widget={wgt}
          expanded={expanded}
          onToggleExpand={toggleExpand}
          onDelete={onDelete}
          arrange={arrangeFor(wgt.id)}
          areaName={dashboard.subtitle ?? dashboard.title}
        />
      );
    }
    if (wgt.kind === "map" && wgt.map) {
      return (
        <FrameCard
          title={wgt.map.caption}
          expanded={expanded}
          onToggleExpand={toggleExpand}
          onDelete={onDelete}
          arrange={arrangeFor(wgt.id)}
        >
          <MapWidgetPlaceholder map={wgt.map} />
        </FrameCard>
      );
    }
    if (wgt.kind === "empty") {
      return (
        <EmptyBlock
          arrange={arrangeFor(wgt.id)}
          onDismiss={onDelete}
          onAskAi={() => {
            requestFocus();
            removeWidget(dashboard.id, wgt.id);
          }}
          onAddAnalysis={() => {
            openAnalyses();
            removeWidget(dashboard.id, wgt.id);
          }}
          onAddNote={() =>
            updateWidget(dashboard.id, wgt.id, { kind: "text", text: LOREM })
          }
        />
      );
    }
    return (
      <TextWidgetCard
        text={wgt.text ?? ""}
        expanded={expanded}
        onToggleExpand={toggleExpand}
        onChange={(next) => updateWidget(dashboard.id, wgt.id, { text: next })}
        onDelete={onDelete}
        arrange={arrangeFor(wgt.id)}
      />
    );
  };

  return (
    <Box bg="#F4F5F6" minH="100%" py={6}>
      <Container maxW="6xl">
        {/* Breadcrumb */}
        <Flex align="center" gap={1} fontSize="sm" color="fg.muted" mb={3}>
          <Box as={Link} {...{ href: "/dashboards" }} _hover={{ color: "fg" }}>
            Dashboards
          </Box>
          <Text>›</Text>
          <Text color="fg" lineClamp={1}>
            {dashboard.title}
          </Text>
        </Flex>

        {/* White content card — the blue top accent + grid come from the
            header-zone SVG background. */}
        <Box
          bg="bg"
          borderRadius="8px"
          borderWidth="1px"
          borderColor="rgba(19, 22, 25, 0.1)"
          overflow="hidden"
        >
          {/* Header zone — Rectangle 147753 background (grid + blue accent) */}
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
            {/* Eyebrow */}
            {dashboard.subtitle && (
              <Text fontSize="14px" color="#565E7B" mb={2}>
                {dashboard.subtitle}
              </Text>
            )}

            {/* Title bar */}
            <Flex
              justify="space-between"
              align="flex-start"
              gap={4}
              mb={4}
              flexWrap="wrap"
            >
              <Box minW={0}>
                {editing ? (
                  <Flex align="center" gap={2}>
                    <Input
                      value={draftTitle}
                      onChange={(e) => setDraftTitle(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") commitEdit();
                        if (e.key === "Escape") setEditing(false);
                      }}
                      size="lg"
                      fontSize="30px"
                      autoFocus
                      maxW="640px"
                    />
                    <IconButton
                      aria-label="Save title"
                      size="sm"
                      onClick={commitEdit}
                    >
                      <CheckIcon />
                    </IconButton>
                  </Flex>
                ) : (
                  <Flex align="center" gap={3}>
                    <Heading
                      fontSize="30px"
                      fontWeight="normal"
                      lineHeight="36px"
                      color="#131619"
                      lineClamp={2}
                    >
                      {dashboard.title}
                    </Heading>
                    <IconButton
                      aria-label="Edit title"
                      size="xs"
                      variant="ghost"
                      color="rgba(19,22,25,0.5)"
                      onClick={startEdit}
                    >
                      <PencilSimpleIcon size={20} />
                    </IconButton>
                  </Flex>
                )}
                <Text
                  fontFamily="mono"
                  fontSize="10px"
                  color="rgba(19,22,25,0.7)"
                  mt={2}
                >
                  {formatUpdated(dashboard.updatedAt)}
                </Text>
              </Box>

              <Flex gap={3} flexShrink={0}>
                {[
                  { label: "Subscribe to alerts", icon: BellIcon },
                  { label: "Export", icon: FilePdfIcon },
                  { label: "Share", icon: ShareNetworkIcon },
                ].map((a) => (
                  <Button
                    key={a.label}
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
                    onClick={() => stub(a.label)}
                  >
                    <a.icon size={16} />
                    {a.label}
                  </Button>
                ))}
              </Flex>
            </Flex>

            {/* Alert badge */}
            {dashboard.badge && (
              <Flex
                align="center"
                gap="4px"
                w="fit-content"
                bg="#FEF2F2"
                borderWidth="1px"
                borderColor="#F8BABA"
                rounded="4px"
                px="6px"
                py="2px"
                mb={6}
              >
                <Box w="6px" h="6px" rounded="full" bg="#EF4444" />
                <Text fontFamily="mono" fontSize="10px" color="#B91C1C">
                  {dashboard.badge}
                </Text>
              </Flex>
            )}
          </Box>

          {/* White body */}
          <Box px={{ base: 5, md: 8 }} py={{ base: 5, md: 8 }}>
            {/* Widget grid */}
            {dashboard.widgets.length === 0 ? (
              <Center
                flexDir="column"
                gap={2}
                py={16}
                borderWidth="2px"
                borderStyle="dashed"
                borderColor="border.emphasized"
                rounded="md"
                color="fg.muted"
              >
                <Text>This dashboard is empty.</Text>
                <Text fontSize="sm">
                  Use the assistant on the left, or add a widget below.
                </Text>
              </Center>
            ) : (
              <Grid
                templateColumns={{ base: "1fr", lg: "repeat(2, 1fr)" }}
                gap={4}
              >
                {dashboard.widgets.map((wgt, i) => (
                  <GridItem
                    key={wgt.id}
                    colSpan={wgt.span === 2 ? { base: 1, lg: 2 } : 1}
                    draggable={grabbedId === wgt.id}
                    onDragStart={() => setDragIndex(i)}
                    onDragOver={(e) => {
                      if (dragIndex === null) return;
                      e.preventDefault();
                      setOverIndex(i);
                    }}
                    onDrop={(e) => {
                      e.preventDefault();
                      if (dragIndex !== null && dragIndex !== i) {
                        reorderWidgets(dashboard.id, dragIndex, i);
                      }
                      resetDrag();
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
                    {renderWidget(wgt)}
                  </GridItem>
                ))}
              </Grid>
            )}

            {/* Add block — lime divider with a centered + (per design) */}
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
                  onClick={() =>
                    addWidget(dashboard.id, { kind: "empty", span: 1 })
                  }
                >
                  <PlusIcon size={16} />
                </IconButton>
              </Tooltip>
              <Box flex="1" h="1px" bg="#E3F37F" />
            </Flex>
          </Box>
        </Box>
      </Container>
    </Box>
  );
}

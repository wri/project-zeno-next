"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Box,
  Button,
  ButtonGroup,
  Container,
  Flex,
  Grid,
  Heading,
  Text,
  Badge,
  Icon,
  IconButton,
  Input,
  InputGroup,
  Menu,
  Portal,
  Table,
} from "@chakra-ui/react";
import {
  PlusIcon,
  GlobeIcon,
  LockIcon,
  SquaresFourIcon,
  ListIcon,
  MagnifyingGlassIcon,
  ArrowsDownUpIcon,
  XIcon,
} from "@phosphor-icons/react";
import useDashboardStore from "@/app/store/dashboardStore";
import { formatUpdated } from "@/app/dashboards/lib/fixtures";
import {
  TEMPLATES,
  type DashboardTemplate,
} from "@/app/dashboards/lib/templates";
import { Tooltip } from "@/app/components/ui/tooltip";
import AlertsBadge from "@/app/dashboards/components/AlertsBadge";
import DashboardActionsMenu from "@/app/dashboards/components/DashboardActionsMenu";
import type { Dashboard } from "@/app/types/dashboard";

// Soft cap surfaced as the "X / 20" counter next to the heading.
const DASHBOARD_LIMIT = 20;

const areaOf = (d: Dashboard) => d.subtitle ?? d.title;

// Leading integer in a badge like "3 new alerts" (0 when there's no badge).
function alertCountOf(d: Dashboard): number {
  const m = d.badge?.match(/\d+/);
  return m ? parseInt(m[0], 10) : 0;
}

type SortKey = "recent" | "name" | "alerts";
const SORTS: { key: SortKey; label: string }[] = [
  { key: "recent", label: "Last edited" },
  { key: "name", label: "Name (A–Z)" },
  { key: "alerts", label: "Most alerts" },
];

// ---------------------------------------------------------------------------
// Shared bits
// ---------------------------------------------------------------------------

/** Public/private icon with a tooltip — used in both views. */
function VisibilityIcon({ isPublic }: { isPublic?: boolean }) {
  return (
    <Tooltip content={isPublic ? "Public" : "Private"} showArrow>
      <Box
        as="span"
        display="inline-flex"
        color={isPublic ? "primary.solid" : "fg.muted"}
      >
        {isPublic ? <GlobeIcon size={16} /> : <LockIcon size={16} />}
      </Box>
    </Tooltip>
  );
}

/** Area name in a white pill — hugs its content so it doesn't pad out the row. */
function AreaPill({ name }: { name: string }) {
  return (
    <Box
      display="inline-flex"
      maxW="170px"
      bg="#FFFFFF"
      borderWidth="1px"
      borderColor="border"
      rounded="md"
      px={2}
      py="2px"
    >
      <Text fontSize="xs" color="fg" truncate>
        {name}
      </Text>
    </Box>
  );
}

/** Editable tag list — chips with a remove ×, plus an inline add input. */
function DashboardTags({ dashboard }: { dashboard: Dashboard }) {
  const updateDashboard = useDashboardStore((s) => s.updateDashboard);
  const tags = dashboard.tags ?? [];
  const [adding, setAdding] = useState(false);
  const [draft, setDraft] = useState("");

  const addTag = () => {
    const t = draft.trim();
    if (t && !tags.includes(t)) {
      updateDashboard(dashboard.id, { tags: [...tags, t] });
    }
    setDraft("");
    setAdding(false);
  };
  const removeTag = (t: string) =>
    updateDashboard(dashboard.id, { tags: tags.filter((x) => x !== t) });

  return (
    <Flex
      gap={1}
      flexWrap="wrap"
      align="center"
      onClick={(e) => e.stopPropagation()}
    >
      {tags.map((t) => (
        <Badge key={t} variant="surface" colorPalette="gray" size="sm" gap={1}>
          {t}
          <Box
            as="span"
            display="inline-flex"
            cursor="pointer"
            color="fg.muted"
            _hover={{ color: "fg" }}
            onClick={() => removeTag(t)}
          >
            <XIcon size={10} />
          </Box>
        </Badge>
      ))}
      {adding ? (
        <Input
          size="xs"
          autoFocus
          w="84px"
          placeholder="Tag…"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={addTag}
          onKeyDown={(e) => {
            if (e.key === "Enter") addTag();
            if (e.key === "Escape") {
              setDraft("");
              setAdding(false);
            }
          }}
        />
      ) : (
        <Tooltip content="Add tag" showArrow>
          <IconButton
            aria-label="Add tag"
            size="2xs"
            variant="ghost"
            color="fg.muted"
            onClick={() => setAdding(true)}
          >
            <PlusIcon size={12} />
          </IconButton>
        </Tooltip>
      )}
    </Flex>
  );
}

// Inline rename input reused by card + row. Commits on Enter/blur.
function useRename(dashboard: Dashboard) {
  const updateDashboard = useDashboardStore((s) => s.updateDashboard);
  const [renaming, setRenaming] = useState(false);
  const [draft, setDraft] = useState(dashboard.title);
  const start = () => {
    setDraft(dashboard.title);
    setRenaming(true);
  };
  const commit = () => {
    const t = draft.trim();
    if (t) updateDashboard(dashboard.id, { title: t });
    setRenaming(false);
  };
  return {
    renaming,
    draft,
    setDraft,
    start,
    commit,
    cancel: () => setRenaming(false),
  };
}

// ---------------------------------------------------------------------------
// Card view
// ---------------------------------------------------------------------------

function DashboardCard({ dashboard }: { dashboard: Dashboard }) {
  const router = useRouter();
  const rename = useRename(dashboard);

  return (
    <Box
      position="relative"
      display="flex"
      flexDirection="column"
      minH="220px"
      p={5}
      bg="bg"
      borderWidth="1px"
      borderColor="border"
      rounded="md"
      transition="box-shadow 0.15s ease, border-color 0.15s ease"
      cursor={rename.renaming ? "default" : "pointer"}
      onClick={
        rename.renaming
          ? undefined
          : () => router.push(`/dashboards/${dashboard.id}`)
      }
      _hover={{ boxShadow: "md", borderColor: "border.emphasized" }}
    >
      {/* Actions menu (kept out of the card's click target) */}
      <Box
        position="absolute"
        top={2}
        right={2}
        onClick={(e) => e.stopPropagation()}
      >
        <DashboardActionsMenu dashboard={dashboard} onRename={rename.start} />
      </Box>

      {rename.renaming ? (
        <Input
          value={rename.draft}
          autoFocus
          fontWeight="medium"
          pr={8}
          onClick={(e) => e.stopPropagation()}
          onChange={(e) => rename.setDraft(e.target.value)}
          onBlur={rename.commit}
          onKeyDown={(e) => {
            if (e.key === "Enter") rename.commit();
            if (e.key === "Escape") rename.cancel();
          }}
        />
      ) : (
        <Heading size="md" fontWeight="medium" lineClamp={4} pr={6}>
          {dashboard.title}
        </Heading>
      )}

      <Box mt="auto" pt={4}>
        {dashboard.badge && (
          <Box mb={2}>
            <AlertsBadge label={dashboard.badge} seed={dashboard.id} />
          </Box>
        )}
        <Box mb={2} onClick={(e) => e.stopPropagation()}>
          <DashboardTags dashboard={dashboard} />
        </Box>
        <Flex align="center" gap={2} color="fg.muted">
          <VisibilityIcon isPublic={dashboard.isPublic} />
          <Text fontSize="xs">{formatUpdated(dashboard.updatedAt)}</Text>
        </Flex>
      </Box>
    </Box>
  );
}

// ---------------------------------------------------------------------------
// List view
// ---------------------------------------------------------------------------

// Number of columns — kept in sync with the header + the colSpan rows below.
const LIST_COL_COUNT = 7;

/** Compact uppercase column header matching the prototype's table style. */
function HeadCell(props: React.ComponentProps<typeof Table.ColumnHeader>) {
  return (
    <Table.ColumnHeader
      fontSize="10px"
      fontFamily="mono"
      letterSpacing="0.5px"
      textTransform="uppercase"
      color="fg.muted"
      fontWeight="normal"
      {...props}
    />
  );
}

function DashboardListRow({ dashboard }: { dashboard: Dashboard }) {
  const router = useRouter();
  const rename = useRename(dashboard);

  return (
    <Table.Row
      bg="transparent"
      cursor={rename.renaming ? "default" : "pointer"}
      onClick={
        rename.renaming
          ? undefined
          : () => router.push(`/dashboards/${dashboard.id}`)
      }
      _hover={{ bg: "bg.subtle" }}
    >
      {/* Name — width:100% makes this column take the remaining space so the
          others shrink to their content. */}
      <Table.Cell width="100%">
        {rename.renaming ? (
          <Input
            value={rename.draft}
            autoFocus
            size="sm"
            maxW="320px"
            onClick={(e) => e.stopPropagation()}
            onChange={(e) => rename.setDraft(e.target.value)}
            onBlur={rename.commit}
            onKeyDown={(e) => {
              if (e.key === "Enter") rename.commit();
              if (e.key === "Escape") rename.cancel();
            }}
          />
        ) : (
          <Tooltip content={dashboard.title} showArrow openDelay={300}>
            <Text fontWeight="medium" lineClamp={1} maxW="420px">
              {dashboard.title}
            </Text>
          </Tooltip>
        )}
      </Table.Cell>

      {/* Area */}
      <Table.Cell>
        <AreaPill name={areaOf(dashboard)} />
      </Table.Cell>

      {/* New alerts */}
      <Table.Cell>
        {dashboard.badge && (
          <AlertsBadge label={dashboard.badge} seed={dashboard.id} />
        )}
      </Table.Cell>

      {/* Last edited */}
      <Table.Cell whiteSpace="nowrap" fontSize="xs" color="fg.muted">
        {formatUpdated(dashboard.updatedAt)}
      </Table.Cell>

      {/* Visibility */}
      <Table.Cell textAlign="center">
        <VisibilityIcon isPublic={dashboard.isPublic} />
      </Table.Cell>

      {/* Tags */}
      <Table.Cell>
        <DashboardTags dashboard={dashboard} />
      </Table.Cell>

      {/* Menu */}
      <Table.Cell textAlign="end" onClick={(e) => e.stopPropagation()}>
        <DashboardActionsMenu
          dashboard={dashboard}
          onRename={rename.start}
          size="2xs"
        />
      </Table.Cell>
    </Table.Row>
  );
}

function DashboardListView({
  dashboards,
  onNew,
  atCap,
}: {
  dashboards: Dashboard[];
  onNew: () => void;
  atCap: boolean;
}) {
  return (
    <Box
      bg="bg"
      borderWidth="1px"
      borderColor="border"
      rounded="md"
      overflow="hidden"
      mb={12}
    >
      <Table.Root variant="line" size="sm" bg="transparent">
        <Table.Header>
          <Table.Row bg="bg.subtle">
            <HeadCell width="100%">Name</HeadCell>
            <HeadCell>Area</HeadCell>
            <HeadCell>Alerts</HeadCell>
            <HeadCell whiteSpace="nowrap">Last edited</HeadCell>
            <HeadCell textAlign="center">Visibility</HeadCell>
            <HeadCell>Tags</HeadCell>
            <HeadCell />
          </Table.Row>
        </Table.Header>
        <Table.Body>
          {dashboards.length === 0 ? (
            <Table.Row bg="transparent">
              <Table.Cell
                colSpan={LIST_COL_COUNT}
                textAlign="center"
                color="fg.muted"
                py={8}
              >
                No dashboards match your search.
              </Table.Cell>
            </Table.Row>
          ) : (
            dashboards.map((d) => <DashboardListRow key={d.id} dashboard={d} />)
          )}

          {/* New dashboard row — spans all columns */}
          <Table.Row bg="transparent">
            <Table.Cell colSpan={LIST_COL_COUNT} p={0}>
              <Box
                as="button"
                onClick={atCap ? undefined : onNew}
                display="flex"
                alignItems="center"
                gap={2}
                w="full"
                px={4}
                py={3}
                color="fg.muted"
                opacity={atCap ? 0.5 : 1}
                cursor={atCap ? "not-allowed" : "pointer"}
                transition="background 0.15s ease, color 0.15s ease"
                _hover={atCap ? undefined : { bg: "bg.subtle", color: "fg" }}
              >
                <PlusIcon size={16} />
                <Text fontWeight="medium">New dashboard</Text>
              </Box>
            </Table.Cell>
          </Table.Row>
        </Table.Body>
      </Table.Root>
    </Box>
  );
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function DashboardsGalleryPage() {
  const router = useRouter();
  const dashboards = useDashboardStore((s) => s.dashboards);
  const createDashboard = useDashboardStore((s) => s.createDashboard);
  const addWidget = useDashboardStore((s) => s.addWidget);

  const [view, setView] = useState<"card" | "list">("card");
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<SortKey>("recent");

  const atCap = dashboards.length >= DASHBOARD_LIMIT;

  const startBlank = () => {
    if (atCap) return;
    const id = createDashboard({ title: "Untitled dashboard" });
    router.push(`/dashboards/${id}`);
  };

  const startFromTemplate = (template: DashboardTemplate) => {
    const id = createDashboard({ title: template.title });
    template.widgets.forEach((wgt) => addWidget(id, wgt));
    router.push(`/dashboards/${id}`);
  };

  // Search + sort only drive the list view (card view shows everything).
  const listDashboards = useMemo(() => {
    const q = query.trim().toLowerCase();
    const filtered = q
      ? dashboards.filter((d) =>
          [d.title, areaOf(d), ...(d.tags ?? [])]
            .join(" ")
            .toLowerCase()
            .includes(q)
        )
      : dashboards;
    const sorted = [...filtered];
    if (sort === "name") {
      sorted.sort((a, b) => a.title.localeCompare(b.title));
    } else if (sort === "alerts") {
      sorted.sort(
        (a, b) =>
          alertCountOf(b) - alertCountOf(a) ||
          b.updatedAt.localeCompare(a.updatedAt)
      );
    } else {
      sorted.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
    }
    return sorted;
  }, [dashboards, query, sort]);

  const sortLabel = SORTS.find((s) => s.key === sort)?.label ?? "Sort";

  return (
    <Container maxW="6xl" py={10}>
      {/* Header: title + counter + view switcher */}
      <Flex align="center" justify="space-between" gap={3} mb={5} wrap="wrap">
        {/* Counter is an inline child of the heading with verticalAlign middle,
            so it centers against the heading's x-height (its optical centre)
            using the heading's own font metrics — not the line-box centre,
            which leading asymmetry pushes below the visible glyphs. */}
        <Heading size="lg" lineHeight="1">
          My dashboards
          <Badge
            as="span"
            verticalAlign="middle"
            ml={3}
            variant="surface"
            colorPalette="gray"
            rounded="full"
            px={2.5}
            py={1}
            fontSize="sm"
            fontWeight="medium"
          >
            {dashboards.length} / {DASHBOARD_LIMIT}
          </Badge>
        </Heading>
        <ButtonGroup size="sm" variant="outline" attached>
          <Button
            aria-label="Card view"
            onClick={() => setView("card")}
            variant={view === "card" ? "solid" : "outline"}
            colorPalette={view === "card" ? "primary" : undefined}
          >
            <SquaresFourIcon size={16} />
          </Button>
          <Button
            aria-label="List view"
            onClick={() => setView("list")}
            variant={view === "list" ? "solid" : "outline"}
            colorPalette={view === "list" ? "primary" : undefined}
          >
            <ListIcon size={16} />
          </Button>
        </ButtonGroup>
      </Flex>

      {/* Search + sort (list view only) */}
      {view === "list" && (
        <Flex gap={3} mb={3} wrap="wrap" align="center">
          <InputGroup
            flex="1 1 280px"
            maxW="420px"
            startElement={<MagnifyingGlassIcon size={16} />}
          >
            <Input
              size="sm"
              placeholder="Search dashboards…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </InputGroup>
          <Menu.Root positioning={{ placement: "bottom-end" }}>
            <Menu.Trigger asChild>
              <Button size="sm" variant="outline">
                <ArrowsDownUpIcon size={16} />
                {sortLabel}
              </Button>
            </Menu.Trigger>
            <Portal>
              <Menu.Positioner>
                <Menu.Content minW="160px">
                  {SORTS.map((s) => (
                    <Menu.Item
                      key={s.key}
                      value={s.key}
                      onClick={() => setSort(s.key)}
                      fontWeight={sort === s.key ? "semibold" : "normal"}
                    >
                      {s.label}
                    </Menu.Item>
                  ))}
                </Menu.Content>
              </Menu.Positioner>
            </Portal>
          </Menu.Root>
        </Flex>
      )}

      {/* My dashboards */}
      {view === "list" ? (
        <DashboardListView
          dashboards={listDashboards}
          onNew={startBlank}
          atCap={atCap}
        />
      ) : (
        <Grid
          templateColumns={{
            base: "1fr",
            sm: "repeat(2, 1fr)",
            lg: "repeat(4, 1fr)",
          }}
          gap={4}
          mb={12}
        >
          {dashboards.map((d) => (
            <DashboardCard key={d.id} dashboard={d} />
          ))}

          {/* New dashboard */}
          <Box
            as="button"
            onClick={atCap ? undefined : startBlank}
            display="flex"
            flexDirection="column"
            alignItems="center"
            justifyContent="center"
            gap={2}
            minH="220px"
            bg="#F7F9FF"
            borderWidth="1px"
            borderStyle="dashed"
            borderColor="#8EA5EA"
            rounded="8px"
            color="#0049AA"
            opacity={atCap ? 0.5 : 1}
            cursor={atCap ? "not-allowed" : "pointer"}
            transition="background 0.15s ease, color 0.15s ease"
            _hover={atCap ? undefined : { bg: "#EEF2FF" }}
          >
            <Icon as={PlusIcon} boxSize={6} />
            <Text fontWeight="medium">New dashboard</Text>
          </Box>
        </Grid>
      )}

      {/* Start from a template */}
      <Heading size="lg" mb={1}>
        Start from a template
      </Heading>
      <Text color="fg.muted" mb={5}>
        Templates guide you through common analysis workflows with prebuilt
        datasets and prompts.
      </Text>
      <Grid
        templateColumns={{
          base: "1fr",
          sm: "repeat(2, 1fr)",
          lg: "repeat(4, 1fr)",
        }}
        gap={4}
      >
        {TEMPLATES.map((t) => (
          <Box
            key={t.key}
            as="button"
            onClick={() => startFromTemplate(t)}
            textAlign="left"
            bg={t.theme.bg}
            borderWidth="1px"
            borderColor={t.theme.border}
            rounded="md"
            overflow="hidden"
            transition="box-shadow 0.15s ease, transform 0.15s ease"
            _hover={{ boxShadow: "md", transform: "translateY(-2px)" }}
          >
            <Box
              h="128px"
              bgImage={`url('${t.image}')`}
              bgSize="cover"
              bgPos="center"
            />
            <Box p={4}>
              <Text
                fontSize="xs"
                textTransform="uppercase"
                color={t.theme.eyebrow}
                mb={1}
              >
                Template
              </Text>
              <Text fontWeight="medium" lineClamp={3} color={t.theme.fg}>
                {t.label}
              </Text>
            </Box>
          </Box>
        ))}
      </Grid>
    </Container>
  );
}

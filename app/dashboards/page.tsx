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
} from "@chakra-ui/react";
import {
  PlusIcon,
  BellIcon,
  ChartLineIcon,
  FireIcon,
  GlobeIcon,
  LockIcon,
  SquaresFourIcon,
  ListIcon,
  MagnifyingGlassIcon,
  ArrowsDownUpIcon,
  XIcon,
} from "@phosphor-icons/react";
import useDashboardStore from "@/app/store/dashboardStore";
import { formatUpdated, WIDGET_FIXTURES } from "@/app/dashboards/lib/fixtures";
import { Tooltip } from "@/app/components/ui/tooltip";
import AlertsBadge from "@/app/dashboards/components/AlertsBadge";
import DashboardActionsMenu from "@/app/dashboards/components/DashboardActionsMenu";
import type { Dashboard, DashboardWidget } from "@/app/types/dashboard";

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

// Grid template shared by the list header row and each list row so columns
// align: Name | Area | Alerts | Last edited | Visibility | Tags | Menu.
// Area is `auto` so it hugs the area-name pill instead of padding out the row.
const LIST_COLS =
  "minmax(160px,1.8fr) auto 116px 130px 70px minmax(120px,1.2fr) 36px";

// ---------------------------------------------------------------------------
// Templates — clicking one seeds a new dashboard and opens it immediately.
// ---------------------------------------------------------------------------

interface Template {
  key: string;
  label: string;
  description: string;
  accent: string;
  icon: React.ElementType;
  title: string;
  widgets: Omit<DashboardWidget, "id">[];
}

const TEMPLATES: Template[] = [
  {
    key: "alerts",
    label: "Track alerts",
    description: "Near-real-time alerts for my areas of interest",
    accent: "green.500",
    icon: BellIcon,
    title: "Near-real-time alerts",
    widgets: [
      {
        kind: "text",
        span: 2,
        text: "Monitor disturbance alerts across your areas of interest. New alerts from the last three months are highlighted on the map below.",
      },
      {
        kind: "map",
        span: 2,
        map: {
          caption: "Disturbance alerts — last 3 months",
          alertCount: 200,
          insetTitle: "Global all ecosystem disturbance alerts",
        },
      },
    ],
  },
  {
    key: "emissions",
    label: "Monitor emissions",
    description: "Emissions and carbon flux over time",
    accent: "blue.500",
    icon: ChartLineIcon,
    title: "Emissions over time",
    widgets: [
      {
        kind: "text",
        span: 2,
        text: "Track carbon emissions from land use across the selected area over the past decade.",
      },
      {
        kind: "insight",
        span: 1,
        verified: true,
        insight: WIDGET_FIXTURES.emissionsLine,
      },
      {
        kind: "insight",
        span: 1,
        verified: true,
        insight: WIDGET_FIXTURES.driversPie,
      },
    ],
  },
  {
    key: "event",
    label: "Assess an event",
    description: "Impact of a recent fire, storm, or clearing",
    accent: "orange.500",
    icon: FireIcon,
    title: "Recent event impact",
    widgets: [
      {
        kind: "text",
        span: 2,
        text: "Assess the impact of a recent disturbance event on tree cover and emissions.",
      },
      {
        kind: "insight",
        span: 1,
        verified: true,
        insight: WIDGET_FIXTURES.treeCoverLine,
      },
      {
        kind: "map",
        span: 1,
        map: { caption: "Affected area", alertCount: 120 },
      },
    ],
  },
  {
    key: "compare",
    label: "Compare regions",
    description: "Deforestation across countries and regions",
    accent: "purple.500",
    icon: GlobeIcon,
    title: "Compare deforestation",
    widgets: [
      {
        kind: "text",
        span: 2,
        text: "Compare tree cover loss across countries and rank the worst-affected regions.",
      },
      {
        kind: "insight",
        span: 1,
        verified: true,
        insight: WIDGET_FIXTURES.tclBar,
      },
      {
        kind: "insight",
        span: 1,
        verified: false,
        insight: WIDGET_FIXTURES.tclTable,
      },
    ],
  },
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

function DashboardListRow({ dashboard }: { dashboard: Dashboard }) {
  const router = useRouter();
  const rename = useRename(dashboard);

  return (
    <Box
      display="grid"
      gridTemplateColumns={LIST_COLS}
      alignItems="center"
      gap={3}
      px={4}
      py={2.5}
      borderBottomWidth="1px"
      borderColor="border"
      cursor={rename.renaming ? "default" : "pointer"}
      onClick={
        rename.renaming
          ? undefined
          : () => router.push(`/dashboards/${dashboard.id}`)
      }
      _hover={{ bg: "bg.subtle" }}
    >
      {/* Name */}
      <Flex minW={0} align="center" gap={2}>
        {rename.renaming ? (
          <Input
            value={rename.draft}
            autoFocus
            size="sm"
            onClick={(e) => e.stopPropagation()}
            onChange={(e) => rename.setDraft(e.target.value)}
            onBlur={rename.commit}
            onKeyDown={(e) => {
              if (e.key === "Enter") rename.commit();
              if (e.key === "Escape") rename.cancel();
            }}
          />
        ) : (
          <Text fontWeight="medium" lineClamp={1}>
            {dashboard.title}
          </Text>
        )}
      </Flex>

      {/* Area */}
      <Box minW={0}>
        <AreaPill name={areaOf(dashboard)} />
      </Box>

      {/* New alerts */}
      <Box>
        {dashboard.badge && (
          <AlertsBadge label={dashboard.badge} seed={dashboard.id} />
        )}
      </Box>

      {/* Last edited */}
      <Text fontSize="xs" color="fg.muted">
        {formatUpdated(dashboard.updatedAt)}
      </Text>

      {/* Visibility */}
      <Flex justify="center">
        <VisibilityIcon isPublic={dashboard.isPublic} />
      </Flex>

      {/* Tags */}
      <DashboardTags dashboard={dashboard} />

      {/* Menu */}
      <Box onClick={(e) => e.stopPropagation()} justifySelf="end">
        <DashboardActionsMenu
          dashboard={dashboard}
          onRename={rename.start}
          size="2xs"
        />
      </Box>
    </Box>
  );
}

function ListHeaderCell({
  children,
  ...rest
}: React.ComponentProps<typeof Text>) {
  return (
    <Text
      fontSize="10px"
      fontFamily="mono"
      letterSpacing="0.5px"
      textTransform="uppercase"
      color="fg.muted"
      {...rest}
    >
      {children}
    </Text>
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
      borderWidth="1px"
      borderColor="border"
      rounded="md"
      overflow="hidden"
      mb={12}
    >
      {/* Column headers */}
      <Box
        display="grid"
        gridTemplateColumns={LIST_COLS}
        gap={3}
        px={4}
        py={2}
        bg="bg.subtle"
        borderBottomWidth="1px"
        borderColor="border"
      >
        <ListHeaderCell>Name</ListHeaderCell>
        <ListHeaderCell>Area</ListHeaderCell>
        <ListHeaderCell>Alerts</ListHeaderCell>
        <ListHeaderCell>Last edited</ListHeaderCell>
        <ListHeaderCell textAlign="center">Visibility</ListHeaderCell>
        <ListHeaderCell>Tags</ListHeaderCell>
        <Box />
      </Box>

      {dashboards.length === 0 ? (
        <Box px={4} py={8} textAlign="center" color="fg.muted">
          No dashboards match your search.
        </Box>
      ) : (
        dashboards.map((d) => <DashboardListRow key={d.id} dashboard={d} />)
      )}

      {/* New dashboard row */}
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

  const startFromTemplate = (template: Template) => {
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
      <Flex align="center" gap={3} mb={5} wrap="wrap">
        <Heading size="lg" lineHeight="1">
          My dashboards
        </Heading>
        <Badge
          variant="surface"
          colorPalette="gray"
          rounded="full"
          px={2.5}
          py={1}
        >
          {dashboards.length} / {DASHBOARD_LIMIT}
        </Badge>
        <ButtonGroup ml="auto" size="sm" variant="outline" attached>
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
            bg="bg"
            borderWidth="2px"
            borderStyle="dashed"
            borderColor="border.emphasized"
            rounded="md"
            color="fg.muted"
            opacity={atCap ? 0.5 : 1}
            cursor={atCap ? "not-allowed" : "pointer"}
            transition="background 0.15s ease, color 0.15s ease"
            _hover={atCap ? undefined : { bg: "bg.subtle", color: "fg" }}
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
            bg="bg"
            borderWidth="1px"
            borderColor="border"
            rounded="md"
            overflow="hidden"
            transition="box-shadow 0.15s ease, border-color 0.15s ease"
            _hover={{ boxShadow: "md", borderColor: "border.emphasized" }}
          >
            <Flex h="96px" bg={t.accent} align="center" justify="center">
              <Icon as={t.icon} boxSize={8} color="white" />
            </Flex>
            <Box p={4}>
              <Text
                fontSize="xs"
                textTransform="uppercase"
                color="fg.muted"
                mb={1}
              >
                Template
              </Text>
              <Text fontWeight="medium" lineClamp={3}>
                {t.description}
              </Text>
            </Box>
          </Box>
        ))}
      </Grid>
    </Container>
  );
}

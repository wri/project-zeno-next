"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Box,
  Container,
  Flex,
  Grid,
  Heading,
  Text,
  Badge,
  Icon,
  IconButton,
  Input,
  Menu,
  Portal,
} from "@chakra-ui/react";
import {
  PlusIcon,
  BellIcon,
  ChartLineIcon,
  FireIcon,
  GlobeIcon,
  DotsThreeVerticalIcon,
  PencilSimpleIcon,
  TrashIcon,
} from "@phosphor-icons/react";
import useDashboardStore from "@/app/store/dashboardStore";
import { formatUpdated, WIDGET_FIXTURES } from "@/app/dashboards/lib/fixtures";
import type { Dashboard, DashboardWidget } from "@/app/types/dashboard";

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
// Cards
// ---------------------------------------------------------------------------

function DashboardCard({ dashboard }: { dashboard: Dashboard }) {
  const router = useRouter();
  const updateDashboard = useDashboardStore((s) => s.updateDashboard);
  const deleteDashboard = useDashboardStore((s) => s.deleteDashboard);
  const [renaming, setRenaming] = useState(false);
  const [draft, setDraft] = useState(dashboard.title);

  const commitRename = () => {
    const t = draft.trim();
    if (t) updateDashboard(dashboard.id, { title: t });
    setRenaming(false);
  };

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
      cursor={renaming ? "default" : "pointer"}
      onClick={
        renaming ? undefined : () => router.push(`/dashboards/${dashboard.id}`)
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
        <Menu.Root positioning={{ placement: "bottom-end" }}>
          <Menu.Trigger asChild>
            <IconButton
              aria-label="Dashboard actions"
              size="xs"
              variant="ghost"
              color="fg.muted"
            >
              <DotsThreeVerticalIcon size={16} />
            </IconButton>
          </Menu.Trigger>
          <Portal>
            <Menu.Positioner>
              <Menu.Content minW="140px">
                <Menu.Item
                  value="rename"
                  onClick={() => {
                    setDraft(dashboard.title);
                    setRenaming(true);
                  }}
                >
                  <PencilSimpleIcon size={14} />
                  Rename
                </Menu.Item>
                <Menu.Item
                  value="delete"
                  color="fg.error"
                  _hover={{ bg: "bg.error", color: "fg.error" }}
                  onClick={() => deleteDashboard(dashboard.id)}
                >
                  <TrashIcon size={14} />
                  Delete
                </Menu.Item>
              </Menu.Content>
            </Menu.Positioner>
          </Portal>
        </Menu.Root>
      </Box>

      {renaming ? (
        <Input
          value={draft}
          autoFocus
          fontWeight="medium"
          pr={8}
          onClick={(e) => e.stopPropagation()}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={commitRename}
          onKeyDown={(e) => {
            if (e.key === "Enter") commitRename();
            if (e.key === "Escape") setRenaming(false);
          }}
        />
      ) : (
        <Heading size="md" fontWeight="medium" lineClamp={4} pr={6}>
          {dashboard.title}
        </Heading>
      )}

      <Box mt="auto" pt={4}>
        {dashboard.badge && (
          <Badge colorPalette="red" variant="subtle" mb={2}>
            {dashboard.badge}
          </Badge>
        )}
        <Text fontSize="xs" color="fg.muted">
          {formatUpdated(dashboard.updatedAt)}
        </Text>
      </Box>
    </Box>
  );
}

export default function DashboardsGalleryPage() {
  const router = useRouter();
  const dashboards = useDashboardStore((s) => s.dashboards);
  const createDashboard = useDashboardStore((s) => s.createDashboard);
  const addWidget = useDashboardStore((s) => s.addWidget);

  const startBlank = () => {
    const id = createDashboard({ title: "Untitled dashboard" });
    router.push(`/dashboards/${id}`);
  };

  const startFromTemplate = (template: Template) => {
    const id = createDashboard({ title: template.title });
    template.widgets.forEach((wgt) => addWidget(id, wgt));
    router.push(`/dashboards/${id}`);
  };

  return (
    <Container maxW="6xl" py={10}>
      {/* My dashboards */}
      <Heading size="lg" mb={5}>
        My dashboards
      </Heading>
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
          onClick={startBlank}
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
          transition="background 0.15s ease, color 0.15s ease"
          _hover={{ bg: "bg.subtle", color: "fg" }}
        >
          <Icon as={PlusIcon} boxSize={6} />
          <Text fontWeight="medium">New dashboard</Text>
        </Box>
      </Grid>

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

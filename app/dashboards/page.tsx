"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Box,
  Container,
  Flex,
  Grid,
  Heading,
  Icon,
  Input,
  Skeleton,
  Text,
} from "@chakra-ui/react";
import {
  GlobeIcon,
  LockIcon,
  PlusIcon,
  PolygonIcon,
} from "@phosphor-icons/react";
import { formatDistanceToNow } from "date-fns";

import { Tooltip } from "@/app/components/ui/tooltip";
import DashboardActionsMenu from "@/app/components/dashboards/DashboardActionsMenu";
import {
  useDashboardsList,
  useRenameDashboard,
} from "@/app/hooks/useDashboards";
import type { Dashboard } from "@/app/schemas/api/dashboards/get";

/** Public/private icon with a tooltip. */
function VisibilityIcon({ isPublic }: { isPublic: boolean }) {
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

/** Map-like thumbnail strip across the top of a dashboard card (placeholder —
 *  no per-dashboard basemap snapshot yet). */
function CardThumb() {
  return (
    <Box
      h="120px"
      position="relative"
      flexShrink={0}
      bgGradient="to-br"
      gradientFrom="green.100"
      gradientTo="blue.100"
    >
      <Box
        position="absolute"
        inset={0}
        bgImage="url('/contour-texture.png')"
        bgSize="cover"
        bgPos="center"
        opacity={0.35}
      />
    </Box>
  );
}

function DashboardCard({ dashboard }: { dashboard: Dashboard }) {
  const router = useRouter();
  const renameDashboard = useRenameDashboard(dashboard.id);
  const [renaming, setRenaming] = useState(false);
  const [draft, setDraft] = useState(dashboard.name);

  const startRename = () => {
    setDraft(dashboard.name);
    setRenaming(true);
  };
  const commitRename = () => {
    const name = draft.trim();
    if (name && name !== dashboard.name) renameDashboard.mutate({ name });
    setRenaming(false);
  };

  const areaName = dashboard.aois?.[0]?.name;

  return (
    <Box
      position="relative"
      display="flex"
      flexDirection="column"
      minH="260px"
      bg="bg"
      borderWidth="1px"
      borderColor="border"
      rounded="md"
      overflow="hidden"
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
        zIndex={1}
        onClick={(e) => e.stopPropagation()}
      >
        <DashboardActionsMenu dashboard={dashboard} onRename={startRename} />
      </Box>

      <CardThumb />

      <Flex direction="column" flex="1" p={4}>
        {/* Area label */}
        {areaName && (
          <Flex align="center" gap={1} color="primary.fg" mb={1}>
            <PolygonIcon size={14} />
            <Text fontSize="xs" fontWeight="medium" lineClamp={1}>
              {areaName}
            </Text>
          </Flex>
        )}

        {/* Title */}
        {renaming ? (
          <Input
            value={draft}
            autoFocus
            fontWeight="medium"
            onClick={(e) => e.stopPropagation()}
            onChange={(e) => setDraft(e.target.value)}
            onBlur={commitRename}
            onKeyDown={(e) => {
              if (e.key === "Enter") commitRename();
              if (e.key === "Escape") setRenaming(false);
            }}
          />
        ) : (
          <Heading size="sm" fontWeight="medium" lineClamp={3}>
            {dashboard.name}
          </Heading>
        )}

        {/* Footer: visibility + updated */}
        <Flex mt="auto" pt={4} align="center" gap={2} color="fg.muted">
          <VisibilityIcon isPublic={dashboard.is_public} />
          <Text fontSize="xs">
            Updated{" "}
            {formatDistanceToNow(new Date(dashboard.updated_at), {
              addSuffix: true,
            })}
          </Text>
        </Flex>
      </Flex>
    </Box>
  );
}

/** Dashed "start a new dashboard" tile closing the card grid. */
function NewDashboardCard({ minH = "260px" }: { minH?: string }) {
  const router = useRouter();
  return (
    <Box
      as="button"
      onClick={() => router.push("/dashboards/new")}
      display="flex"
      flexDirection="column"
      alignItems="center"
      justifyContent="center"
      gap={2}
      minH={minH}
      bg="bg.subtle"
      borderWidth="1px"
      borderStyle="dashed"
      borderColor="primary.muted"
      rounded="md"
      color="primary.fg"
      cursor="pointer"
      transition="background 0.15s ease, color 0.15s ease"
      _hover={{ bg: "primary.subtle" }}
    >
      <Icon as={PlusIcon} boxSize={6} />
      <Text fontWeight="medium">New dashboard</Text>
    </Box>
  );
}

const CARD_GRID_COLUMNS = {
  base: "1fr",
  sm: "repeat(2, 1fr)",
  lg: "repeat(4, 1fr)",
};

export default function DashboardsGalleryPage() {
  const { dashboards, isLoading } = useDashboardsList();

  return (
    <Container maxW="6xl" py={10} h="100%" overflowY="auto">
      <Heading size="lg" mb={5}>
        My dashboards
      </Heading>

      {isLoading ? (
        <Grid templateColumns={CARD_GRID_COLUMNS} gap={4}>
          {[0, 1, 2, 3].map((i) => (
            <Skeleton key={i} minH="260px" rounded="md" />
          ))}
        </Grid>
      ) : (
        <>
          {!dashboards?.length && (
            <Text color="fg.muted" mb={5}>
              No dashboards yet. Start one from an area you care about — you can
              then add analyses, maps and notes, or ask the AI assistant to
              build it out for you.
            </Text>
          )}
          <Grid templateColumns={CARD_GRID_COLUMNS} gap={4}>
            {dashboards?.map((dashboard) => (
              <DashboardCard key={dashboard.id} dashboard={dashboard} />
            ))}
            <NewDashboardCard minH={dashboards?.length ? "260px" : "180px"} />
          </Grid>
        </>
      )}
    </Container>
  );
}

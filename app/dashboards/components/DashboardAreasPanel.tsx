"use client";

import { useMemo, useState } from "react";
import { usePathname } from "next/navigation";
import {
  Box,
  Flex,
  Text,
  Input,
  InputGroup,
  IconButton,
  Spinner,
} from "@chakra-ui/react";
import {
  PolygonIcon,
  MagnifyingGlassIcon,
  XIcon,
  MapPinAreaIcon,
} from "@phosphor-icons/react";
import { chatPanelCardStyle } from "@/app/chatPanelShared";
import useDashboardStore from "@/app/store/dashboardStore";
import { useCustomAreasList } from "@/app/hooks/useCustomAreasList";
import type { CustomArea } from "@/app/schemas/api/custom_areas/get";
import { GADM_AREAS } from "@/app/dashboards/lib/gadmAreas";

// Areas panel for the new-dashboard setup flow. A source toggle switches
// between the user's real saved areas ("My areas" — GET /api/custom_areas, the
// same source the map's "areas" context menu uses) and GADM admin areas
// (countries / regions). GADM is a static prototype list for now (see
// lib/gadmAreas.ts) standing in for a real name search.
//
// Selecting an area sets the dashboard's subtitle (and title, if still the
// default "Untitled dashboard"), which the detail page reads to flip from the
// skeleton + Areas pane to the empty-dashboard state + Analyses pane.

// Kept in sync with page.tsx's startBlank() default title.
const DEFAULT_TITLE = "Untitled dashboard";

const MONTHS = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

function formatCreated(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "Custom area";
  return `Created ${MONTHS[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}`;
}

/** Map-pin thumbnail strip down the left of each area card. */
function Thumb() {
  return (
    <Flex
      w="64px"
      flexShrink={0}
      align="center"
      justify="center"
      alignSelf="stretch"
      bgGradient="to-br"
      gradientFrom="blue.100"
      gradientTo="green.100"
      color="fg.link"
      borderRightWidth="1px"
      borderColor="rgba(19,22,25,0.1)"
    >
      <MapPinAreaIcon size={24} />
    </Flex>
  );
}

function AreaCard({
  name,
  subtitle,
  selected,
  onSelect,
}: {
  name: string;
  subtitle: string;
  selected: boolean;
  onSelect: () => void;
}) {
  return (
    <Box
      as="button"
      onClick={onSelect}
      textAlign="left"
      w="full"
      borderWidth="1px"
      borderColor={selected ? "#0049AA" : "#DDE2F5"}
      bg={selected ? "#DDE2F5" : "#FFFFFF"}
      rounded="4px"
      overflow="hidden"
      cursor="pointer"
      transition="border-color 0.15s ease, background 0.15s ease"
      _hover={selected ? undefined : { bg: "#F0F4FF", borderColor: "#0049AA" }}
    >
      <Flex align="stretch">
        <Thumb />
        <Flex flex="1 1 auto" minW={0} direction="column" px={4} py={3} gap={1}>
          <Text
            fontWeight="medium"
            fontSize="12px"
            lineHeight="1.5"
            color="#3A4048"
            lineClamp={2}
          >
            {name}
          </Text>
          <Text fontFamily="mono" fontSize="10px" color="#656E7B" lineClamp={1}>
            {subtitle}
          </Text>
        </Flex>
      </Flex>
    </Box>
  );
}

type Source = "mine" | "gadm";

/** Rounded source toggle, matching the Analyses panel's filter pills. */
function SourcePill({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <Box
      as="button"
      onClick={onClick}
      px="8px"
      py="4px"
      rounded="full"
      fontSize="12px"
      fontWeight="500"
      lineHeight="16px"
      cursor="pointer"
      borderWidth="1px"
      bg={active ? "#0049AA" : "#F4F5F6"}
      borderColor={active ? "#0049AA" : "#E0E2E5"}
      color={active ? "#FFFFFF" : "#3A4048"}
      _hover={active ? undefined : { bg: "#ECEEF0" }}
    >
      {children}
    </Box>
  );
}

export default function DashboardAreasPanel({
  onClose,
}: {
  onClose: () => void;
}) {
  const pathname = usePathname() ?? "";
  const match = pathname.match(/^\/dashboards\/(.+?)\/?$/);
  const dashboardId = match ? decodeURIComponent(match[1]) : null;

  const dashboard = useDashboardStore((s) =>
    s.dashboards.find((d) => d.id === dashboardId)
  );
  const updateDashboard = useDashboardStore((s) => s.updateDashboard);

  const { customAreas, isLoading, error } = useCustomAreasList();
  const [query, setQuery] = useState("");
  // Default to GADM so the pane is populated even without a backend session
  // (custom areas need one); "My areas" is one tap away.
  const [source, setSource] = useState<Source>("gadm");

  const areas = useMemo(() => {
    const list = (customAreas as CustomArea[] | undefined) ?? [];
    const q = query.trim().toLowerCase();
    const filtered = q
      ? list.filter((a) => a.name.toLowerCase().includes(q))
      : list;
    return [...filtered].sort(
      (a, b) => Number(new Date(b.created_at)) - Number(new Date(a.created_at))
    );
  }, [customAreas, query]);

  const gadmAreas = useMemo(() => {
    const q = query.trim().toLowerCase();
    return q
      ? GADM_AREAS.filter((a) => a.name.toLowerCase().includes(q))
      : GADM_AREAS;
  }, [query]);

  const selectArea = (name: string) => {
    if (!dashboardId) return;
    updateDashboard(dashboardId, {
      subtitle: name,
      ...(dashboard?.title === DEFAULT_TITLE ? { title: name } : {}),
    });
  };

  return (
    <Flex
      flexDir="column"
      h="100%"
      w="100%"
      {...chatPanelCardStyle}
      borderRadius={0}
      borderWidth={0}
      borderRightWidth={{ base: 0, md: "1px" }}
      bg="bg"
    >
      {/* Header */}
      <Flex
        h="40px"
        px={3}
        align="center"
        justify="space-between"
        borderBottomWidth="1px"
        borderColor="border"
        flexShrink={0}
      >
        <Flex align="center" gap={2} color="neutral.500">
          <PolygonIcon size={16} />
          <Text
            fontFamily="mono"
            fontSize="10px"
            letterSpacing="0.3px"
            textTransform="uppercase"
          >
            Areas
          </Text>
        </Flex>
        <IconButton
          aria-label="Close areas"
          size="xs"
          variant="ghost"
          color="neutral.500"
          onClick={onClose}
        >
          <XIcon size={16} />
        </IconButton>
      </Flex>

      {/* Body */}
      <Box flex="1 1 auto" overflowY="auto" px={4} py={3}>
        <Text fontSize="sm" color="fg" mb={3}>
          Select an area to base this dashboard on, or describe what you want in
          the chat.
        </Text>

        <Flex gap={2} mb={3} flexWrap="wrap">
          <SourcePill
            active={source === "mine"}
            onClick={() => setSource("mine")}
          >
            My areas
          </SourcePill>
          <SourcePill
            active={source === "gadm"}
            onClick={() => setSource("gadm")}
          >
            GADM
          </SourcePill>
        </Flex>

        <InputGroup mb={3} endElement={<MagnifyingGlassIcon size={16} />}>
          <Input
            size="sm"
            bg="bg"
            placeholder="Find area by name"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </InputGroup>

        {source === "gadm" ? (
          gadmAreas.length === 0 ? (
            <Text fontSize="sm" color="fg.muted" py={6} textAlign="center">
              No areas match your search.
            </Text>
          ) : (
            <Flex flexDir="column" gap={2}>
              {gadmAreas.map((a) => (
                <AreaCard
                  key={a.id}
                  name={a.name}
                  subtitle={a.level}
                  selected={dashboard?.subtitle === a.name}
                  onSelect={() => selectArea(a.name)}
                />
              ))}
            </Flex>
          )
        ) : isLoading ? (
          <Flex align="center" gap={2} color="fg.muted" fontSize="sm" py={6}>
            <Spinner size="xs" />
            Loading areas…
          </Flex>
        ) : error ? (
          <Text fontSize="sm" color="fg.muted" py={6} textAlign="center">
            Couldn&apos;t load your areas. Try GADM above, or describe the
            dashboard in the chat.
          </Text>
        ) : areas.length === 0 ? (
          <Text fontSize="sm" color="fg.muted" py={6} textAlign="center">
            {query
              ? "No areas match your search."
              : "No saved areas yet. Try GADM above, create one on the map, or describe your dashboard in the chat."}
          </Text>
        ) : (
          <Flex flexDir="column" gap={2}>
            {areas.map((a) => (
              <AreaCard
                key={a.id}
                name={a.name}
                subtitle={formatCreated(a.created_at)}
                selected={dashboard?.subtitle === a.name}
                onSelect={() => selectArea(a.name)}
              />
            ))}
          </Flex>
        )}
      </Box>
    </Flex>
  );
}

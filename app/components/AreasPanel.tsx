import { Suspense, useEffect, useState } from "react";
import { Flex, IconButton, Stack, Text } from "@chakra-ui/react";
import { AnimatePresence, motion } from "framer-motion";
import { PolygonIcon, XIcon } from "@phosphor-icons/react";

import {
  getCatalogColumnMotionStyle,
  getCatalogColumnPanelFlexProps,
} from "@/app/chatPanelShared";
import { getCatalogLeftPx } from "@/app/explorationLayout";
import { useCustomAreasCreate } from "@/app/hooks/useCustomAreasCreate";
import useMapStore from "@/app/store/mapStore";
import useSidebarStore, {
  type AreasPanelFilter,
} from "@/app/store/sidebarStore";
import { ENTITY_KINDS } from "@/src/shared/ui/entity-card";

import { AreaActionBar } from "./AreaActionBar";
import { ConversationAreasList, MonitoredAreasList } from "./AreaLists";
import { AreaSearchResults } from "./AreaSearchResults";
import { BoundariesList } from "./BoundariesList";
import { PanelEmpty, PanelPills } from "./PanelList";
import { PanelSearchInput } from "./PanelSearchInput";

/** Matches CatalogPanel compact/full-size enter & exit (slide from the left). */
const areasPanelSlideTransition = {
  duration: 0.2,
  ease: "easeInOut",
} as const;

/** Scrollable list chrome: vertical scroll without visible scrollbars. */
const areasListScrollStyle = {
  overflowY: "auto",
  overflowX: "hidden",
  scrollbarWidth: "none",
  "&::-webkit-scrollbar": { display: "none" },
} as const;

const AREA_FILTERS: { id: AreasPanelFilter; label: string }[] = [
  { id: "boundaries", label: "Boundaries" },
  { id: "conversation", label: "In this conversation" },
  { id: "mine", label: "My areas" },
];

/**
 * Slide-out panel for selecting and managing Areas of Interest (AOIs). Lives
 * in the same exploration-layout column as `CatalogPanel` (datasets) and is
 * mutually exclusive with it via `sidebarStore`.
 *
 * Wiring:
 *  - "Boundaries" (default) — `BoundariesList`: one card per boundary layer;
 *    the toggle sets `mapStore.selectAreaLayer` (one at a time). Clicking a
 *    feature on the visible boundary layer picks it as an area.
 *  - "In this conversation" — read from `mapStore.layers` (filtered via
 *    `isAreaLayer`); the visible area layer IS the scope. Show-on-map toggle
 *    controls the layer's `visible` flag via `mapStore.setLayerVisibility`.
 *  - "My areas" — `useCustomAreasListSuspense().customAreas`. Toggling
 *    show-on-map registers the geometry and adds an area layer (or removes it).
 *  - `AreaActionBar` above the chips: Draw (`startDrawing`) and Upload
 *    (`toggleUploadAreaDialog`), and the draw status / confirm strip.
 *  - The search box: typing swaps the tabs for `AreaSearchResults` (saved
 *    areas that match, then places from `GET /api/aois`).
 */
export default function AreasPanel() {
  const {
    areasPanelOpen,
    setAreasPanelOpen,
    isChatFullSize,
    areasPanelFilter: filter,
    setAreasPanelFilter: setFilter,
  } = useSidebarStore();
  const setCreateAreaFn = useMapStore((s) => s.setCreateAreaFn);
  const { createAreaAsync } = useCustomAreasCreate();

  useEffect(() => {
    setCreateAreaFn(createAreaAsync);
  }, [createAreaAsync, setCreateAreaFn]);

  const leftPx = getCatalogLeftPx(isChatFullSize);

  const compactSlide = !isChatFullSize;

  return (
    <AnimatePresence>
      {areasPanelOpen && (
        <motion.div
          key="areas-panel"
          initial={compactSlide ? { opacity: 0, x: -16 } : false}
          animate={{ opacity: 1, x: 0 }}
          exit={compactSlide ? { opacity: 0, x: -16 } : { opacity: 0 }}
          transition={areasPanelSlideTransition}
          style={getCatalogColumnMotionStyle(leftPx)}
        >
          <Flex {...getCatalogColumnPanelFlexProps(isChatFullSize)}>
            <AreasPanelHeader onClose={() => setAreasPanelOpen(false)} />
            <AreasPanelBody
              filter={filter}
              onFilterChange={setFilter}
              onClose={() => setAreasPanelOpen(false)}
            />
          </Flex>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

/**
 * Search, Draw / Upload, the tabs and the list. Mounted only while the panel is
 * open, so the search query resets each time it opens (the tab persists).
 * Typing switches to search results; clearing the box restores the tab.
 */
function AreasPanelBody({
  filter,
  onFilterChange,
  onClose,
}: {
  filter: AreasPanelFilter;
  onFilterChange: (filter: AreasPanelFilter) => void;
  onClose: () => void;
}) {
  const [query, setQuery] = useState("");
  const searching = query.trim() !== "";

  return (
    <Flex
      flex={1}
      minH={0}
      minW={0}
      flexDirection="column"
      gap={4}
      pt={4}
      px={3}
      pb={6}
      overflow="hidden"
    >
      {/* One toolbar: find a place, or add your own (Draw / Upload). */}
      <Stack
        role="group"
        aria-label="Find or add an area"
        gap="6px"
        flexShrink={0}
      >
        <PanelSearchInput
          label="Search areas"
          placeholder="Search places, e.g. Pará or Serengeti"
          value={query}
          onChange={setQuery}
          onEscapeEmpty={onClose}
        />
        <AreaActionBar hideIdle={searching} />
      </Stack>
      {searching ? (
        <AreaSearchResults query={query} />
      ) : (
        <>
          <PanelPills
            options={AREA_FILTERS}
            value={filter}
            onChange={onFilterChange}
          />
          <Stack
            gap={4}
            flex={1}
            minH={0}
            minW={0}
            pb={2}
            css={areasListScrollStyle}
          >
            {filter === "boundaries" ? (
              <BoundariesList />
            ) : filter === "conversation" ? (
              <ConversationAreasList />
            ) : (
              <Suspense fallback={<PanelEmpty>Loading your areas…</PanelEmpty>}>
                <MonitoredAreasList />
              </Suspense>
            )}
          </Stack>
        </>
      )}
    </Flex>
  );
}

function AreasPanelHeader({ onClose }: { onClose: () => void }) {
  return (
    <Flex
      position="relative"
      zIndex={10}
      flexShrink={0}
      h="40px"
      py="4px"
      px={3}
      justifyContent="space-between"
      alignItems="center"
      borderBottom="1px solid"
      borderColor="#E0E2E5"
      overflow="hidden"
      minW={0}
    >
      <Flex alignItems="center" gap="8px" minW={0} flex="1" overflow="hidden">
        <PolygonIcon size={16} color={ENTITY_KINDS.area.color} />
        <Text
          fontSize="10px"
          fontWeight="400"
          fontFamily="mono"
          lineHeight="16px"
          letterSpacing="0.03em"
          textTransform="uppercase"
          color="#656E7B"
          m={0}
        >
          Areas
        </Text>
      </Flex>
      <IconButton
        aria-label="Close areas panel"
        variant="ghost"
        size="2xs"
        p={0}
        minW="16px"
        h="16px"
        w="16px"
        color="#656E7B"
        onClick={onClose}
      >
        <XIcon size={12} />
      </IconButton>
    </Flex>
  );
}

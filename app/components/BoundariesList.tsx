import { Box, Flex, Text } from "@chakra-ui/react";
import {
  BirdIcon,
  MapTrifoldIcon,
  ShieldCheckIcon,
  UsersThreeIcon,
  type Icon,
} from "@phosphor-icons/react";

import { CATALOG_CARD_WIDTH_PX } from "@/app/explorationLayout";
import useMapStore from "@/app/store/mapStore";
import {
  CONCESSION_STYLES,
  type LayerId,
  selectLayerOptions,
} from "@/app/types/map";

import { CatalogCard } from "./CatalogCard";
import { AREA_LABEL_COLOR } from "./AreaCardMenu";

const BOUNDARY_SELECTED_BG = "rgba(45, 107, 228, 0.06)";

// The concession layers show their commodity colour instead of an icon.
const BOUNDARY_ICONS: Partial<Record<LayerId, Icon>> = {
  GADM: MapTrifoldIcon,
  KBA: BirdIcon,
  WDPA: ShieldCheckIcon,
  LandMark: UsersThreeIcon,
};

const boundaryOptions = selectLayerOptions.filter(
  ({ id }) => !CONCESSION_STYLES[id]
);
const commodityOptions = selectLayerOptions.filter(
  ({ id }) => CONCESSION_STYLES[id]
);

/**
 * "Boundaries" tab of the Areas panel: one card per boundary layer. Only one
 * boundary layer can be on the map at a time, so switching one on replaces
 * the previous. Showing a boundary layer only makes its features pickable —
 * it is not an area selection and adds nothing to the chat context.
 */
export function BoundariesList() {
  const selectAreaLayer = useMapStore((s) => s.selectAreaLayer);

  return (
    <>
      <Text fontSize="xs" color="fg.muted" flexShrink={0}>
        Show a boundary layer on the map, then click an area to select it.
      </Text>
      {boundaryOptions.map((option) => (
        <BoundaryCard
          key={option.id}
          id={option.id}
          name={option.name}
          source={option.source}
          isActive={selectAreaLayer === option.id}
        />
      ))}
      {/* Grouped as on the GNW concessions map. */}
      <Text
        fontSize="xs"
        fontFamily="mono"
        letterSpacing="wider"
        textTransform="uppercase"
        color="fg.muted"
        flexShrink={0}
        mt={2}
      >
        Commodities
      </Text>
      {commodityOptions.map((option) => (
        <BoundaryCard
          key={option.id}
          id={option.id}
          name={option.name}
          source={option.source}
          isActive={selectAreaLayer === option.id}
        />
      ))}
    </>
  );
}

function BoundaryCard({
  id,
  name,
  source,
  isActive,
}: {
  id: LayerId;
  name: string;
  source: string;
  isActive: boolean;
}) {
  const setSelectAreaLayer = useMapStore((s) => s.setSelectAreaLayer);

  return (
    <Box w={`${CATALOG_CARD_WIDTH_PX}px`} maxW="100%" flexShrink={0}>
      <CatalogCard
        thumbnail={<BoundaryThumbnail id={id} />}
        typeLabel="BOUNDARIES"
        typeLabelColor={AREA_LABEL_COLOR}
        title={name}
        description={source}
        selected={isActive}
        selectedBg={BOUNDARY_SELECTED_BG}
        showOnMap={isActive}
        onShowOnMapChange={(checked) => setSelectAreaLayer(checked ? id : null)}
        dataPanel="areas-boundaries"
      />
    </Box>
  );
}

function BoundaryThumbnail({ id }: { id: LayerId }) {
  const concession = CONCESSION_STYLES[id];
  if (concession) {
    // The layer's swatch, as in the GNW concessions menu: the full fill
    // colour, with a hairline border so the pale colours hold their edge.
    return (
      <Flex
        w="100%"
        h="100%"
        align="center"
        justify="center"
        bg="rgba(45, 107, 228, 0.06)"
        aria-hidden
      >
        <Box
          w="32px"
          h="32px"
          borderRadius="2px"
          border="1px solid rgba(0, 0, 0, 0.06)"
          bg={concession.fillColor}
          data-swatch={concession.fillColor}
        />
      </Flex>
    );
  }
  const IconComponent = BOUNDARY_ICONS[id] ?? MapTrifoldIcon;
  return (
    <Flex
      w="100%"
      h="100%"
      align="center"
      justify="center"
      bg="rgba(45, 107, 228, 0.06)"
      aria-hidden
    >
      <IconComponent size={32} color={AREA_LABEL_COLOR} weight="light" />
    </Flex>
  );
}

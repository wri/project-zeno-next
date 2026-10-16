import { Box, Flex, Text } from "@chakra-ui/react";
import {
  AxeIcon,
  BirdIcon,
  LogIcon,
  MapTrifoldIcon,
  SealCheckIcon,
  ShieldCheckIcon,
  ShovelIcon,
  TreePalmIcon,
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

// Phosphor has no pickaxe or palm-oil icon: mining is a shovel, and RSPO
// oil palm is a seal for its certification.
const BOUNDARY_ICONS: Record<LayerId, Icon> = {
  GADM: MapTrifoldIcon,
  KBA: BirdIcon,
  WDPA: ShieldCheckIcon,
  LandMark: UsersThreeIcon,
  LOGGING: AxeIcon,
  MINING: ShovelIcon,
  OIL_PALM: TreePalmIcon,
  RSPO_OIL_PALM: SealCheckIcon,
  WOOD_FIBER: LogIcon,
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
  const renderCard = (option: (typeof selectLayerOptions)[number]) => (
    <BoundaryCard
      key={option.id}
      id={option.id}
      name={option.name}
      source={option.source}
      isActive={selectAreaLayer === option.id}
    />
  );

  return (
    <>
      <Text fontSize="xs" color="fg.muted" flexShrink={0}>
        Show a boundary layer on the map, then click an area to select it.
      </Text>
      {boundaryOptions.map(renderCard)}
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
      {commodityOptions.map(renderCard)}
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
  const IconComponent = BOUNDARY_ICONS[id];
  // A concession's icon takes its layer's accent, so the card matches the
  // colour of the layer on the map.
  const color = CONCESSION_STYLES[id]?.accent ?? AREA_LABEL_COLOR;
  return (
    <Flex
      w="100%"
      h="100%"
      align="center"
      justify="center"
      bg="rgba(45, 107, 228, 0.06)"
      aria-hidden
    >
      <IconComponent size={32} color={color} weight="light" />
    </Flex>
  );
}

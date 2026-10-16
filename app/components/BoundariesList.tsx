import { Flex, Text } from "@chakra-ui/react";
import {
  BirdIcon,
  MapTrifoldIcon,
  ShieldCheckIcon,
  UsersThreeIcon,
  type Icon,
} from "@phosphor-icons/react";

import useMapStore from "@/app/store/mapStore";
import { type LayerId, selectLayerOptions } from "@/app/types/map";
import { ENTITY_KINDS, EntityCard } from "@/src/shared/ui/entity-card";

import { PanelList } from "./PanelList";

const BOUNDARY_ICONS: Record<LayerId, Icon> = {
  GADM: MapTrifoldIcon,
  KBA: BirdIcon,
  WDPA: ShieldCheckIcon,
  LandMark: UsersThreeIcon,
};

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
      <PanelList>
        {selectLayerOptions.map((option) => (
          <BoundaryCard
            key={option.id}
            id={option.id}
            name={option.name}
            source={option.source}
            isActive={selectAreaLayer === option.id}
          />
        ))}
      </PanelList>
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
    <EntityCard
      kind="area"
      thumbnail={<BoundaryThumbnail id={id} />}
      title={name}
      meta={source}
      interaction={{
        mode: "toggle",
        checked: isActive,
        onChange: (checked) => setSelectAreaLayer(checked ? id : null),
        dataPanel: "areas-boundaries",
      }}
    />
  );
}

function BoundaryThumbnail({ id }: { id: LayerId }) {
  const IconComponent = BOUNDARY_ICONS[id];
  return (
    <Flex
      w="100%"
      h="100%"
      align="center"
      justify="center"
      bg={ENTITY_KINDS.area.tint}
      aria-hidden
    >
      <IconComponent size={28} color={ENTITY_KINDS.area.color} weight="light" />
    </Flex>
  );
}

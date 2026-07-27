import { useState } from "react";
import { Image, Popover, Portal, Text } from "@chakra-ui/react";
import { InfoIcon } from "@phosphor-icons/react";
import { InfoCard } from "./InfoCard";
import {
  IMAGERY_LAYER_NAME,
  imageryCardDescription,
  imageryLegendInfo,
  type ImageryCardData,
} from "@/app/utils/imagery";

export type ImageryCardProps = {
  imagery: ImageryCardData;
};

/**
 * Chat data card for a show_imagery capture (Figma node 1473:8992): mosaic
 * thumbnail, green DATA label, "Satellite Imagery" title with an info popover,
 * and a "Jun 12–16 · cloud <50% · Sentinel-2" caption.
 */
export function ImageryCard({ imagery }: ImageryCardProps) {
  const [thumbFailed, setThumbFailed] = useState(false);
  const showThumb = imagery.thumbnail_url && !thumbFailed;

  const thumbnail = showThumb ? (
    <Image
      objectFit="cover"
      width="80px"
      height="80px"
      src={imagery.thumbnail_url}
      alt={IMAGERY_LAYER_NAME}
      onError={() => setThumbFailed(true)}
    />
  ) : (
    <Image width="40px" height="40px" src="/globe.svg" alt="" />
  );

  const infoAction = (
    <Popover.Root>
      <Popover.Trigger asChild>
        <InfoIcon cursor="pointer" size={16} color="#656E7B" />
      </Popover.Trigger>
      <Portal>
        <Popover.Positioner>
          <Popover.Content>
            <Popover.Arrow />
            <Popover.Body>
              <Popover.Title fontWeight="medium">
                Satellite imagery
              </Popover.Title>
              <Text my="4">{imageryLegendInfo(imagery)}</Text>
            </Popover.Body>
          </Popover.Content>
        </Popover.Positioner>
      </Portal>
    </Popover.Root>
  );

  return (
    <InfoCard
      thumbnail={thumbnail}
      thumbnailBg="#0F1B24"
      typeLabel="DATA"
      typeLabelColor="#1AA915"
      title={IMAGERY_LAYER_NAME}
      description={imageryCardDescription(imagery)}
      titleActions={infoAction}
    />
  );
}

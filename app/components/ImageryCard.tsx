import { useState } from "react";
import { Image, Popover, Portal, Text } from "@chakra-ui/react";
import { InfoIcon } from "@phosphor-icons/react";
import { InfoCard } from "./InfoCard";
import useMapStore from "@/app/store/mapStore";
import type { Layer } from "@/app/store/layerManagerSlice";
import {
  IMAGERY_LAYER_NAME,
  imageryCardDescription,
  imageryLayerId,
  imageryLegendInfo,
  toImageryMeta,
  type ImageryCardData,
} from "@/app/utils/imagery";

export type ImageryCardProps = {
  imagery: ImageryCardData;
};

/**
 * Chat data card for a show_imagery capture (Figma node 1473:8992): scene
 * thumbnail, green DATA label, "Satellite Imagery" title with an info
 * popover, and a "Jun 12–16 · cloud <50% · Sentinel-2" caption.
 *
 * A Sentinel-2 capture is searched in the browser after the card is added,
 * so the card follows its map layer: "Searching scenes…", then the acquired
 * dates and the best scene's preview, or "No scenes found". If its search
 * found nothing and the user then made a newer capture of the same area in
 * the legend, the card shows that one. When the layer is gone (removed from
 * the map), it shows the request it was made for.
 */
export function ImageryCard({ imagery }: ImageryCardProps) {
  const layer = useMapStore((s) =>
    shownCapture(s.layers, imageryLayerId(imagery.mosaic_id))
  );
  // The URL that failed to load, so a later capture's preview still shows.
  const [failedUrl, setFailedUrl] = useState<string>();

  const meta = toImageryMeta(layer?.imagery ?? imagery);
  const status = layer?.sentinel2?.status;
  const thumbnailUrl = layer?.sentinel2
    ? layer.sentinel2.scenes[0]?.thumbnailHref
    : imagery.thumbnail_url;
  const showThumb = thumbnailUrl && thumbnailUrl !== failedUrl;

  const thumbnail = showThumb ? (
    <Image
      objectFit="cover"
      width="80px"
      height="80px"
      src={thumbnailUrl}
      alt={IMAGERY_LAYER_NAME}
      onError={() => setFailedUrl(thumbnailUrl)}
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
              <Text my="4">{imageryLegendInfo(meta)}</Text>
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
      description={imageryCardDescription(meta, status)}
      titleActions={infoAction}
    />
  );
}

/** The areas a capture covers, as one comparable key. */
const areaKey = (layer: Layer) =>
  (layer.sentinel2?.request.aois ?? [])
    .map((a) => `${a.source}:${a.srcId}`)
    .sort()
    .join("|");

/**
 * The capture a card shows: its own, unless its search found no imagery and
 * the user has since made a newer capture of the same area that has some
 * (a legend quick fix or Edit, which add no card of their own). Newer
 * captures sit above older ones in the layer list (promoteImageryLayer).
 */
function shownCapture(layers: Layer[], ownId: string): Layer | undefined {
  const ownIndex = layers.findIndex((l) => l.id === ownId);
  const own = layers[ownIndex];
  if (!own?.sentinel2 || own.sentinel2.status === "ok") return own;
  if (own.sentinel2.status === "searching") return own;
  const key = areaKey(own);
  const newer = layers
    .slice(0, ownIndex)
    .find(
      (l) =>
        l.sentinel2?.status === "ok" &&
        l.sentinel2.scenes.length > 0 &&
        areaKey(l) === key
    );
  return newer ?? own;
}

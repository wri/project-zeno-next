import { Image, useDisclosure } from "@chakra-ui/react";

import type { DatasetDetails } from "@/app/types/chat";
import { datasetMeta } from "@/app/utils/datasetMeta";
import { EntityCard, type CardInteraction } from "@/src/shared/ui/entity-card";

import { DatasetInfoModal } from "./DatasetInfoModal";
import { ViewOnlyBadge } from "./ViewOnlyBadge";

export interface DatasetRowProps {
  dataset: DatasetDetails;
  /** Thumbnail image; the dataset glyph when omitted. */
  img?: string;
  /** Contextual-only dataset (no analytics endpoint). */
  viewOnly?: boolean;
  /** Shows the DATA eyebrow — the chat card, among AREA and ANALYSIS cards. */
  showKind?: boolean;
  /** Static (chat) when omitted; a show-on-map switch in the panels and picker. */
  interaction?: CardInteraction;
}

/**
 * A dataset as one compact row: thumbnail, name, "annual · global · UMD",
 * VIEW ONLY when it can't be analysed, and an (i) that opens its info modal.
 * Used by the Data catalog, the `+` picker and the chat card.
 */
export function DatasetRow({
  dataset,
  img,
  viewOnly = false,
  showKind,
  interaction,
}: DatasetRowProps) {
  const { open, onOpen, onClose } = useDisclosure();

  return (
    <>
      <DatasetInfoModal isOpen={open} onClose={onClose} dataset={dataset} />
      <EntityCard
        kind="dataset"
        title={dataset.dataset_name}
        meta={datasetMeta(dataset)}
        thumbnail={
          img && <Image objectFit="cover" w="100%" h="100%" src={img} alt="" />
        }
        badge={viewOnly && <ViewOnlyBadge />}
        showKind={showKind}
        interaction={interaction}
        onInfo={onOpen}
      />
    </>
  );
}

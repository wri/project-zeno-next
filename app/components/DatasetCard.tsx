import { Image, useDisclosure } from "@chakra-ui/react";
import { InfoIcon } from "@phosphor-icons/react";
import { DatasetInfo } from "@/app/types/chat";
import { DatasetInfoModal } from "./DatasetInfoModal";
import { InfoCard } from "./InfoCard";
import { Tooltip } from "./ui/tooltip";

export type DatasetCardProps = {
  dataset: DatasetInfo;
  img?: string;
  label?: string;
  labelColor?: string;
  selected?: boolean;
  onClick?: () => void;
};

export function DatasetCard({
  dataset,
  img,
  label = "DATA",
  labelColor = "#1AA915",
  selected,
  onClick,
}: DatasetCardProps) {
  const { open, onOpen, onClose } = useDisclosure();
  const effectiveImg = img ?? "/globe.svg";
  const cardText =
    [dataset.cadence, dataset.geographic_coverage, dataset.provider]
      .filter(Boolean)
      .join(" · ") || undefined;

  const thumbnail = (
    <Image
      objectFit="cover"
      width="80px"
      height="80px"
      src={effectiveImg}
      alt={dataset.dataset_name}
    />
  );

  const infoAction = (
    <Tooltip
      content="Show dataset info"
      positioning={{ placement: "top" }}
      showArrow
      variant="dark"
    >
      <InfoIcon cursor="pointer" size={16} color="#656E7B" onClick={onOpen} />
    </Tooltip>
  );

  return (
    <>
      <DatasetInfoModal isOpen={open} onClose={onClose} dataset={dataset} />
      <InfoCard
        thumbnail={thumbnail}
        typeLabel={label}
        typeLabelColor={labelColor}
        title={dataset.dataset_name}
        description={cardText}
        titleActions={infoAction}
        selected={selected}
        onClick={onClick}
      />
    </>
  );
}

import { Card, Image, useDisclosure } from "@chakra-ui/react";
import { InfoIcon } from "@phosphor-icons/react";
import { DatasetInfo } from "@/app/types/chat";
import { DatasetInfoModal } from "./DatasetInfoModal";

export type DatasetCardProps = {
  dataset: DatasetInfo;
  img?: string;
  selected?: boolean;
  onClick?: () => void;
  size?: "sm" | "md" | "lg";
};

export function DatasetCard({
  dataset,
  img,
  selected,
  onClick,
  size = "sm",
}: DatasetCardProps) {
  const { open, onOpen, onClose } = useDisclosure();
  const effectiveImg = img ?? "/globe.svg";
  return (
    <>
      <DatasetInfoModal isOpen={open} onClose={onClose} dataset={dataset} />
      <Card.Root
      size={size}
      flexDirection="row"
      flexShrink={0}
      overflow="hidden"
      maxW="xl"
      border="2px solid"
      borderColor={selected ? "primary.solid" : "border.muted"}
      _hover={{
        cursor: onClick ? "pointer" : "initial",
        borderColor: "primary.300",
      }}
      onClick={onClick}
    >
      <Image
        objectFit="cover"
        maxW="8rem"
        src={effectiveImg}
        alt={dataset.dataset_name}
      />
      <Card.Body display="flex" flexDir="column" gap="1" px={5} py={4}>
        <Card.Title display="flex" gap="1" alignItems="center" fontSize="sm">
          {dataset.dataset_name}
          <InfoIcon
            onClick={(e) => {
              e.stopPropagation(); // prevent card click
              onOpen();
            }}
            cursor="pointer"
          />
        </Card.Title>
        {dataset.reason ? (
          <Card.Description fontSize="xs" color="fg.muted">
            {dataset.reason}
          </Card.Description>
        ) : null}
      </Card.Body>
    </Card.Root>
    </>
  );
}

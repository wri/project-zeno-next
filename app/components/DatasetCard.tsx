import { Box, Card, Image, useDisclosure } from "@chakra-ui/react";
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
  const cardText = dataset.reason || dataset.description;

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
      <Card.Body display="flex" flexDir="column" px={5} py={4} position="relative">
        <Card.Title fontSize="sm" pr="6">
          {dataset.dataset_name}
        </Card.Title>
        <Box
          as="button"
          onClick={(e) => {
            e.stopPropagation(); // prevent card click
            onOpen();
          }}
          aria-label="Show dataset info"
          pos="absolute"
          top="4"
          right="5"
        >
          <InfoIcon cursor="pointer" />
        </Box>
        {cardText && (
          <Card.Description fontSize="xs" color="fg.muted" mt="1">
            {cardText}
          </Card.Description>
        )}
      </Card.Body>
    </Card.Root>
    </>
  );
}

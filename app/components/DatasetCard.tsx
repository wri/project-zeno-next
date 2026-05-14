import { Card, Image, Text, useDisclosure } from "@chakra-ui/react";
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

export function DatasetCard({ dataset, img, size = "sm" }: DatasetCardProps) {
  const { open, onOpen, onClose } = useDisclosure();
  const effectiveImg = img ?? "/globe.svg";
  const cardText = "Yearly · Global · WRI";

  return (
    <>
      <DatasetInfoModal isOpen={open} onClose={onClose} dataset={dataset} />
      <Card.Root
        size={size}
        flexDirection="row"
        flexShrink={0}
        overflow="hidden"
        maxW="xl"
        height="5rem"
        border="1px solid {colors.neutral.900/30}"
      >
        <Image
          objectFit="cover"
          width="5rem"
          src={effectiveImg}
          alt={dataset.dataset_name}
        />
        <Card.Body
          display="flex"
          flexDir="column"
          px={4}
          py={3}
          position="relative"
        >
          <Card.Title
            fontSize="xs"
            pr="6"
            display="flex"
            alignItems="center"
            gap="1.5"
            marginBottom={0}
          >
            <Text>{dataset.dataset_name}</Text>
            <InfoIcon
              cursor="pointer"
              size={18}
              onClick={onOpen}
              style={{ marginBottom: 4 }}
            />
          </Card.Title>
          {cardText && (
            <Card.Description fontSize="x-small" color="fg.muted" mt="1">
              {cardText}
            </Card.Description>
          )}
        </Card.Body>
      </Card.Root>
    </>
  );
}

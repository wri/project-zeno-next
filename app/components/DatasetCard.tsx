import { Card, Image, Text, useDisclosure } from "@chakra-ui/react";
import { InfoIcon } from "@phosphor-icons/react";
import { DatasetInfo } from "@/app/types/chat";
import { DatasetInfoModal } from "./DatasetInfoModal";

export type DatasetCardProps = {
  dataset: DatasetInfo;
  img?: string;
  size?: "sm" | "md" | "lg";
  label?: string;
  labelColor?: string;
};

export function DatasetCard({
  dataset,
  img,
  size = "sm",
  label = "DATA",
  labelColor = "#1AA915",
}: DatasetCardProps) {
  const { open, onOpen, onClose } = useDisclosure();
  const effectiveImg = img ?? "/globe.svg";
  const cardText =
    [dataset.cadence, dataset.geographic_coverage, dataset.provider]
      .filter(Boolean)
      .join(" · ") || null;

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
          <Text
            fontSize="x-small"
            fontWeight="bold"
            color={labelColor}
            mb="0.5"
          >
            {label}
          </Text>
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
            <Card.Description fontSize="x-small" color="fg.muted">
              {cardText}
            </Card.Description>
          )}
        </Card.Body>
      </Card.Root>
    </>
  );
}

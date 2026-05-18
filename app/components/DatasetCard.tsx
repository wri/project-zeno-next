import { Card, Image, Text, useDisclosure } from "@chakra-ui/react";
import { InfoIcon } from "@phosphor-icons/react";
import { DatasetInfo } from "@/app/types/chat";
import { DatasetInfoModal } from "./DatasetInfoModal";
import { Tooltip } from "./ui/tooltip";

export type DatasetCardProps = {
  dataset: DatasetInfo;
  img?: string;
  size?: "sm" | "md" | "lg";
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
      .join(" · ") || null;

  return (
    <>
      <DatasetInfoModal isOpen={open} onClose={onClose} dataset={dataset} />
      <Card.Root
        flexDirection="row"
        flexShrink={0}
        overflow="hidden"
        width="100%"
        height="80px"
        border={selected ? "2px solid" : "1px solid rgba(19, 22, 25, 0.3)"}
        borderColor={selected ? "primary.solid" : undefined}
        borderRadius="4px"
        onClick={onClick}
        cursor={onClick ? "pointer" : "default"}
        _hover={
          onClick
            ? { borderColor: "primary.300", border: "2px solid" }
            : undefined
        }
      >
        <Image
          objectFit="cover"
          width="80px"
          minHeight="80px"
          flexShrink={0}
          src={effectiveImg}
          alt={dataset.dataset_name}
          borderRight="1px solid rgba(19, 22, 25, 0.1)"
          borderRadius={0}
        />
        <Card.Body
          display="flex"
          flexDir="column"
          px="16px"
          py={0}
          gap="2px"
          justifyContent="center"
        >
          <Text
            fontFamily="'IBM Plex Mono', monospace"
            fontSize="10px"
            fontWeight="400"
            letterSpacing="0.5px"
            lineHeight="16px"
            color={labelColor}
          >
            {label}
          </Text>
          <Card.Title
            display="flex"
            alignItems="center"
            gap="8px"
            marginBottom={0}
          >
            <Text
              fontFamily="'IBM Plex Sans', sans-serif"
              fontSize="12px"
              fontWeight="500"
              lineHeight="150%"
              color="#3A4048"
            >
              {dataset.dataset_name}
            </Text>
            <Tooltip
              content="Show dataset info"
              positioning={{ placement: "top" }}
              showArrow
              variant="dark"
            >
              <InfoIcon
                cursor="pointer"
                size={16}
                color="#656E7B"
                onClick={onOpen}
              />
            </Tooltip>
          </Card.Title>
          {cardText && (
            <Card.Description
              fontFamily="'IBM Plex Mono', monospace"
              fontSize="10px"
              fontWeight="400"
              lineHeight="16px"
              color="#656E7B"
            >
              {cardText}
            </Card.Description>
          )}
        </Card.Body>
      </Card.Root>
    </>
  );
}

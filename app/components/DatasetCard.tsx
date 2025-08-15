import { Card, Image } from "@chakra-ui/react";
import { InfoIcon } from "@phosphor-icons/react";

export type DatasetCardProps = {
  title: string;
  description?: string;
  img?: string;
  selected?: boolean;
  onClick?: () => void;
  size?: "sm" | "md" | "lg";
};

export function DatasetCard({
  title,
  description,
  img,
  selected,
  onClick,
  size = "sm",
}: DatasetCardProps) {
  const effectiveImg = img ?? "/globe.svg";
  return (
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
      <Image objectFit="cover" maxW="8rem" src={effectiveImg} alt={title} />
      <Card.Body display="flex" flexDir="column" gap="1" px={5} py={4}>
        <Card.Title display="flex" gap="1" alignItems="center" fontSize="sm">
          {title}
          <InfoIcon />
        </Card.Title>
        {description ? (
          <Card.Description fontSize="xs" color="fg.muted">
            {description}
          </Card.Description>
        ) : null}
      </Card.Body>
    </Card.Root>
  );
}

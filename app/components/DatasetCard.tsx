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
      border={selected ? "2px solid" : undefined}
      borderColor={selected ? "blue.800" : undefined}
      cursor={onClick ? "pointer" : undefined}
      onClick={onClick}
    >
      <Image objectFit="cover" maxW="5rem" src={effectiveImg} alt={title} />
      <Card.Body>
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

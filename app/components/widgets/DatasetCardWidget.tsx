import { Box, Button, Text, Badge, Flex, Card } from "@chakra-ui/react";
import { DatasetInfo } from "@/app/types/chat";
import useMapStore from "@/app/store/mapStore";
import { GlobeIcon } from "@phosphor-icons/react";

interface DatasetCardWidgetProps {
  dataset: DatasetInfo;
}

export default function DatasetCardWidget({ dataset }: DatasetCardWidgetProps) {
  const { addTileLayer, tileLayers } = useMapStore();

  const isAlreadyAdded = tileLayers.some(
    (layer) => layer.id === `dataset-${dataset.dataset_id}`
  );

  const handleAddToMap = () => {
    if (!isAlreadyAdded) {
      addTileLayer({
        id: `dataset-${dataset.dataset_id}`,
        name: `${dataset.source} - ${dataset.data_layer}`,
        url: dataset.tile_url,
        visible: true,
      });
    }
  };

  return (
    <Card.Root
      variant="outline"
      borderRadius="lg"
      overflow="hidden"
      _hover={{ shadow: "md" }}
      transition="all 0.2s"
    >
      <Card.Header pb={2}>
        <Flex justify="space-between" align="flex-start">
          <Box>
            <Card.Title fontSize="md" mb={1}>
              {dataset.data_layer}
            </Card.Title>
            <Badge colorPalette="blue" size="sm">
              {dataset.source}
            </Badge>
          </Box>
        </Flex>
      </Card.Header>

      <Card.Body pt={0}>
        <Text fontSize="sm" color="fg.muted" mb={3}>
          Context Layer: {dataset.context_layer}
          {dataset.threshold && ` • Threshold: ${dataset.threshold}`}
        </Text>

        <Button
          size="sm"
          variant={isAlreadyAdded ? "outline" : "solid"}
          colorPalette={isAlreadyAdded ? "green" : "blue"}
          onClick={handleAddToMap}
          disabled={isAlreadyAdded}
          width="full"
        >
          <GlobeIcon />
          {isAlreadyAdded ? "Added to Map" : "Add to Map"}
        </Button>
      </Card.Body>
    </Card.Root>
  );
}

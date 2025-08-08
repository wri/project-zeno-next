import { Box, Button, Text, Flex, Card } from "@chakra-ui/react";
import { DatasetInfo } from "@/app/types/chat";
import useMapStore from "@/app/store/mapStore";
import { GlobeIcon } from "@phosphor-icons/react";
import useContextStore from "@/app/store/contextStore";

interface DatasetCardWidgetProps {
  dataset: DatasetInfo;
}

export default function DatasetCardWidget({ dataset }: DatasetCardWidgetProps) {
  const { addTileLayer, tileLayers } = useMapStore();
  const { context, addContext, removeContext } = useContextStore();

  const layerId = `dataset-${dataset.dataset_id}`;
  const isAlreadyAdded = tileLayers.some((layer) => layer.id === layerId);
  const existingLayerContext = context.find(
    (c) =>
      c.contextType === "layer" &&
      (c.mapLayerId === layerId || c.content === dataset.dataset_name)
  );
  const isInContext = Boolean(existingLayerContext);

  const handleAddToMap = () => {
    if (!isAlreadyAdded) {
      addTileLayer({
        id: layerId,
        name: `${dataset.dataset_name}`,
        url: dataset.tile_url,
        visible: true,
      });
      addContext({
        contextType: "layer",
        content: dataset.dataset_name,
        mapLayerId: layerId,
      });
      return;
    }

    // If already added, ensure context exists; if it exists, remove it (which also removes the layer)
    if (!isInContext) {
      addContext({
        contextType: "layer",
        content: dataset.dataset_name,
        mapLayerId: layerId,
      });
    } else if (existingLayerContext) {
      removeContext(existingLayerContext.id);
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
              {dataset.dataset_name}
            </Card.Title>
          </Box>
        </Flex>
      </Card.Header>

      <Card.Body pt={0}>
        <Text fontSize="sm" color="fg.muted" mb={3}>
          {dataset.reason}
        </Text>

        <Button
          size="sm"
          variant={
            !isAlreadyAdded ? "solid" : isInContext ? "outline" : "outline"
          }
          colorPalette={
            !isAlreadyAdded ? "blue" : isInContext ? "red" : "green"
          }
          onClick={handleAddToMap}
          width="full"
        >
          <GlobeIcon />
          {!isAlreadyAdded
            ? "Add to Map"
            : isInContext
            ? "Remove from Map"
            : "Add to Context"}
        </Button>
      </Card.Body>
    </Card.Root>
  );
}

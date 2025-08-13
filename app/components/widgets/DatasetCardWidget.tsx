import { Box, Button, Text, Flex, Card } from "@chakra-ui/react";
import { DatasetInfo } from "@/app/types/chat";
import { GlobeIcon } from "@phosphor-icons/react";
import useContextStore from "@/app/store/contextStore";

interface DatasetCardWidgetProps {
  dataset: DatasetInfo;
}

export default function DatasetCardWidget({ dataset }: DatasetCardWidgetProps) {
  const { context, addContext, removeContext } = useContextStore();

  const existingLayerContext = context.find(
    (c) =>
      c.contextType === "layer" &&
      (c.datasetId === dataset.dataset_id || c.content === dataset.dataset_name)
  );
  const isInContext = Boolean(existingLayerContext);

  const handleAddToMap = () => {
    if (!isInContext) {
      // Single source of truth: adding context adds the map layer
      addContext({
        contextType: "layer",
        content: dataset.dataset_name,
        datasetId: dataset.dataset_id,
        tileUrl: dataset.tile_url,
        layerName: dataset.dataset_name,
      });
      return;
    }
    // If already in context, remove it (which also removes the map layer)
    if (existingLayerContext) removeContext(existingLayerContext.id);
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
          variant={!isInContext ? "solid" : "outline"}
          colorPalette={!isInContext ? "blue" : "red"}
          onClick={handleAddToMap}
          width="full"
        >
          <GlobeIcon />
          {!isInContext ? "Add to Map" : "Remove from Map"}
        </Button>
      </Card.Body>
    </Card.Root>
  );
}

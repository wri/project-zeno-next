import { DatasetInfo } from "@/app/types/chat";
import useContextStore from "@/app/store/contextStore";
import { DatasetCard } from "@/app/components/DatasetCard";
import { DATASET_CARDS } from "@/app/constants/datasets";
import { getDatasetLayerContextProps } from "@/app/utils/datasetLayerContext";

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
        ...getDatasetLayerContextProps(dataset), // we add the context layer(s) if any.
      });
      return;
    }
    // If already in context, remove it (which also removes the map layer)
    if (existingLayerContext) removeContext(existingLayerContext.id);
  };

  const card = DATASET_CARDS.find((c) => c.dataset_id === dataset.dataset_id);
  const img = card?.img ?? "/globe.svg";
  const subtitleParts = card
    ? [card.cadence, card.resolution, card.geographic_coverage, card.provider]
    : undefined;

  return (
    <DatasetCard
      dataset={dataset}
      img={img}
      subtitleParts={subtitleParts}
      selected={isInContext}
      onClick={handleAddToMap}
      size="md"
    />
  );
}

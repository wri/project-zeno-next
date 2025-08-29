import { DatasetInfo } from "@/app/types/chat";
import { useEffect } from "react";
import useContextStore from "@/app/store/contextStore";
import { DatasetCard } from "@/app/components/DatasetCard";
import { DATASET_CARDS } from "@/app/constants/datasets";

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


  useEffect(() => {
    addContext({
      contextType: "layer",
      content: dataset.dataset_name,
      datasetId: dataset.dataset_id,
      tileUrl: dataset.tile_url,
      layerName: dataset.dataset_name,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dataset.dataset_id]); // Rerun if dataset changes

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

  const img =
    DATASET_CARDS.find((c) => c.dataset_name === dataset.dataset_name)?.img ??
    "/globe.svg";

  return (
    <DatasetCard
      title={dataset.dataset_name}
      description={dataset.reason}
      img={img}
      selected={isInContext}
      onClick={handleAddToMap}
      size="md"
    />
  );
}

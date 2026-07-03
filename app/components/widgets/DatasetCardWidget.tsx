import { DatasetInfo } from "@/app/types/chat";
import { DatasetCard } from "@/app/components/DatasetCard";
import { DATASET_CARDS } from "@/app/constants/datasets";

interface DatasetCardWidgetProps {
  dataset: DatasetInfo;
}

export default function DatasetCardWidget({ dataset }: DatasetCardWidgetProps) {
  const cardConfig = DATASET_CARDS.find(
    // TODO: Update this to use a slug or uuid when we have those in the API
    (c) => c.dataset_id === dataset.dataset_id
  );
  const img = cardConfig?.img ?? "/globe.svg";
  const enrichedDataset = {
    ...dataset,
    cadence: dataset.cadence ?? cardConfig?.cadence,
    resolution: dataset.resolution ?? cardConfig?.resolution,
    geographic_coverage:
      dataset.geographic_coverage ?? cardConfig?.geographic_coverage,
    provider: dataset.provider ?? cardConfig?.provider,
  };

  return <DatasetCard dataset={enrichedDataset} img={img} />;
}

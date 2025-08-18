import useMapStore from "@/app/store/mapStore";
import VectorAreasLayer from "./VectorAreasLayer";
import CustomAreasLayer from "./CustomAreasLayer";

function SelectAreaLayer() {
  const { selectAreaLayer } = useMapStore();

  if (!selectAreaLayer) return null;

  if (selectAreaLayer === "Custom") return <CustomAreasLayer />;

  return <VectorAreasLayer layerId={selectAreaLayer} />;
}

export default SelectAreaLayer;

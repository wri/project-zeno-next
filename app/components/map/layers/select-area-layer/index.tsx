import useMapStore from "@/app/store/mapStore";
import VectorAreasLayer from "./VectorAreasLayer";
import CustomAreasLayer from "./CustomAreasLayer";

function SelectAreaLayer() {
  const { selectAreaLayer, isDrawingMode } = useMapStore();

  // While drawing a custom area, the AOI select layer's click/hover handlers
  // would hijack map clicks — a click meant to place a polygon vertex would
  // also select an admin area. Deactivate the layer for the duration of
  // drawing; it re-mounts (with the previously selected layer intact) once
  // drawing ends.
  if (!selectAreaLayer || isDrawingMode) return null;

  if (selectAreaLayer === "Custom") return <CustomAreasLayer />;

  return <VectorAreasLayer layerId={selectAreaLayer} />;
}

export default SelectAreaLayer;

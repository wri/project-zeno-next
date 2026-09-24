import useMapStore from "../store/mapStore";
import {
  AreaUploadDialog,
  type UploadedAreas,
} from "@/src/features/area-upload";
import { toaster } from "./ui/toaster";

/** The map areas panel's upload dialog: the shared one, plus map side effects. */
function UploadAreaDialog() {
  const {
    dialogVisible,
    toggleUploadAreaDialog,
    addToRegistry,
    addLayer,
    flyToGeoJson,
  } = useMapStore();

  const handleUploaded = (result: UploadedAreas) => {
    // Batch-created areas are listed in the Areas panel, not drawn.
    if (result.kind === "batch") {
      const count = result.areas.length;
      toaster.create({
        title: count === 1 ? "1 area uploaded" : `${count} areas uploaded`,
        description: "Find them under Monitored areas in the Areas panel.",
        type: "success",
        duration: 5000,
      });
      return;
    }

    const {
      name,
      id,
      geometries: [geo],
    } = result.area;

    const feat: GeoJSON.Feature = {
      type: "Feature",
      geometry: geo,
      properties: {
        id: id,
        name: name,
      },
    };

    addToRegistry({
      ref: { name, source: "custom" },
      data: feat,
      srcId: id,
      subtype: "custom-area",
    });
    // The visible layer IS the scope — no separate context item.
    addLayer({
      id,
      name,
      type: "geojson",
      visible: true,
      featureRefs: [{ name, source: "custom" }],
    });

    flyToGeoJson(feat);
  };

  return (
    <AreaUploadDialog
      open={dialogVisible}
      onOpenChange={(open) => {
        if (open !== dialogVisible) toggleUploadAreaDialog();
      }}
      onUploaded={handleUploaded}
    />
  );
}

export default UploadAreaDialog;

import useMapStore from "../store/mapStore";
import {
  AreaUploadDialog,
  type UploadedAreas,
} from "@/src/features/area-upload";
import { addCustomAreaToMap } from "../utils/addCustomAreaToMap";
import { toaster } from "./ui/toaster";

/** The map areas panel's upload dialog: the shared one, plus map side effects. */
function UploadAreaDialog() {
  const dialogVisible = useMapStore((s) => s.dialogVisible);
  const toggleUploadAreaDialog = useMapStore((s) => s.toggleUploadAreaDialog);

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

    addCustomAreaToMap(result.area);
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

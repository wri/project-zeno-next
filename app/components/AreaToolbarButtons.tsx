import { ButtonGroup, IconButton, Menu, Portal } from "@chakra-ui/react";
import {
  CheckIcon,
  SelectionPlusIcon,
  UploadSimpleIcon,
  XIcon,
} from "@phosphor-icons/react";

import { useCustomAreasCreate } from "@/app/hooks/useCustomAreasCreate";
import useMapStore from "@/app/store/mapStore";
import type { FeatureRef } from "@/app/store/layerManagerSlice";

import { Tooltip } from "./ui/tooltip";

const PANEL_ICON_COLOR = "#656E7B";

/**
 * Upload / draw-area controls for the `AreasPanel` header, with draw
 * confirm/cancel. Picking an area on the map is done from the Boundaries tab
 * (show a boundary layer, then click a feature), not from here.
 */
export function AreaToolbarButtons() {
  const {
    isDrawingMode,
    startDrawing,
    setSelectionMode,
    cancelDrawing,
    confirmDrawing,
    toggleUploadAreaDialog,
    addLayer,
    addToRegistry,
    flyToGeoJson,
  } = useMapStore();
  const { isCreating } = useCustomAreasCreate();

  const buttonProps = {
    variant: "ghost" as const,
    size: "2xs" as const,
    color: PANEL_ICON_COLOR,
  };

  async function handleConfirmDrawing() {
    try {
      const result = await confirmDrawing();
      if (!result) return;
      const {
        name,
        id,
        geometries: [geo],
      } = result;
      const feat: GeoJSON.Feature = {
        type: "Feature",
        geometry: geo,
        properties: {
          id: id,
          name: name,
        },
      };
      const featureRef: FeatureRef = { name: name, source: "custom" };

      addToRegistry({
        ref: featureRef,
        data: feat,
        srcId: id,
        subtype: "custom-area",
      });
      // The visible layer IS the scope — no separate context item.
      addLayer({
        id: featureRef.name,
        name: featureRef.name,
        type: "geojson",
        visible: true,
        featureRefs: [featureRef],
      });

      flyToGeoJson(feat);
    } catch (error) {
      console.error("Failed to confirm drawn area:", error);
    }
  }

  if (isDrawingMode) {
    return (
      <>
        <Tooltip
          content="Cancel drawing"
          positioning={{ placement: "bottom" }}
          showArrow
          variant="dark"
        >
          <IconButton
            aria-label="Cancel drawing"
            {...buttonProps}
            onClick={cancelDrawing}
          >
            <XIcon size={14} />
          </IconButton>
        </Tooltip>
        <Tooltip
          content="Confirm area"
          positioning={{ placement: "bottom" }}
          showArrow
          variant="dark"
        >
          <IconButton
            aria-label="Confirm area"
            {...buttonProps}
            onClick={handleConfirmDrawing}
            disabled={isCreating}
          >
            <CheckIcon size={14} />
          </IconButton>
        </Tooltip>
      </>
    );
  }

  return (
    <>
      <Tooltip
        content="Upload area from file"
        positioning={{ placement: "bottom" }}
        showArrow
        variant="dark"
      >
        <IconButton
          aria-label="Upload area"
          {...buttonProps}
          onClick={() => {
            toggleUploadAreaDialog();
            setSelectionMode({ type: "Uploading", name: undefined });
          }}
        >
          <UploadSimpleIcon size={14} />
        </IconButton>
      </Tooltip>

      <Tooltip
        content="Draw area on map"
        positioning={{ placement: "bottom" }}
        showArrow
        variant="dark"
      >
        <IconButton
          aria-label="Draw area bounds"
          {...buttonProps}
          onClick={() => {
            startDrawing();
            setSelectionMode({ type: "Drawing", name: undefined });
          }}
        >
          <SelectionPlusIcon size={14} />
        </IconButton>
      </Tooltip>
    </>
  );
}

"use client";

import { ButtonGroup, IconButton, Menu, Portal } from "@chakra-ui/react";
import {
  CaretDownIcon,
  CheckIcon,
  HandPointingIcon,
  SelectionPlusIcon,
  UploadSimpleIcon,
  XIcon,
} from "@phosphor-icons/react";

import { useCustomAreasCreate } from "@/app/hooks/useCustomAreasCreate";
import useContextStore from "@/app/store/contextStore";
import useMapStore from "@/app/store/mapStore";
import type { FeatureRef } from "@/app/store/layerManagerSlice";
import { LayerId, selectLayerOptions } from "@/app/types/map";

import { Tooltip } from "./ui/tooltip";

const PANEL_ICON_COLOR = "#656E7B";

/**
 * Upload / select-layer / draw-area controls for the `AreasPanel` header.
 * Behaviour matches the former map overlay tools: split hand + chevron select,
 * full layer menu, and draw confirm/cancel.
 */
export function AreaToolbarButtons() {
  const {
    selectAreaLayer,
    setSelectAreaLayer,
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
  const { addContext } = useContextStore();
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
      addLayer({
        id: featureRef.name,
        name: featureRef.name,
        type: "geojson",
        visible: true,
        featureRefs: [featureRef],
      });

      addContext({
        contextType: "area",
        content: name,
        aoiData: {
          src_id: id,
          name,
          source: "custom",
          subtype: "custom-area",
        },
      });

      flyToGeoJson(feat);
    } catch (error) {
      console.error("Failed to confirm drawn area:", error);
    }
  }

  function activateCurrentLayerSelection() {
    const layer = selectLayerOptions.find((o) => o.id === selectAreaLayer);
    if (layer) {
      setSelectionMode({ type: "Selecting", name: layer.name });
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

      <ButtonGroup attached variant="ghost" size="sm">
        <IconButton
          aria-label="Select area on map"
          {...buttonProps}
          h="20px"
          px="4px"
          onClick={activateCurrentLayerSelection}
        >
          <HandPointingIcon size={14} />
        </IconButton>
        <Menu.Root
          positioning={{ placement: "bottom-end" }}
          onSelect={({ value }) => setSelectAreaLayer(value as LayerId)}
        >
          <Menu.Trigger asChild>
            <IconButton
              aria-label="Select area from options"
              {...buttonProps}
              minW="0"
              h="20px"
              px="2px"
              borderLeftRadius={0}
            >
              <CaretDownIcon size={10} />
            </IconButton>
          </Menu.Trigger>
          <Portal>
            <Menu.Positioner>
              <Menu.Content zIndex={1500}>
                {selectLayerOptions.map(({ id, name }) => (
                  <Menu.Item
                    key={id}
                    value={id}
                    disabled={id === selectAreaLayer}
                    onClick={() =>
                      setSelectionMode({
                        type: "Selecting",
                        name: name,
                      })
                    }
                  >
                    {name}
                  </Menu.Item>
                ))}
              </Menu.Content>
            </Menu.Positioner>
          </Portal>
        </Menu.Root>
      </ButtonGroup>

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

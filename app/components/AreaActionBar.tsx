import { Button, Flex, Text } from "@chakra-ui/react";
import { SelectionPlusIcon, UploadSimpleIcon } from "@phosphor-icons/react";
import { useEffect, useState, type ReactNode } from "react";

import type { DrawAreaSlice } from "@/app/store/drawAreaSlice";
import useMapStore from "@/app/store/mapStore";
import type { FeatureRef } from "@/app/store/layerManagerSlice";
import { formatAreaWithUnits } from "@/app/utils/formatArea";
import { MAX_AREA_KM2, MIN_AREA_KM2 } from "@/src/entities/custom-area";

/**
 * Draw and Upload for the `AreasPanel`, above the filter chips. While drawing,
 * the bar becomes a one-line status strip: how to draw, then — once the shape
 * is closed — its name with Cancel / Redraw / Save area. A shape that's too
 * small or too large ends the drawing and shows why in the same strip. This
 * replaces the map's old "Drawing AOI" banner and validation toast. Picking an area on the map is done
 * from the Boundaries tab (show a boundary layer, then click a feature).
 *
 * The strip is the only drawing UI, so closing the panel mid-draw cancels it
 * rather than leaving the map in polygon mode with no controls.
 */
export function AreaActionBar({
  hideIdle = false,
}: {
  /** Hides Draw / Upload (e.g. while searching); a drawing still shows. */
  hideIdle?: boolean;
}) {
  const isDrawingMode = useMapStore((s) => s.isDrawingMode);
  const validationError = useMapStore((s) => s.validationError);
  const startDrawing = useMapStore((s) => s.startDrawing);
  const setSelectionMode = useMapStore((s) => s.setSelectionMode);
  const toggleUploadAreaDialog = useMapStore((s) => s.toggleUploadAreaDialog);

  useEffect(
    () => () => {
      const { isDrawingMode, cancelDrawing } = useMapStore.getState();
      if (isDrawingMode) cancelDrawing();
    },
    []
  );

  function handleDraw() {
    startDrawing();
    setSelectionMode({ type: "Drawing", name: undefined });
  }

  function handleUpload() {
    toggleUploadAreaDialog();
    setSelectionMode({ type: "Uploading", name: undefined });
  }

  if (isDrawingMode) return <DrawingStatus onRedraw={handleDraw} />;
  if (validationError) {
    return <DrawError error={validationError} onRetry={handleDraw} />;
  }
  if (hideIdle) return null;

  return (
    <Flex gap="6px" flexShrink={0}>
      <Button {...actionButtonProps} onClick={handleDraw}>
        <SelectionPlusIcon size={16} />
        Draw on map
      </Button>
      <Button {...actionButtonProps} onClick={handleUpload}>
        <UploadSimpleIcon size={16} />
        Upload file
      </Button>
    </Flex>
  );
}

const actionButtonProps = {
  flex: 1,
  size: "sm",
  variant: "outline",
  fontSize: "12px",
  fontWeight: "semibold",
  color: "#3A4048",
  borderColor: "rgba(19, 22, 25, 0.3)",
  borderRadius: "4px",
} as const;

const stripButtonProps = {
  size: "xs",
  fontSize: "11px",
  borderRadius: "4px",
} as const;

const STRIP_TONES = {
  info: { role: "status", bg: "#F2F6FF", borderColor: "#B7C9F0" },
  error: { role: "alert", bg: "#FFF5F5", borderColor: "#F2B8B5" },
} as const;

/** The one-line bar under the actions: drawing progress or a draw error. */
function Strip({
  tone,
  children,
}: {
  tone: keyof typeof STRIP_TONES;
  children: ReactNode;
}) {
  const { role, bg, borderColor } = STRIP_TONES[tone];
  return (
    <Flex
      role={role}
      flexShrink={0}
      align="center"
      gap="6px"
      minH="40px"
      py="4px"
      pl="10px"
      pr="4px"
      bg={bg}
      border="1px solid"
      borderColor={borderColor}
      borderRadius="4px"
    >
      {children}
    </Flex>
  );
}

function DrawingStatus({ onRedraw }: { onRedraw: () => void }) {
  const pending = useMapStore((s) => s.pendingDrawnArea);
  const cancelDrawing = useMapStore((s) => s.cancelDrawing);
  const confirmDrawing = useMapStore((s) => s.confirmDrawing);
  const addLayer = useMapStore((s) => s.addLayer);
  const addToRegistry = useMapStore((s) => s.addToRegistry);
  const flyToGeoJson = useMapStore((s) => s.flyToGeoJson);
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    if (saving) return;
    setSaving(true);
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
        properties: { id, name },
      };
      const featureRef: FeatureRef = { name, source: "custom" };

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
    } finally {
      setSaving(false);
    }
  }

  // A null name means the shape is closed and its name is still resolving.
  const naming = pending?.name === null;

  return (
    <Strip tone="info">
      {pending ? (
        <Text
          flex="1"
          minW={0}
          fontSize="12px"
          fontWeight="semibold"
          color={naming ? "#656E7B" : "#3A4048"}
          title={pending.name ?? undefined}
          truncate
        >
          {pending.name ?? "Naming area…"}
        </Text>
      ) : (
        <Text flex="1" minW={0} fontSize="11px" color="#3A4048">
          Click the map to add points; double-click to finish.
        </Text>
      )}
      <Button
        {...stripButtonProps}
        variant="ghost"
        color="#656E7B"
        disabled={saving}
        onClick={cancelDrawing}
      >
        Cancel
      </Button>
      {pending && (
        <>
          <Button
            {...stripButtonProps}
            variant="outline"
            disabled={saving}
            onClick={onRedraw}
          >
            Redraw
          </Button>
          <Button
            {...stripButtonProps}
            colorPalette="primary"
            disabled={naming || saving}
            onClick={handleSave}
          >
            Save area
          </Button>
        </>
      )}
    </Strip>
  );
}

type DrawValidationError = NonNullable<DrawAreaSlice["validationError"]>;

/** "Area too large: 4,322,548 km². Maximum is 10,000 km²." */
export function drawErrorMessage({ code, area }: DrawValidationError): string {
  return code === "too-small"
    ? `Area too small: ${formatAreaWithUnits(area)}. Minimum is ${formatAreaWithUnits(MIN_AREA_KM2)}.`
    : `Area too large: ${formatAreaWithUnits(area)}. Maximum is ${formatAreaWithUnits(MAX_AREA_KM2)}.`;
}

function DrawError({
  error,
  onRetry,
}: {
  error: DrawValidationError;
  onRetry: () => void;
}) {
  const clearValidationError = useMapStore((s) => s.clearValidationError);

  return (
    <Strip tone="error">
      <Text flex="1" minW={0} fontSize="11px" color="#3A4048">
        {drawErrorMessage(error)}
      </Text>
      <Button
        {...stripButtonProps}
        variant="ghost"
        color="#656E7B"
        onClick={clearValidationError}
      >
        Dismiss
      </Button>
      <Button {...stripButtonProps} variant="outline" onClick={onRetry}>
        Try again
      </Button>
    </Strip>
  );
}

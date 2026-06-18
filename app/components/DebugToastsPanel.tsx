"use client";

import { useState } from "react";
import { Box, Button, CloseButton, Stack, Text } from "@chakra-ui/react";
import { BugIcon, CaretDownIcon, CaretUpIcon } from "@phosphor-icons/react";
import {
  showApiError,
  showError,
  showServiceUnavailableError,
} from "@/app/hooks/useErrorHandler";
import { toaster } from "@/app/components/ui/toaster";
import { pickAoiTool } from "@/app/store/chat-tools/pickAoi";
import { pickDatasetTool } from "@/app/store/chat-tools/pickDataset";
import type { DatasetInfo } from "@/app/types/chat";
import useMapStore from "@/app/store/mapStore";
import useChatStore from "@/app/store/chatStore";
import { getToolErrorMessage } from "@/app/lib/tool-display";

const GLOBAL_LAYER_ID = "Global Layer";

// Dev-only mocks — exercise the full pickDataset → contextStore → map pipeline
// without the backend. Both use an existing DATASET_CARDS entry so the legend
// renders correctly.
const MOCK_VECTOR_DATASET: DatasetInfo = {
  dataset_id: 10,
  dataset_name: "Tree cover loss due to fires",
  tile_url:
    "https://tiles.globalforestwatch.org/umd_tree_cover_loss_from_fires/latest/dynamic/{z}/{x}/{y}.png?tree_cover_density_threshold=30&render_type=true_color",
  context_layer: "intact_forest",
  context_layers: [
    {
      name: "intact_forest",
      tile_url:
        "https://tiles.globalforestwatch.org/ifl_intact_forest_landscapes/v2021/default/{z}/{x}/{y}.pbf",
      source_layer: "ifl_intact_forest_landscapes",
    },
  ],
  reason:
    "Dev-only mock: vector (MVT) IFL context layer rendered beneath Tree Cover Loss due to fires.",
};

// Raster version of the same IFL layer — lets you compare MVT vs raster side-by-side.
const MOCK_RASTER_IFL_DATASET: DatasetInfo = {
  dataset_id: 10,
  dataset_name: "Tree cover loss due to fires",
  tile_url:
    "https://tiles.globalforestwatch.org/umd_tree_cover_loss_from_fires/latest/dynamic/{z}/{x}/{y}.png?tree_cover_density_threshold=30&render_type=true_color",
  context_layer: "intact_forest",
  context_layers: [
    {
      name: "intact_forest",
      tile_url:
        "https://tiles.globalforestwatch.org/ifl_intact_forest_landscapes/v2025/default/{z}/{x}/{y}.png",
    },
  ],
  reason:
    "Dev-only mock: raster IFL context layer rendered beneath Tree Cover Loss due to fires.",
};

const MOCK_RASTER_PRIMARY_FOREST_DATASET: DatasetInfo = {
  dataset_id: 10,
  dataset_name: "Tree cover loss due to fires",
  tile_url:
    "https://tiles.globalforestwatch.org/umd_tree_cover_loss_from_fires/latest/dynamic/{z}/{x}/{y}.png?tree_cover_density_threshold=30&render_type=true_color",
  context_layer: "primary_forest",
  context_layers: [
    {
      name: "primary_forest",
      tile_url:
        "https://tiles.globalforestwatch.org/umd_regional_primary_forest_2001/v201901/uint16/{z}/{x}/{y}.png",
    },
  ],
  reason:
    "Dev-only mock: raster Primary Forests context layer rendered beneath Tree Cover Loss due to fires.",
};

const TOOL_ERROR_OPTIONS: Array<{ name: string; label: string }> = [
  { name: "generate_insights", label: "Insights" },
  { name: "pick_aoi", label: "AOI" },
  { name: "pick_dataset", label: "Dataset" },
  { name: "pull_data", label: "Data" },
  { name: "unknown_tool", label: "Unknown" },
];

function DebugToastsPanel({
  enabled,
  inline,
}: {
  enabled?: boolean;
  inline?: boolean;
}) {
  const envEnabled = process.env.NEXT_PUBLIC_ENABLE_DEBUG_TOOLS === "true";
  const active = enabled ?? envEnabled;
  const [dismissed, setDismissed] = useState(false);
  const [collapsed, setCollapsed] = useState(true);
  const layers = useMapStore((s) => s.layers);
  const removeLayer = useMapStore((s) => s.removeLayer);
  const addMessage = useChatStore((s) => s.addMessage);

  const globalLayerActive = layers.some((l) => l.id === GLOBAL_LAYER_ID);

  const triggerToolError = (toolName: string) => {
    addMessage({
      type: "warning",
      message: getToolErrorMessage(toolName),
      timestamp: new Date().toISOString(),
    });
  };

  const handleToggleGlobalLayer = () => {
    if (globalLayerActive) {
      removeLayer(GLOBAL_LAYER_ID);
    } else {
      pickAoiTool(
        {
          type: "tool",
          name: "pick_aoi",
          timestamp: new Date().toISOString(),
          aoi_selection: {
            name: "All countries in the world",
            aois: [],
          },
        },
        () => {}
      );
    }
  };

  const handleMockVectorDataset = () => {
    pickDatasetTool(
      {
        type: "tool",
        name: "pick_dataset",
        timestamp: new Date().toISOString(),
        dataset: MOCK_VECTOR_DATASET,
      },
      addMessage
    );
  };

  const handleMockRasterIflDataset = () => {
    pickDatasetTool(
      {
        type: "tool",
        name: "pick_dataset",
        timestamp: new Date().toISOString(),
        dataset: MOCK_RASTER_IFL_DATASET,
      },
      addMessage
    );
  };

  const handleMockRasterPrimaryForestDataset = () => {
    pickDatasetTool(
      {
        type: "tool",
        name: "pick_dataset",
        timestamp: new Date().toISOString(),
        dataset: MOCK_RASTER_PRIMARY_FOREST_DATASET,
      },
      addMessage
    );
  };

  if (!active || dismissed) return null;

  const pill = (
    <Button
      size="xs"
      variant="subtle"
      colorPalette="gray"
      onClick={() => setCollapsed((v) => !v)}
    >
      <BugIcon size={12} /> Debug{" "}
      {collapsed ? <CaretDownIcon size={10} /> : <CaretUpIcon size={10} />}
    </Button>
  );

  const panelContent = (
    <>
      <Box
        display="flex"
        justifyContent="space-between"
        alignItems="center"
        mb="2"
      >
        <Text fontSize="xs" fontWeight="600" color="gray.600">
          Debug
        </Text>
        <CloseButton size="2xs" onClick={() => setDismissed(true)} />
      </Box>

      <Stack direction="row" gap="3" align="flex-start">
        <Box>
          <Text fontSize="2xs" fontWeight="500" color="gray.400" mb="1">
            Layers
          </Text>
          <Stack direction="column" gap="1">
            <Button
              size="2xs"
              colorPalette={globalLayerActive ? "red" : "blue"}
              variant="subtle"
              onClick={handleToggleGlobalLayer}
            >
              {globalLayerActive ? "Remove Global" : "Global Layer"}
            </Button>
            <Button
              size="2xs"
              colorPalette="green"
              variant="subtle"
              onClick={handleMockVectorDataset}
            >
              MVT context
            </Button>
            <Button
              size="2xs"
              colorPalette="orange"
              variant="subtle"
              onClick={handleMockRasterIflDataset}
            >
              IFL raster
            </Button>
            <Button
              size="2xs"
              colorPalette="orange"
              variant="subtle"
              onClick={handleMockRasterPrimaryForestDataset}
            >
              Primary forest
            </Button>
          </Stack>
        </Box>

        <Box>
          <Text fontSize="2xs" fontWeight="500" color="gray.400" mb="1">
            Toasts
          </Text>
          <Stack direction="column" gap="1">
            <Button
              size="2xs"
              onClick={() => showServiceUnavailableError("Demo Service")}
            >
              Unavailable
            </Button>
            <Button
              size="2xs"
              onClick={() =>
                showApiError("Example API error message", {
                  title: "API Error",
                })
              }
            >
              API Error
            </Button>
            <Button
              size="2xs"
              onClick={() => showError("Generic error message")}
            >
              Error
            </Button>
            <Button
              size="2xs"
              onClick={() =>
                toaster.create({
                  title: "Warning",
                  description: "This is a warning toast",
                  type: "warning",
                  closable: true,
                  duration: 3000,
                })
              }
            >
              Warning
            </Button>
            <Button
              size="2xs"
              onClick={() =>
                toaster.create({
                  title: "Success",
                  description: "This is a success toast",
                  type: "success",
                  closable: true,
                  duration: 3000,
                })
              }
            >
              Success
            </Button>
            <Button
              size="2xs"
              onClick={() =>
                toaster.create({
                  title: "Info",
                  description: "This is an info toast",
                  type: "info",
                  closable: true,
                  duration: 3000,
                })
              }
            >
              Info
            </Button>
          </Stack>
        </Box>

        <Box>
          <Text fontSize="2xs" fontWeight="500" color="gray.400" mb="1">
            Tool errors
          </Text>
          <Stack direction="column" gap="1">
            {TOOL_ERROR_OPTIONS.map(({ name, label }) => (
              <Button
                key={name}
                size="2xs"
                variant="subtle"
                onClick={() => triggerToolError(name)}
              >
                {label}
              </Button>
            ))}
          </Stack>
        </Box>
      </Stack>
    </>
  );

  const panelBox = (
    <Box
      bg="white"
      border="1px solid"
      borderColor="#E0E2E5"
      borderRadius="md"
      p="2"
      boxShadow="sm"
    >
      {panelContent}
    </Box>
  );

  if (inline) {
    return (
      <Box position="relative">
        {pill}
        {!collapsed && (
          <Box
            position="absolute"
            bottom="calc(100% + 4px)"
            right="0"
            zIndex={9999}
          >
            {panelBox}
          </Box>
        )}
      </Box>
    );
  }

  if (collapsed) {
    return (
      <Box position="fixed" bottom="4" right="4" zIndex={9999}>
        {pill}
      </Box>
    );
  }

  return (
    <Box position="fixed" bottom="4" right="4" zIndex={9999}>
      {panelBox}
    </Box>
  );
}

export default DebugToastsPanel;

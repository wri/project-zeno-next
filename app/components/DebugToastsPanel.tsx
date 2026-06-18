"use client";

import { useState } from "react";
import { useSearchParams } from "next/navigation";
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

const TOAST_TRIGGERS = [
  { label: "Warning", type: "warning" },
  { label: "Success", type: "success" },
  { label: "Info", type: "info" },
] as const;

function DebugToastsPanel({ enabled }: { enabled?: boolean }) {
  const params = useSearchParams();
  const active =
    enabled ??
    (process.env.NEXT_PUBLIC_ENABLE_DEBUG_TOOLS === "true" ||
      params.get("debug") === "1");
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

  const handleMockDataset = (dataset: DatasetInfo) => {
    pickDatasetTool(
      {
        type: "tool",
        name: "pick_dataset",
        timestamp: new Date().toISOString(),
        dataset,
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

  const panel = (
    <Box
      bg="white"
      border="1px solid"
      borderColor="#E0E2E5"
      borderRadius="md"
      p="2"
      boxShadow="sm"
    >
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
              onClick={() => handleMockDataset(MOCK_VECTOR_DATASET)}
            >
              MVT context
            </Button>
            <Button
              size="2xs"
              colorPalette="orange"
              variant="subtle"
              onClick={() => handleMockDataset(MOCK_RASTER_IFL_DATASET)}
            >
              IFL raster
            </Button>
            <Button
              size="2xs"
              colorPalette="orange"
              variant="subtle"
              onClick={() =>
                handleMockDataset(MOCK_RASTER_PRIMARY_FOREST_DATASET)
              }
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
            {TOAST_TRIGGERS.map(({ label, type }) => (
              <Button
                key={type}
                size="2xs"
                onClick={() =>
                  toaster.create({
                    title: label,
                    description: `This is a ${type} toast`,
                    type,
                    closable: true,
                    duration: 3000,
                  })
                }
              >
                {label}
              </Button>
            ))}
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
    </Box>
  );

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
          {panel}
        </Box>
      )}
    </Box>
  );
}

export default DebugToastsPanel;

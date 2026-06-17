"use client";

import { useState } from "react";
import { Box, Button, CloseButton, Menu, Stack, Text } from "@chakra-ui/react";
import { CaretDownIcon } from "@phosphor-icons/react";
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

function DebugToastsPanel({ enabled }: { enabled?: boolean }) {
  const envEnabled = process.env.NEXT_PUBLIC_ENABLE_DEBUG_TOOLS === "true";
  const active = enabled ?? envEnabled;
  const [dismissed, setDismissed] = useState(false);
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

  return (
    <Box
      position="fixed"
      bottom="4"
      right="4"
      zIndex={1000}
      bg="white"
      border="1px solid"
      borderColor="#E0E2E5"
      borderRadius="md"
      p="3"
      boxShadow="sm"
    >
      <Box
        display="flex"
        justifyContent="space-between"
        alignItems="center"
        mb="2"
      >
        <Text fontSize="xs" fontWeight="600">
          Debug: Trigger Toasts
        </Text>
        <CloseButton size="2xs" onClick={() => setDismissed(true)} />
      </Box>
      <Stack direction="row" gap="2" wrap="wrap">
        <Button
          size="xs"
          colorPalette={globalLayerActive ? "red" : "blue"}
          variant="subtle"
          onClick={handleToggleGlobalLayer}
        >
          {globalLayerActive ? "Remove Global Layer" : "Toggle Global Layer"}
        </Button>
        <Button
          size="xs"
          colorPalette="green"
          variant="subtle"
          onClick={handleMockVectorDataset}
        >
          Mock MVT context
        </Button>
        <Button
          size="xs"
          colorPalette="orange"
          variant="subtle"
          onClick={handleMockRasterIflDataset}
        >
          Mock IFL raster
        </Button>
        <Button
          size="xs"
          colorPalette="orange"
          variant="subtle"
          onClick={handleMockRasterPrimaryForestDataset}
        >
          Mock primary forest raster
        </Button>
        <Button
          size="xs"
          onClick={() => showServiceUnavailableError("Demo Service")}
        >
          Service Unavailable
        </Button>
        <Button
          size="xs"
          onClick={() =>
            showApiError("Example API error message", { title: "API Error" })
          }
        >
          API Error
        </Button>
        <Button size="xs" onClick={() => showError("Generic error message")}>
          Generic Error
        </Button>
        <Button
          size="xs"
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
          size="xs"
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
          size="xs"
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
        <Menu.Root positioning={{ strategy: "fixed", hideWhenDetached: true }}>
          <Menu.Trigger asChild>
            <Button size="xs" variant="subtle">
              Tool Error <CaretDownIcon size={12} />
            </Button>
          </Menu.Trigger>
          <Menu.Positioner>
            <Menu.Content>
              {TOOL_ERROR_OPTIONS.map(({ name, label }) => (
                <Menu.Item
                  key={name}
                  value={name}
                  onSelect={() => triggerToolError(name)}
                >
                  {label}
                </Menu.Item>
              ))}
            </Menu.Content>
          </Menu.Positioner>
        </Menu.Root>
      </Stack>
    </Box>
  );
}

export default DebugToastsPanel;

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
import useMapStore from "@/app/store/mapStore";
import useChatStore from "@/app/store/chatStore";
import { getToolErrorMessage } from "@/app/lib/tool-display";

const GLOBAL_LAYER_ID = "global-layer";

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
        () => {},
      );
    }
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
      <Box display="flex" justifyContent="space-between" alignItems="center" mb="2">
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

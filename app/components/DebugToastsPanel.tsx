"use client";

import { Box, Button, Stack, Text } from "@chakra-ui/react";
import {
  showApiError,
  showError,
  showServiceUnavailableError,
} from "@/app/hooks/useErrorHandler";
import { toaster } from "@/app/components/ui/toaster";

function DebugToastsPanel({ enabled }: { enabled?: boolean }) {
  const envEnabled = process.env.NEXT_PUBLIC_ENABLE_DEBUG_TOOLS === "true";
  const active = enabled ?? envEnabled;

  if (!active) return null;

  return (
    <Box
      position="fixed"
      bottom="4"
      left="4"
      zIndex={1000}
      bg="white"
      border="1px solid"
      borderColor="#E0E2E5"
      borderRadius="md"
      p="3"
      boxShadow="sm"
    >
      <Text fontSize="xs" fontWeight="600" mb="2">
        Debug: Trigger Toasts
      </Text>
      <Stack direction="row" gap="2" wrap="wrap">
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
              type: "Warning",
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
      </Stack>
    </Box>
  );
}

export default DebugToastsPanel;

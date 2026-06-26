"use client";

import { Box, Flex, IconButton, Text } from "@chakra-ui/react";
import { XIcon } from "@phosphor-icons/react";

import { MAX_AREA_KM2, MIN_AREA_KM2 } from "@/app/constants/custom-areas";
import { getMapFeedbackLeftPx } from "@/app/explorationLayout";
import useMapStore from "@/app/store/mapStore";
import useSidebarStore from "@/app/store/sidebarStore";
import { formatAreaWithUnits } from "@/app/utils/formatArea";

import { Tooltip } from "./ui/tooltip";

/**
 * Selection-mode banner and draw-validation errors. Mounted in the desktop
 * exploration layout above the catalog/areas column so toasts are not clipped.
 */
export default function MapAreaFeedback() {
  const { selectionMode, validationError } = useMapStore();
  const { isChatFullSize, dataCatalogOpen, areasPanelOpen } = useSidebarStore();
  const catalogColumnOpen = dataCatalogOpen || areasPanelOpen;

  if (!selectionMode && !validationError) return null;

  const left = `${getMapFeedbackLeftPx(isChatFullSize, catalogColumnOpen)}px`;

  return (
    <Flex
      position="absolute"
      top={2}
      left={{ base: 2, md: left }}
      flexDirection="column"
      gap={2}
      pointerEvents="none"
      alignItems="flex-start"
    >
      {selectionMode && (
        <Box
          px={3}
          py={1}
          bg="bg"
          borderRadius="md"
          boxShadow="sm"
          color="blackAlpha.700"
          pointerEvents="auto"
        >
          {selectionMode.type}{" "}
          {selectionMode.type === "Selecting" ? selectionMode.name : "AOI"}
        </Box>
      )}
      {validationError && (
        <ValidationErrorDisplay validationError={validationError} />
      )}
    </Flex>
  );
}

/** Mobile map overlay — same content, positioned inside `MapAreaControls`. */
export function MapAreaFeedbackMobile() {
  const { selectionMode, validationError } = useMapStore();

  if (!selectionMode && !validationError) return null;

  return (
    <Flex
      flexDirection="column"
      gap={2}
      pointerEvents="none"
      alignItems="flex-start"
      order={-1}
    >
      {selectionMode && (
        <Box
          px={3}
          py={1}
          bg="bg"
          borderRadius="md"
          boxShadow="sm"
          color="blackAlpha.700"
          pointerEvents="auto"
        >
          {selectionMode.type}{" "}
          {selectionMode.type === "Selecting" ? selectionMode.name : "AOI"}
        </Box>
      )}
      {validationError && (
        <ValidationErrorDisplay validationError={validationError} />
      )}
    </Flex>
  );
}

function ValidationErrorDisplay({
  validationError,
}: {
  validationError: NonNullable<
    ReturnType<typeof useMapStore.getState>["validationError"]
  >;
}) {
  const clearValidationError = useMapStore((s) => s.clearValidationError);

  return (
    <Box
      px={3}
      py={2}
      bg="bg"
      minW="14rem"
      borderColor="red.muted"
      borderWidth="1px"
      borderRadius="md"
      boxShadow="sm"
      position="relative"
      pointerEvents="auto"
    >
      <Tooltip content="Close area validation error">
        <IconButton
          position="absolute"
          colorPalette="red"
          variant="ghost"
          top={1}
          right={1}
          size="xs"
          h="initial"
          minW="initial"
          aria-label="Close validation error"
          onClick={clearValidationError}
          pointerEvents="auto"
        >
          <XIcon size={10} />
        </IconButton>
      </Tooltip>
      <Text fontWeight="semibold" fontSize="sm" mb={1}>
        {validationError.code === "too-small"
          ? "Error: Area too small"
          : "Error: Area too large"}
      </Text>
      <Flex fontSize="xs" color="fg.muted" justifyContent="space-between">
        <Text>
          {validationError.code === "too-small" ? "Minimum" : "Maximum"} area
        </Text>
        <Text>
          {validationError.code === "too-small"
            ? formatAreaWithUnits(MIN_AREA_KM2)
            : formatAreaWithUnits(MAX_AREA_KM2)}
        </Text>
      </Flex>
      <Flex fontSize="xs" color="fg.muted" justifyContent="space-between">
        <Text>Your area</Text>
        <Text>{formatAreaWithUnits(validationError.area)}</Text>
      </Flex>
    </Box>
  );
}

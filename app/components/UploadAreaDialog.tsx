import {
  Dialog,
  Portal,
  Button,
  CloseButton,
  Text,
  Box,
  Link,
  VisuallyHidden,
} from "@chakra-ui/react";
import useMapStore from "../store/mapStore";
import { useRef, useState, useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  BATCH_UPLOAD_MAX_FILE_SIZE_MB,
  MAX_FILE_SIZE_MB,
} from "../constants/custom-areas";
import {
  isBatchUploadFile,
  UPLOAD_DIALOG_FILE_TYPES,
} from "../store/uploadAreaSlice";
import { UploadSimpleIcon } from "@phosphor-icons/react";
import { useCustomAreasCreate } from "../hooks/useCustomAreasCreate";
import { toaster } from "./ui/toaster";

function UploadAreaDialog() {
  const {
    dialogVisible,
    toggleUploadAreaDialog,
    uploadFile,
    uploadBatchFile,
    selectedFile,
    isUploading,
    isFileSelected,
    setCreateAreaFn,
    addToRegistry,
    addLayer,
    flyToGeoJson,
  } = useMapStore();

  const queryClient = useQueryClient();
  const { createAreaAsync, isCreating } = useCustomAreasCreate();

  useEffect(() => {
    setCreateAreaFn(createAreaAsync);
  }, [setCreateAreaFn, createAreaAsync]);

  const handleBatchUpload = async () => {
    const result = await uploadBatchFile();
    if (!result) return;

    queryClient.invalidateQueries({ queryKey: ["customAreas"] });
    const count = result.areas.length;
    toaster.create({
      title: count === 1 ? "1 area uploaded" : `${count} areas uploaded`,
      description: "Find them under Monitored areas in the Areas panel.",
      type: "success",
      duration: 5000,
    });
  };

  const handleUpload = async () => {
    if (selectedFile && isBatchUploadFile(selectedFile.name)) {
      await handleBatchUpload();
      return;
    }

    try {
      const result = await uploadFile();
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

      addToRegistry({
        ref: { name, source: "custom" },
        data: feat,
        srcId: id,
        subtype: "custom-area",
      });
      // The visible layer IS the scope — no separate context item.
      addLayer({
        id,
        name,
        type: "geojson",
        visible: true,
        featureRefs: [{ name, source: "custom" }],
      });

      flyToGeoJson(feat);
    } catch (error) {
      console.error("Upload failed:", error);
    }
  };

  return (
    <Dialog.Root
      placement="center"
      size="lg"
      open={dialogVisible}
      onOpenChange={toggleUploadAreaDialog}
    >
      <Portal>
        <Dialog.Positioner>
          <Dialog.Content>
            <Dialog.Header>
              <Dialog.Title>
                {isUploading || isCreating
                  ? "Uploading Area..."
                  : "Upload Area"}
              </Dialog.Title>
            </Dialog.Header>
            <Dialog.Body
              spaceY="2"
              paddingTop="2"
              paddingRight="6"
              paddingBottom="2"
              paddingLeft="6"
            >
              {!isFileSelected ? <DropFileZone /> : <SelectedFileBox />}
              <Box color="fg.muted" fontSize="xs">
                <Text>
                  By uploading data you agree to the{" "}
                  <Link
                    href="https://www.wri.org/about/legal/general-terms-use"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    terms of use
                  </Link>
                  .
                </Text>
              </Box>
            </Dialog.Body>
            <Dialog.Footer>
              <Dialog.ActionTrigger asChild>
                <Button
                  variant="outline"
                  colorPalette="gray"
                  disabled={isUploading}
                >
                  Cancel
                </Button>
              </Dialog.ActionTrigger>
              <Button
                onClick={handleUpload}
                disabled={!isFileSelected || isUploading || isCreating}
                loading={isUploading || isCreating}
                loadingText="Uploading..."
                colorPalette="primary"
              >
                <UploadSimpleIcon /> Upload
              </Button>
            </Dialog.Footer>
            <Dialog.CloseTrigger asChild>
              <CloseButton size="sm" disabled={isUploading} />
            </Dialog.CloseTrigger>
          </Dialog.Content>
        </Dialog.Positioner>
      </Portal>
    </Dialog.Root>
  );
}

export default UploadAreaDialog;

function DropFileZone() {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { errorType, errorMessage, errorDetails, handleFile } = useMapStore();
  const [isDragOver, setIsDragOver] = useState(false);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);

    const files = e.dataTransfer.files;
    if (files.length > 0) {
      handleFile(files[0]);
    }
  };

  return (
    <Box
      display="flex"
      flexDirection="column"
      alignItems="center"
      bgGradient="to-br"
      gradientFrom={isDragOver ? "primary.100" : "primary.50"}
      gradientTo={isDragOver ? "secondary.100" : "secondary.50"}
      border={isDragOver ? "1px solid" : "1px dashed"}
      borderColor={isDragOver ? "secondary.400" : "secondary.700"}
      borderRadius="lg"
      gap="8px"
      padding="4"
      transition="all 0.2s ease"
      cursor="pointer"
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      onClick={() => fileInputRef.current?.click()}
    >
      <Text lineHeight="20px">
        Drag and drop a <strong>polygon data file</strong> here or click to
        upload.
      </Text>
      <Text fontSize="xs" lineHeight="16px" textAlign="center">
        .geojson up to {MAX_FILE_SIZE_MB} MB, or .csv / zipped shapefile (.zip)
        up to {BATCH_UPLOAD_MAX_FILE_SIZE_MB} MB with one area per row
      </Text>
      <Text fontSize="xs" lineHeight="16px" color="fg.muted" textAlign="center">
        CSV needs a <code>name</code> column and a <code>geom</code> column of
        WKT polygons in lon/lat. Shapefiles need a <code>.prj</code> file and a{" "}
        <code>name</code> attribute.
      </Text>
      {errorType !== "none" && (
        <Box color="red.500" fontSize="sm" maxH="160px" overflowY="auto">
          <Text>{errorMessage}</Text>
          {errorDetails.length > 0 && (
            <Box as="ul" pl="4" listStyleType="disc">
              {errorDetails.map((detail, i) => (
                <li key={`${i}-${detail}`}>{detail}</li>
              ))}
            </Box>
          )}
        </Box>
      )}
      <Button variant="solid" size="2xs" colorPalette="primary">
        Select File
      </Button>
      <VisuallyHidden>
        <input
          ref={fileInputRef}
          type="file"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) handleFile(file);
          }}
          accept={UPLOAD_DIALOG_FILE_TYPES.join(",")}
        />
      </VisuallyHidden>
    </Box>
  );
}

function SelectedFileBox() {
  const { filename, clearFileState } = useMapStore();
  return (
    <Box
      border="1px dashed var(--chakra-colors-secondary-500, #8E9954)"
      borderRadius="md"
      padding="4"
      gap="8px"
      display="flex"
      alignItems="center"
      justifyContent="space-between"
    >
      <Text>📂 {filename}</Text>
      <Button
        variant="ghost"
        size="sm"
        onClick={clearFileState}
        colorPalette="red"
      >
        Clear
      </Button>
    </Box>
  );
}

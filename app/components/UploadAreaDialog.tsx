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
import { useTranslations } from "next-intl";
import {
  ACCEPTED_FILE_TYPES,
  MAX_FILE_SIZE_MB,
} from "../constants/custom-areas";
import { UploadSimpleIcon } from "@phosphor-icons/react";
import { useCustomAreasCreate } from "../hooks/useCustomAreasCreate";
import useContextStore from "../store/contextStore";

function UploadAreaDialog() {
  const t = useTranslations("dialogs");
  const tc = useTranslations("common");
  const {
    dialogVisible,
    toggleUploadAreaDialog,
    uploadFile,
    isUploading,
    isFileSelected,
    setCreateAreaFn,
    addGeoJsonFeature,
    flyToGeoJson,
  } = useMapStore();
  const { addContext } = useContextStore();

  const { createAreaAsync, isCreating } = useCustomAreasCreate();

  useEffect(() => {
    setCreateAreaFn(createAreaAsync);
  }, [setCreateAreaFn, createAreaAsync]);

  const handleUpload = async () => {
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

      addGeoJsonFeature({
        id: id,
        name: name,
        data: feat,
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
                  ? t("upload.uploading")
                  : t("upload.title")}
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
                  {t("upload.termsPrefix")}{" "}
                  <Link
                    href="https://www.wri.org/about/legal/general-terms-use"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    {t("upload.termsLink")}
                  </Link>
                  .
                </Text>
              </Box>
            </Dialog.Body>
            <Dialog.Footer>
              <Dialog.ActionTrigger asChild>
                <Button variant="outline" colorPalette="gray">
                  {tc("buttons.cancel")}
                </Button>
              </Dialog.ActionTrigger>
              <Button
                onClick={handleUpload}
                disabled={!isFileSelected || isUploading || isCreating}
                loading={isUploading || isCreating}
                loadingText={t("upload.uploadingButton")}
                colorPalette="primary"
              >
                <UploadSimpleIcon /> {t("upload.uploadButton")}
              </Button>
            </Dialog.Footer>
            <Dialog.CloseTrigger asChild>
              <CloseButton size="sm" />
            </Dialog.CloseTrigger>
          </Dialog.Content>
        </Dialog.Positioner>
      </Portal>
    </Dialog.Root>
  );
}

export default UploadAreaDialog;

function DropFileZone() {
  const t = useTranslations("dialogs");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { errorType, errorMessage, handleFile } = useMapStore();
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
        {t("upload.dropzone.dragAndDrop")}
      </Text>
      <Text fontSize="xs" lineHeight="16px">
        {t("upload.dropzone.fileTypes", {
          types: ACCEPTED_FILE_TYPES.join(", "),
          maxSize: MAX_FILE_SIZE_MB,
        })}
      </Text>
      {errorType !== "none" && (
        <Text color="red.500" fontSize="sm">
          {errorMessage}
        </Text>
      )}
      <Button variant="solid" size="2xs" colorPalette="primary">
        {t("upload.dropzone.selectFile")}
      </Button>
      <VisuallyHidden>
        <input
          ref={fileInputRef}
          type="file"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) handleFile(file);
          }}
          accept={ACCEPTED_FILE_TYPES.join(",")}
        />
      </VisuallyHidden>
    </Box>
  );
}

function SelectedFileBox() {
  const t = useTranslations("dialogs");
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
        {t("upload.clear")}
      </Button>
    </Box>
  );
}

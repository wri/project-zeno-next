import {
  Dialog,
  Portal,
  Button,
  CloseButton,
  Text,
  Box,
  Link,
} from "@chakra-ui/react";
import useUploadAreaStore from "../store/uploadAreaStore";
import { useRef, useState } from "react";
import { ACCEPTED_FILE_TYPES, MAX_FILE_SIZE_MB } from "../constants/upload";
import { UploadSimpleIcon } from "@phosphor-icons/react";

function UploadAreaDialog() {
  const {
    dialogVisible,
    toggleUploadAreaDialog,
    uploadFile,
    isUploading,
    isFileSelected,
  } = useUploadAreaStore();

  const handleUpload = async () => {
    await uploadFile();
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
                {isUploading ? "Uploading Area..." : "Upload Area"}
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
                  <Link href="/terms">terms of service</Link>.
                </Text>
              </Box>
            </Dialog.Body>
            <Dialog.Footer>
              <Dialog.ActionTrigger asChild>
                <Button variant="outline" colorPalette="gray">
                  Cancel
                </Button>
              </Dialog.ActionTrigger>
              <Button
                onClick={handleUpload}
                disabled={!isFileSelected || isUploading}
                loading={isUploading}
                loadingText="Uploading..."
                colorPalette="blue"
              >
                <UploadSimpleIcon /> Upload
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
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { errorType, errorMessage, handleFile } = useUploadAreaStore();
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
      background={
        isDragOver
          ? "linear-gradient(106.8deg, #B3D4FF 5.2%, #CCE8F0 14.44%, #F0F8D8 69.9%)"
          : "linear-gradient(106.8deg, #CCE2FF 5.2%, #E0F1FA 14.44%, #F8FCE4 69.9%)"
      }
      border={
        isDragOver
          ? "2px dashed var(--Lime-Lime-60, #A4B85C)"
          : "1px dashed var(--Lime-Lime-70, #8E9954)"
      }
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
      <Text fontSize="xs" lineHeight="16px">
        Files with extension {ACCEPTED_FILE_TYPES.join(", ")} up to{" "}
        {MAX_FILE_SIZE_MB} MB
      </Text>
      {errorType !== "none" && (
        <Text color="red.500" fontSize="sm">
          {errorMessage}
        </Text>
      )}
      <Button
        variant="solid"
        size="2xs"
        colorPalette="blue"
        onClick={() => fileInputRef.current?.click()}
      >
        Select File
      </Button>
      <input
        ref={fileInputRef}
        type="file"
        style={{ display: "none" }}
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) handleFile(file);
        }}
        accept={ACCEPTED_FILE_TYPES.join(",")}
      />
    </Box>
  );
}

function SelectedFileBox() {
  const { filename, clearFileState } = useUploadAreaStore();
  return (
    <Box
      border="1px dashed var(--Lime-Lime-70, #8E9954)"
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

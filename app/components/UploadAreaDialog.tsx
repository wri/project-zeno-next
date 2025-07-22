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
import { useRef } from "react";
import { ACCEPTED_FILE_TYPES, MAX_FILE_SIZE_MB } from "../constants/upload";

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
              paddingBottom="4"
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
                <Button variant="outline">Cancel</Button>
              </Dialog.ActionTrigger>
              <Button
                onClick={handleUpload}
                disabled={!isFileSelected || isUploading}
              >
                {isUploading ? "Uploading..." : "Upload"}
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
  const { errorType, errorMessage, handleFileChange } = useUploadAreaStore();
  return (
    <Box
      display="flex"
      flexDirection="column"
      alignItems="center"
      background="linear-gradient(106.8deg, #CCE2FF 5.2%, #E0F1FA 14.44%, #F8FCE4 69.9%)"
      border="1px dashed var(--Lime-Lime-70, #8E9954)"
      borderRadius="md"
      gap="8px"
      padding="4"
    >
      <Text lineHeight="20px">
        Drag and drop a <strong>polygon data file</strong> here or click to
        upload.
      </Text>
      <Text fontSize="xs" lineHeight="16px">
        Files with extension {ACCEPTED_FILE_TYPES.join(", ")} up to{" "}
        {MAX_FILE_SIZE_MB} MB
      </Text>
      {errorType !== "none" && <p style={{ color: "red" }}>{errorMessage}</p>}
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
        onChange={handleFileChange}
        accept={ACCEPTED_FILE_TYPES.join(",")}
      />
    </Box>
  );
}

function SelectedFileBox() {
  const { filename } = useUploadAreaStore();
  return (
    <Box
      border="1px dashed var(--Lime-Lime-70, #8E9954)"
      borderRadius="md"
      padding="4"
      gap="8px"
      display="flex"
      alignItems="center"
    >
      <Text>📂 {filename}</Text>
    </Box>
  );
}

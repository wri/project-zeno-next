import { Dialog, Portal, Button, CloseButton } from "@chakra-ui/react";
import useUploadAreaStore from "../store/uploadAreaStore";
import { useRef } from "react";
import { ACCEPTED_FILE_TYPES, MAX_FILE_SIZE_MB } from "../constants/upload";

function UploadAreaDialog() {
  const {
    dialogVisible,
    toggleUploadAreaDialog,
    handleFileChange,
    uploadFile,
    isUploading,
    errorType,
    errorMessage,
    isFileSelected,
    filename,
  } = useUploadAreaStore();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const triggerFileSelect = () => {
    fileInputRef.current?.click();
  };

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
            <Dialog.Body>
              <p>Drag and drop a file here or click to upload.</p>
              <p>Recommended file size &lt; {MAX_FILE_SIZE_MB} MB</p>
              <p>Accepted file types: {ACCEPTED_FILE_TYPES.join(", ")}</p>
              {isFileSelected && <p>Selected: {filename}</p>}
              {errorType !== "none" && (
                <p style={{ color: "red" }}>{errorMessage}</p>
              )}
              <Button variant="outline" onClick={triggerFileSelect}>
                Select file
              </Button>
              <input
                ref={fileInputRef}
                type="file"
                style={{ display: "none" }}
                onChange={handleFileChange}
                accept={ACCEPTED_FILE_TYPES.join(",")}
              />
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

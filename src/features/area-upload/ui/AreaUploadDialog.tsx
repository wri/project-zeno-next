"use client";

import {
  Box,
  Button,
  CloseButton,
  Dialog,
  Link,
  Portal,
  Text,
} from "@chakra-ui/react";
import { UploadSimpleIcon } from "@phosphor-icons/react";

import type { UploadedAreas } from "../model/uploaded-areas";
import { AreaUploadDropzone } from "./AreaUploadDropzone";
import { useAreaUpload } from "./useAreaUpload";

/**
 * The custom-area upload dialog used by every entry point (map areas panel,
 * new-dashboard screen). It validates, uploads and reports errors; the caller
 * decides what happens to the created areas via `onUploaded`, after which the
 * dialog closes itself.
 */
export function AreaUploadDialog({
  open,
  onOpenChange,
  onUploaded,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUploaded: (result: UploadedAreas) => void;
}) {
  const upload = useAreaUpload();
  const { file, isUploading, clear } = upload;

  const requestOpenChange = (next: boolean) => {
    if (next === open) return;
    // Closing mid-upload would reset the dialog while the request still
    // completes on the backend: a re-upload duplicates the batch, and a late
    // failure writes errors into a closed dialog. Every close path (Cancel,
    // the close button, Esc, an overlay click) comes through here.
    if (!next && isUploading) return;
    if (!next) clear();
    onOpenChange(next);
  };

  const handleUpload = async () => {
    const result = await upload.upload();
    if (!result) return;
    onUploaded(result);
    onOpenChange(false);
  };

  return (
    <Dialog.Root
      placement="center"
      size="lg"
      open={open}
      onOpenChange={(e) => requestOpenChange(e.open)}
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
              <AreaUploadDropzone upload={upload} />
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
                onClick={() => void handleUpload()}
                disabled={!file || isUploading}
                loading={isUploading}
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

"use client";

import { useRef, useState } from "react";
import { Box, Button, Text, VisuallyHidden } from "@chakra-ui/react";

import {
  BATCH_UPLOAD_MAX_FILE_SIZE_MB,
  MAX_FILE_SIZE_MB,
  UPLOAD_FILE_TYPES,
} from "@/src/entities/custom-area";

import type { AreaUpload } from "./useAreaUpload";

/**
 * File picker for custom-area uploads: a drag-and-drop zone showing the
 * accepted types and their limits, or the selected file, plus any error with
 * the backend's per-row details.
 */
export function AreaUploadDropzone({
  upload,
}: {
  upload: Pick<
    AreaUpload,
    "file" | "error" | "isUploading" | "selectFile" | "clear"
  >;
}) {
  const { file, error, isUploading, selectFile, clear } = upload;

  return (
    <>
      {file ? (
        <SelectedFileBox
          filename={file.name}
          onClear={clear}
          disabled={isUploading}
        />
      ) : (
        <DropFileZone onFile={(f) => void selectFile(f)} />
      )}
      {error && (
        <Box
          role="alert"
          color="red.500"
          fontSize="sm"
          maxH="160px"
          overflowY="auto"
        >
          <Text>{error.message}</Text>
          {error.details.length > 0 && (
            <Box as="ul" pl="4" listStyleType="disc">
              {error.details.map((detail, i) => (
                <li key={`${i}-${detail}`}>{detail}</li>
              ))}
            </Box>
          )}
        </Box>
      )}
    </>
  );
}

function DropFileZone({ onFile }: { onFile: (file: File) => void }) {
  const fileInputRef = useRef<HTMLInputElement>(null);
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
      onFile(files[0]);
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
      <Button variant="solid" size="2xs" colorPalette="primary">
        Select File
      </Button>
      <VisuallyHidden>
        <input
          ref={fileInputRef}
          type="file"
          aria-label="Area file"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) onFile(file);
            // Re-picking the same file after an error must fire onChange.
            e.target.value = "";
          }}
          accept={UPLOAD_FILE_TYPES.join(",")}
        />
      </VisuallyHidden>
    </Box>
  );
}

function SelectedFileBox({
  filename,
  onClear,
  disabled,
}: {
  filename: string;
  onClear: () => void;
  disabled: boolean;
}) {
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
        onClick={onClear}
        colorPalette="red"
        disabled={disabled}
      >
        Clear
      </Button>
    </Box>
  );
}

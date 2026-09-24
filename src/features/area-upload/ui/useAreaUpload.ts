import { useCallback, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import type { Polygon } from "geojson";

import { useCustomAreasCreate } from "@/app/hooks/useCustomAreasCreate";
import { generateRandomName } from "@/app/utils/generateRandomName";
import {
  AreaUploadError,
  uploadCustomAreasFile,
  validateAreaFile,
} from "@/src/entities/custom-area";

import type { UploadedAreas } from "../model/uploaded-areas";

export interface AreaUploadErrorState {
  message: string;
  /** Per-row problems the backend reported for a rejected CSV/shapefile. */
  details: string[];
}

export interface AreaUpload {
  file: File | null;
  error: AreaUploadErrorState | null;
  isUploading: boolean;
  /** Validates and selects a file; an invalid file leaves nothing selected. */
  selectFile: (file: File) => Promise<void>;
  /** Drops the selected file and any error. No-op while uploading. */
  clear: () => void;
  /**
   * Uploads the selected file: GeoJSON creates one area, CSV/zip one per row.
   * Resolves `undefined` on failure (the error is in `error`) or when an
   * upload is already in flight, so a double click cannot create duplicates.
   */
  upload: () => Promise<UploadedAreas | undefined>;
}

/**
 * State and actions for uploading custom areas from a file, shared by every
 * upload entry point. Map-free: callers decide what to do with the result.
 */
export function useAreaUpload(): AreaUpload {
  const queryClient = useQueryClient();
  const { createAreaAsync } = useCustomAreasCreate();

  const [file, setFile] = useState<File | null>(null);
  // Set for a validated GeoJSON file; null for CSV/zip, which the backend reads.
  const [polygons, setPolygons] = useState<Polygon[] | null>(null);
  const [error, setError] = useState<AreaUploadErrorState | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  // Refs, not state: the guard must hold between a click and the re-render.
  const uploadingRef = useRef(false);
  const selectionRef = useRef(0);

  const selectFile = useCallback(async (next: File) => {
    if (uploadingRef.current) return;
    // Reading a GeoJSON file is async; a later pick must win over a slow one.
    const selection = ++selectionRef.current;
    setError(null);

    const validation = await validateAreaFile(next);
    if (selection !== selectionRef.current) return;

    if (!validation.ok) {
      setFile(null);
      setPolygons(null);
      setError({ message: validation.errorMessage, details: [] });
      return;
    }
    setFile(next);
    setPolygons(validation.kind === "geojson" ? validation.polygons : null);
  }, []);

  const clear = useCallback(() => {
    if (uploadingRef.current) return;
    selectionRef.current++;
    setFile(null);
    setPolygons(null);
    setError(null);
  }, []);

  const upload = useCallback(async (): Promise<UploadedAreas | undefined> => {
    if (uploadingRef.current || !file) return;
    uploadingRef.current = true;
    setIsUploading(true);
    setError(null);

    try {
      let result: UploadedAreas;
      if (polygons) {
        try {
          const area = await createAreaAsync({
            name: generateRandomName(),
            geometries: polygons,
          });
          result = { kind: "geojson", area };
        } catch (err) {
          console.error("Upload error:", err);
          setError({
            message: "Failed to process file. Please try again.",
            details: [],
          });
          return;
        }
      } else {
        try {
          const response = await uploadCustomAreasFile(file);
          result = { kind: "batch", areas: response.areas };
        } catch (err) {
          console.error("Upload error:", err);
          setError(
            err instanceof AreaUploadError
              ? { message: err.message, details: err.details }
              : {
                  message: "Failed to upload file. Please try again.",
                  details: [],
                }
          );
          // The file must be fixed before a retry, so go back to the drop
          // zone, which shows the errors.
          setFile(null);
          return;
        }
        // The GeoJSON create hook invalidates this itself.
        queryClient.invalidateQueries({ queryKey: ["customAreas"] });
      }

      setFile(null);
      setPolygons(null);
      return result;
    } finally {
      uploadingRef.current = false;
      setIsUploading(false);
    }
  }, [file, polygons, createAreaAsync, queryClient]);

  return { file, error, isUploading, selectFile, clear, upload };
}

import { describe, it, expect, beforeEach, vi } from "vitest";

vi.mock("@/app/lib/api-client", () => ({
  apiFetch: vi.fn(),
}));

// The store import chain reaches the Chakra toaster (.tsx), which the node
// test environment can't parse — stub the module boundary.
vi.mock("@/app/components/ui/toaster", () => ({
  toaster: { create: vi.fn() },
  Toaster: () => null,
}));

import { apiFetch } from "@/app/lib/api-client";
import useMapStore from "../mapStore";

const mockedFetch = vi.mocked(apiFetch);

function fileOfSize(name: string, bytes: number): File {
  return new File([new Uint8Array(bytes)], name);
}

const SQUARE = {
  type: "Feature",
  properties: {},
  geometry: {
    type: "Polygon",
    coordinates: [
      [
        [30, 10],
        [30, 10.5],
        [30.5, 10.5],
        [30.5, 10],
        [30, 10],
      ],
    ],
  },
};

describe("uploadAreaSlice", () => {
  beforeEach(() => {
    mockedFetch.mockReset();
    useMapStore.getState().clearFileState();
    useMapStore.setState({ dialogVisible: true });
  });

  it.each(["areas.csv", "AREAS.ZIP"])(
    "selects %s without reading it client-side",
    async (name) => {
      await useMapStore.getState().handleFile(fileOfSize(name, 10));

      const state = useMapStore.getState();
      expect(state.isFileSelected).toBe(true);
      expect(state.filename).toBe(name);
      expect(state.validatedGeoJson).toBeNull();
      expect(state.errorType).toBe("none");
    }
  );

  it("allows CSV/zip files above the 1 MB GeoJSON limit", async () => {
    await useMapStore
      .getState()
      .handleFile(fileOfSize("areas.csv", 5 * 1024 * 1024));

    expect(useMapStore.getState().isFileSelected).toBe(true);
  });

  it("rejects CSV/zip files above 10 MB", async () => {
    await useMapStore
      .getState()
      .handleFile(fileOfSize("areas.zip", 10 * 1024 * 1024 + 1));

    const state = useMapStore.getState();
    expect(state.isFileSelected).toBe(false);
    expect(state.errorType).toBe("file-too-large");
    expect(state.errorMessage).toContain("10MB");
  });

  it("keeps the 1 MB limit for GeoJSON", async () => {
    await useMapStore
      .getState()
      .handleFile(fileOfSize("area.geojson", 1024 * 1024 + 1));

    expect(useMapStore.getState().errorType).toBe("file-too-large");
  });

  it("still validates GeoJSON client-side", async () => {
    await useMapStore
      .getState()
      .handleFile(new File([JSON.stringify(SQUARE)], "area.geojson"));

    const state = useMapStore.getState();
    expect(state.isFileSelected).toBe(true);
    expect(state.validatedGeoJson).toHaveLength(1);
  });

  it("accepts MultiPolygon-only GeoJSON by splitting it into polygons", async () => {
    const multi = {
      type: "Feature",
      properties: {},
      geometry: {
        type: "MultiPolygon",
        coordinates: [
          SQUARE.geometry.coordinates,
          [
            [
              [31, 10],
              [31, 10.5],
              [31.5, 10.5],
              [31.5, 10],
              [31, 10],
            ],
          ],
        ],
      },
    };
    await useMapStore
      .getState()
      .handleFile(new File([JSON.stringify(multi)], "area.geojson"));

    const state = useMapStore.getState();
    expect(state.errorType).toBe("none");
    expect(state.isFileSelected).toBe(true);
    expect(state.validatedGeoJson).toHaveLength(2);
  });

  it("rejects unsupported extensions", async () => {
    await useMapStore.getState().handleFile(fileOfSize("areas.kml", 10));

    const state = useMapStore.getState();
    expect(state.errorType).toBe("file-format-invalid");
    expect(state.errorMessage).toBe(
      "Only .geojson, .csv, .zip files are supported"
    );
  });

  it("uploadBatchFile closes the dialog and returns the created areas", async () => {
    mockedFetch.mockResolvedValue(
      new Response(
        JSON.stringify({
          upload_batch_id: "b1",
          areas: [{ id: "a1", name: "Upland North" }],
        }),
        { status: 200 }
      )
    );
    await useMapStore.getState().handleFile(fileOfSize("areas.csv", 10));

    const result = await useMapStore.getState().uploadBatchFile();

    expect(result?.areas).toEqual([{ id: "a1", name: "Upland North" }]);
    const state = useMapStore.getState();
    expect(state.dialogVisible).toBe(false);
    expect(state.isFileSelected).toBe(false);
    expect(state.isUploading).toBe(false);
  });

  it("uploadBatchFile shows every backend error and returns to the drop zone", async () => {
    mockedFetch.mockResolvedValue(
      new Response(
        JSON.stringify({ detail: { errors: ["row 2: geom is empty"] } }),
        { status: 422 }
      )
    );
    await useMapStore.getState().handleFile(fileOfSize("areas.csv", 10));

    const result = await useMapStore.getState().uploadBatchFile();

    expect(result).toBeUndefined();
    const state = useMapStore.getState();
    expect(state.errorType).toBe("failed-to-send");
    expect(state.errorDetails).toEqual(["row 2: geom is empty"]);
    expect(state.isFileSelected).toBe(false);
    expect(state.dialogVisible).toBe(true);
  });

  it("keeps the dialog open while a batch upload is in flight", async () => {
    let respond!: (response: Response) => void;
    mockedFetch.mockReturnValue(
      new Promise<Response>((resolve) => {
        respond = resolve;
      })
    );
    await useMapStore.getState().handleFile(fileOfSize("areas.csv", 10));

    const pending = useMapStore.getState().uploadBatchFile();
    useMapStore.getState().toggleUploadAreaDialog();

    let state = useMapStore.getState();
    expect(state.dialogVisible).toBe(true);
    expect(state.isUploading).toBe(true);
    expect(state.filename).toBe("areas.csv");

    respond(
      new Response(
        JSON.stringify({ detail: { errors: ["row 2: geom is empty"] } }),
        { status: 422 }
      )
    );
    await pending;

    state = useMapStore.getState();
    expect(state.isUploading).toBe(false);
    expect(state.errorDetails).toEqual(["row 2: geom is empty"]);

    useMapStore.getState().toggleUploadAreaDialog();
    state = useMapStore.getState();
    expect(state.dialogVisible).toBe(false);
    expect(state.errorDetails).toEqual([]);
  });

  it("clearFileState drops backend error details", async () => {
    useMapStore.getState().setError("failed-to-send", "bad", ["row 1: x"]);
    useMapStore.getState().clearFileState();

    expect(useMapStore.getState().errorDetails).toEqual([]);
  });
});

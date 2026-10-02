// @vitest-environment happy-dom
import type { ReactNode } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/app/lib/api-client", () => ({ apiFetch: vi.fn() }));
vi.mock("@/app/components/ui/toaster", () => ({
  toaster: { create: vi.fn() },
  Toaster: () => null,
}));

import { apiFetch } from "@/app/lib/api-client";
import { useAreaUpload } from "../useAreaUpload";
import { fileOfSize, geoJsonFile, jsonResponse } from "./fixtures";

const mockedFetch = vi.mocked(apiFetch);

function setup() {
  const queryClient = new QueryClient({
    defaultOptions: { mutations: { retry: false } },
  });
  const invalidate = vi.spyOn(queryClient, "invalidateQueries");
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
  const hook = renderHook(() => useAreaUpload(), { wrapper });
  return { ...hook, invalidate };
}

describe("useAreaUpload", () => {
  beforeEach(() => {
    mockedFetch.mockReset();
  });

  it("selects a valid GeoJSON file", async () => {
    const { result } = setup();
    await act(() => result.current.selectFile(geoJsonFile()));
    expect(result.current.file?.name).toBe("area.geojson");
    expect(result.current.error).toBeNull();
  });

  it("rejects an invalid file with the shared validator's message", async () => {
    const { result } = setup();
    await act(() => result.current.selectFile(fileOfSize("areas.kml", 10)));
    expect(result.current.file).toBeNull();
    expect(result.current.error).toEqual({
      message: "Only .geojson, .csv, .zip files are supported",
      details: [],
    });
  });

  it("creates one area from GeoJSON", async () => {
    const area = {
      id: "a1",
      name: "Hidden Valley",
      geometries: [],
      created_at: "",
      updated_at: "",
    };
    mockedFetch.mockResolvedValue(jsonResponse(200, area));
    const { result } = setup();
    await act(() => result.current.selectFile(geoJsonFile()));

    let uploaded;
    await act(async () => {
      uploaded = await result.current.upload();
    });

    expect(mockedFetch).toHaveBeenCalledWith(
      "/api/custom_areas",
      expect.objectContaining({ method: "POST" })
    );
    expect(uploaded).toEqual({ kind: "geojson", area });
    expect(result.current.file).toBeNull();
  });

  it("uploads CSV to the batch endpoint and refreshes the areas list", async () => {
    mockedFetch.mockResolvedValue(
      jsonResponse(200, {
        upload_batch_id: "b1",
        areas: [
          { id: "a1", name: "North" },
          { id: "a2", name: "South" },
        ],
      })
    );
    const { result, invalidate } = setup();
    await act(() => result.current.selectFile(fileOfSize("areas.csv", 10)));

    let uploaded;
    await act(async () => {
      uploaded = await result.current.upload();
    });

    expect(mockedFetch).toHaveBeenCalledWith(
      "/api/custom_areas/upload",
      expect.objectContaining({ method: "POST" })
    );
    expect(uploaded).toEqual({
      kind: "batch",
      areas: [
        { id: "a1", name: "North" },
        { id: "a2", name: "South" },
      ],
    });
    expect(invalidate).toHaveBeenCalledWith({ queryKey: ["customAreas"] });
  });

  it("shows every backend row error and returns to the drop zone", async () => {
    mockedFetch.mockResolvedValue(
      jsonResponse(422, { detail: { errors: ["row 2: geom is empty"] } })
    );
    const { result } = setup();
    await act(() => result.current.selectFile(fileOfSize("areas.csv", 10)));

    let uploaded;
    await act(async () => {
      uploaded = await result.current.upload();
    });

    expect(uploaded).toBeUndefined();
    expect(result.current.file).toBeNull();
    expect(result.current.error?.details).toEqual(["row 2: geom is empty"]);
  });

  it("ignores a second upload and clear while one is in flight", async () => {
    let respond!: (response: Response) => void;
    mockedFetch.mockReturnValue(
      new Promise<Response>((resolve) => {
        respond = resolve;
      })
    );
    const { result } = setup();
    await act(() => result.current.selectFile(fileOfSize("areas.csv", 10)));

    let first!: Promise<unknown>;
    act(() => {
      first = result.current.upload();
    });
    await waitFor(() => expect(result.current.isUploading).toBe(true));

    let second;
    await act(async () => {
      second = await result.current.upload();
    });
    act(() => result.current.clear());

    expect(second).toBeUndefined();
    expect(mockedFetch).toHaveBeenCalledTimes(1);
    expect(result.current.file?.name).toBe("areas.csv");

    await act(async () => {
      respond(jsonResponse(200, { upload_batch_id: "b1", areas: [] }));
      await first;
    });
    expect(result.current.isUploading).toBe(false);
  });
});

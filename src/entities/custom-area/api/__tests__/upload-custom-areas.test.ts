import { describe, it, expect, beforeEach, vi } from "vitest";

vi.mock("@/app/lib/api-client", () => ({
  apiFetch: vi.fn(),
}));

import { apiFetch } from "@/app/lib/api-client";
import { AreaUploadError, uploadCustomAreasFile } from "../upload-custom-areas";

const mockedFetch = vi.mocked(apiFetch);

function jsonResponse(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

const csv = new File(["name,geom\n"], "areas.csv", { type: "text/csv" });

describe("uploadCustomAreasFile", () => {
  beforeEach(() => {
    mockedFetch.mockReset();
  });

  it("posts the file as multipart without a Content-Type header", async () => {
    mockedFetch.mockResolvedValue(
      jsonResponse(200, { upload_batch_id: "b1", areas: [] })
    );

    await uploadCustomAreasFile(csv);

    const [path, init] = mockedFetch.mock.calls[0];
    expect(path).toBe("/api/custom_areas/upload");
    expect(init?.method).toBe("POST");
    expect(init?.headers).toBeUndefined();
    const body = init?.body as FormData;
    expect((body.get("file") as File).name).toBe("areas.csv");
  });

  it("returns the batch id and created areas", async () => {
    mockedFetch.mockResolvedValue(
      jsonResponse(200, {
        upload_batch_id: "b1",
        areas: [{ id: "a1", name: "Upland North" }],
      })
    );

    await expect(uploadCustomAreasFile(csv)).resolves.toEqual({
      upload_batch_id: "b1",
      areas: [{ id: "a1", name: "Upland North" }],
    });
  });

  it("exposes every validation error of a 422", async () => {
    mockedFetch.mockResolvedValue(
      jsonResponse(422, {
        detail: { errors: ["row 1: geom is empty", "row 3: name is empty"] },
      })
    );

    const error = await uploadCustomAreasFile(csv).catch((e) => e);
    expect(error).toBeInstanceOf(AreaUploadError);
    expect(error.details).toEqual([
      "row 1: geom is empty",
      "row 3: name is empty",
    ]);
  });

  it("surfaces the backend message of a 413", async () => {
    mockedFetch.mockResolvedValue(
      jsonResponse(413, { detail: "file too large; the limit is 10 MB" })
    );

    await expect(uploadCustomAreasFile(csv)).rejects.toThrow(
      "File too large; the limit is 10 MB"
    );
  });

  it("falls back to a generic message for other failures", async () => {
    mockedFetch.mockResolvedValue(new Response("oops", { status: 500 }));

    const error = await uploadCustomAreasFile(csv).catch((e) => e);
    expect(error).toBeInstanceOf(AreaUploadError);
    expect(error.message).toBe("Failed to upload file. Please try again.");
    expect(error.details).toEqual([]);
  });
});

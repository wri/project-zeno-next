// @vitest-environment happy-dom
import { ChakraProvider, defaultSystem } from "@chakra-ui/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/app/lib/api-client", () => ({ apiFetch: vi.fn() }));
vi.mock("@/app/components/ui/toaster", () => ({
  toaster: { create: vi.fn() },
  Toaster: () => null,
}));

import { apiFetch } from "@/app/lib/api-client";
import { AreaUploadDialog } from "../AreaUploadDialog";
import { fileOfSize, jsonResponse } from "./fixtures";

const mockedFetch = vi.mocked(apiFetch);

function renderDialog() {
  const onOpenChange = vi.fn();
  const onUploaded = vi.fn();
  render(
    <QueryClientProvider client={new QueryClient()}>
      <ChakraProvider value={defaultSystem}>
        <AreaUploadDialog
          open
          onOpenChange={onOpenChange}
          onUploaded={onUploaded}
        />
      </ChakraProvider>
    </QueryClientProvider>
  );
  return { onOpenChange, onUploaded };
}

async function pickFile(file: File) {
  fireEvent.change(screen.getByLabelText("Area file"), {
    target: { files: [file] },
  });
  await screen.findByText(new RegExp(file.name));
}

describe("AreaUploadDialog", () => {
  beforeEach(() => {
    mockedFetch.mockReset();
  });

  it("shows the accepted types and their size limits", () => {
    renderDialog();
    expect(
      screen.getByText(/\.geojson up to 1 MB, or \.csv \/ zipped shapefile/)
    ).toBeTruthy();
    expect(screen.getByText(/up to 10 MB with one area per row/)).toBeTruthy();
  });

  it("stays open while an upload is in flight, then closes normally", async () => {
    let respond!: (response: Response) => void;
    mockedFetch.mockReturnValue(
      new Promise<Response>((resolve) => {
        respond = resolve;
      })
    );
    const { onOpenChange } = renderDialog();
    await pickFile(fileOfSize("areas.csv", 10));

    fireEvent.click(screen.getByRole("button", { name: /upload$/i }));
    await screen.findByText("Uploading Area...");

    const cancel = screen.getByRole("button", { name: "Cancel" });
    expect((cancel as HTMLButtonElement).disabled).toBe(true);
    fireEvent.click(cancel);
    fireEvent.keyDown(screen.getByRole("dialog"), { key: "Escape" });
    expect(onOpenChange).not.toHaveBeenCalledWith(false);

    respond(
      jsonResponse(422, { detail: { errors: ["row 2: geom is empty"] } })
    );
    await screen.findByText("row 2: geom is empty");
    expect(onOpenChange).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
    await waitFor(() => expect(onOpenChange).toHaveBeenCalledWith(false));
  });

  it("hands the created areas to the caller and closes", async () => {
    mockedFetch.mockResolvedValue(
      jsonResponse(200, {
        upload_batch_id: "b1",
        areas: [{ id: "a1", name: "North" }],
      })
    );
    const { onOpenChange, onUploaded } = renderDialog();
    await pickFile(fileOfSize("areas.zip", 10));

    fireEvent.click(screen.getByRole("button", { name: /upload$/i }));

    await waitFor(() =>
      expect(onUploaded).toHaveBeenCalledWith({
        kind: "batch",
        areas: [{ id: "a1", name: "North" }],
      })
    );
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });
});

// @vitest-environment happy-dom
import { ChakraProvider, defaultSystem } from "@chakra-ui/react";
import { render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const saveUserAoiAsync = vi.fn();
vi.mock("@/src/entities/user-aoi", async (importOriginal) => ({
  ...(await importOriginal<object>()),
  useSaveUserAoi: () => ({ saveUserAoiAsync, isSaving: false }),
  useUserAois: () => ({ data: [] }),
}));
vi.mock("@/app/components/ui/toaster", () => ({
  toaster: { create: vi.fn() },
}));

import { toaster } from "@/app/components/ui/toaster";
import type { Layer } from "@/app/store/layerManagerSlice";
import { chooseFromMenu } from "@/src/features/dashboards/ui/__tests__/chakraMenu";

import ConversationAreaActionsMenu from "../ConversationAreaActionsMenu";

const brazil: Layer = {
  id: "layer-1",
  name: "Brazil",
  type: "geojson",
  visible: true,
  featureRefs: [{ name: "Brazil", source: "gadm", srcId: "BRA" }],
};

function conflict() {
  return Object.assign(new Error("Area is already in your areas"), {
    status: 409,
  });
}

function renderMenu() {
  render(
    <ChakraProvider value={defaultSystem}>
      <ConversationAreaActionsMenu layer={brazil} />
    </ChakraProvider>
  );
}

describe("ConversationAreaActionsMenu", () => {
  beforeEach(() => {
    saveUserAoiAsync.mockReset();
    vi.mocked(toaster.create).mockReset();
  });

  it("says an area is already saved rather than asking to retry", async () => {
    saveUserAoiAsync.mockRejectedValue(conflict());
    renderMenu();

    await chooseFromMenu(
      screen.getByRole("button", { name: "Actions for Brazil" }),
      "Save area"
    );

    await waitFor(() =>
      expect(toaster.create).toHaveBeenCalledWith(
        expect.objectContaining({ title: "Already in your areas" })
      )
    );
  });

  it("asks to retry when a save genuinely fails", async () => {
    saveUserAoiAsync.mockRejectedValue(new Error("Request failed"));
    renderMenu();

    await chooseFromMenu(
      screen.getByRole("button", { name: "Actions for Brazil" }),
      "Save area"
    );

    await waitFor(() =>
      expect(toaster.create).toHaveBeenCalledWith(
        expect.objectContaining({ title: "Couldn't save this area" })
      )
    );
  });
});

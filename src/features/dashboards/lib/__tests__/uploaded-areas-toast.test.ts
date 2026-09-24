import { describe, expect, it } from "vitest";

import { uploadedAreasToast } from "../uploaded-areas-toast";

describe("uploadedAreasToast", () => {
  it("names a single uploaded area", () => {
    expect(uploadedAreasToast([{ name: "Hidden Valley" }])).toEqual({
      title: "Area uploaded",
      description: '"Hidden Valley" is ready to use.',
    });
  });

  it("counts several uploaded areas and points at the list", () => {
    expect(
      uploadedAreasToast([
        { name: "North" },
        { name: "South" },
        { name: "East" },
      ])
    ).toEqual({
      title: "3 areas created",
      description: "Pick one below to create a dashboard.",
    });
  });
});

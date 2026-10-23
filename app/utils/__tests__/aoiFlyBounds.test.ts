import { describe, expect, it } from "vitest";

import { aoiFlyBounds } from "@/app/utils/bboxUtils";

describe("aoiFlyBounds", () => {
  it("turns a bbox into flyToBounds corners", () => {
    expect(aoiFlyBounds([{ bbox: [-73.6, -52.4, -65.7, -45.9] }])).toEqual([
      [-73.6, -52.4],
      [-65.7, -45.9],
    ]);
  });

  // The backend marks a dateline crossing with west > east (Fiji).
  it("keeps a dateline-crossing bbox in flyToBounds' range", () => {
    expect(aoiFlyBounds([{ bbox: [177, -21, -178, -12] }])).toEqual([
      [177, -21],
      [-178, -12],
    ]);
  });

  it("is null when nothing has a bbox", () => {
    expect(aoiFlyBounds([{}])).toBeNull();
    expect(aoiFlyBounds([])).toBeNull();
  });
});

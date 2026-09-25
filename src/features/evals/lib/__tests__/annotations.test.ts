import { describe, expect, it } from "vitest";
import { deriveMarkers } from "../annotations";
import type { MarkerPoint } from "../annotations";

function point(partial: Partial<MarkerPoint> & { runId: string }): MarkerPoint {
  return {
    started: "2026-09-01T00:00:00Z",
    build: "b1",
    casesetVersion: "v1",
    passed: 80,
    n: 100,
    ...partial,
  };
}

describe("deriveMarkers", () => {
  it("marks the first point as the baseline", () => {
    const [first] = deriveMarkers([point({ runId: "r1" })]);
    expect(first).toMatchObject({ runId: "r1", kinds: ["baseline"] });
  });

  it("marks build and caseset changes", () => {
    const markers = deriveMarkers([
      point({ runId: "r1" }),
      point({ runId: "r2", build: "b2", casesetVersion: "v2" }),
      point({ runId: "r3", build: "b2", casesetVersion: "v2" }),
    ]);
    expect(markers.map((m) => [m.runId, m.kinds])).toEqual([
      ["r1", ["baseline"]],
      ["r2", ["build", "caseset"]],
    ]);
  });

  it("marks a rise or dip only when the Wilson intervals separate", () => {
    const markers = deriveMarkers([
      point({ runId: "r1", passed: 60, n: 200 }),
      point({ runId: "r2", passed: 63, n: 200 }), // noise: overlapping
      point({ runId: "r3", passed: 150, n: 200 }), // clear rise
      point({ runId: "r4", passed: 90, n: 200 }), // clear dip
    ]);
    expect(markers.map((m) => [m.runId, m.kinds])).toEqual([
      ["r1", ["baseline"]],
      ["r3", ["rise"]],
      ["r4", ["dip"]],
    ]);
    const dip = markers.at(-1)!;
    expect(dip.delta).toBeCloseTo(0.45 - 0.75);
  });
});

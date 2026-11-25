import { describe, expect, it } from "vitest";
import { forbiddenSameLayer } from "./dependency-cruiser.config";
import { EDGE_ALLOWLIST } from "./fsd-allowlist";
import { applyEdgeAllowList, formatEdges, runCruise } from "./fsd-check";

// ADR 0012: slices of one layer import each other only through the target's
// public API — `index.ts`, or for entities its `@x/<consumer>.ts`. `src/shared`
// has no slices, so its files may import each other freely. One cruise of `src`
// covers every layer (including widgets/pages before they have a directory).
describe("architecture fitness — same-layer imports (ADR 0012)", () => {
  it("slices import siblings only through their public API, beyond the TODO(fsd) allow-list", async () => {
    const rules = ["entities", "features", "widgets", "pages"].flatMap(
      (layer) => forbiddenSameLayer(`src/${layer}`)
    );
    const names = new Set(rules.map((r) => r.name));
    const { unexpected, stale } = applyEdgeAllowList(
      await runCruise(["src"], rules),
      EDGE_ALLOWLIST.filter((a) => names.has(a.rule))
    );
    expect(
      unexpected,
      `New same-layer violations:\n${formatEdges(unexpected)}`
    ).toHaveLength(0);
    expect(
      stale,
      `Stale allow-list entries, delete them:\n${formatEdges(stale)}`
    ).toHaveLength(0);
  }, 60_000);
});

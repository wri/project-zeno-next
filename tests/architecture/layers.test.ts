import { describe, expect, it } from "vitest";
import { forbiddenLayerDirection } from "./dependency-cruiser.config";
import { EDGE_ALLOWLIST } from "./fsd-allowlist";
import { applyEdgeAllowList, formatEdges, runCruise } from "./fsd-check";

// ADR 0012: shared < entities < features < widgets < pages < app. A lower layer
// never imports a higher one. Runs on the whole `src` tree, so it also guards
// layers that have no slices yet.
describe("architecture fitness — layer direction (ADR 0012)", () => {
  it("no layer imports a higher layer, beyond the TODO(fsd) allow-list", async () => {
    const rules = forbiddenLayerDirection();
    const names = new Set(rules.map((r) => r.name));
    const { unexpected, stale } = applyEdgeAllowList(
      await runCruise(["src"], rules),
      EDGE_ALLOWLIST.filter((a) => names.has(a.rule))
    );
    expect(
      unexpected,
      `New layer violations:\n${formatEdges(unexpected)}`
    ).toHaveLength(0);
    expect(
      stale,
      `Stale allow-list entries, delete them:\n${formatEdges(stale)}`
    ).toHaveLength(0);
  }, 60_000);
});

import { describe, expect, it } from "vitest";
import { FILE_CYCLE_ALLOWLIST, SLICE_CYCLE_ALLOWLIST } from "./fsd-allowlist";
import {
  applyCycleAllowList,
  cruiseGraph,
  findCycles,
  toSliceGraph,
} from "./fsd-check";

const show = (cycles: Array<string[] | { members: string[] }>) =>
  cycles
    .map((c) => "  - " + ("members" in c ? c.members : c).join("\n    "))
    .join("\n");

// ADR 0012 rule 2: no import cycles. Checked twice from one graph — between
// slices, and between files (which also covers shared and cycles inside a
// slice). The file graph spans the legacy app/ and components/ trees too.
describe("architecture fitness — import cycles (ADR 0012)", async () => {
  const graph = await cruiseGraph(["src", "app", "components"]);

  it("no cycles between slices, beyond the TODO(fsd) allow-list", () => {
    const { unexpected, stale } = applyCycleAllowList(
      findCycles(toSliceGraph(graph)),
      SLICE_CYCLE_ALLOWLIST
    );
    expect(unexpected, `New slice cycles:\n${show(unexpected)}`).toHaveLength(
      0
    );
    expect(
      stale,
      `Stale allow-list entries, delete them:\n${show(stale)}`
    ).toHaveLength(0);
  });

  it("no file-level import cycles, beyond the TODO(fsd) allow-list", () => {
    const { unexpected, stale } = applyCycleAllowList(
      findCycles(graph),
      FILE_CYCLE_ALLOWLIST
    );
    expect(unexpected, `New file cycles:\n${show(unexpected)}`).toHaveLength(0);
    expect(
      stale,
      `Stale allow-list entries, delete them:\n${show(stale)}`
    ).toHaveLength(0);
  });
}, 120_000);

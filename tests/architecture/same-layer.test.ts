import { describe, it } from "vitest";
import { SLICE_LAYERS, forbiddenSameLayer } from "./dependency-cruiser.config";
import { EDGE_ALLOWLIST } from "./fsd-allowlist";
import { expectOnlyAllowListed } from "./fsd-check";

// ADR 0012: slices of one layer import each other only through the target's
// public API — `index.ts`, or for entities its `@x/<consumer>.ts`. `src/shared`
// has no slices, so its files may import each other freely. One cruise of `src`
// covers every layer (including widgets/pages before they have a directory).
describe("architecture fitness — same-layer imports (ADR 0012)", () => {
  it(
    "slices import siblings only through their public API, beyond the TODO(fsd) allow-list",
    () =>
      expectOnlyAllowListed(
        ["src"],
        SLICE_LAYERS.flatMap((layer) => forbiddenSameLayer(`src/${layer}`)),
        EDGE_ALLOWLIST
      ),
    60_000
  );
});

import { describe, it } from "vitest";
import { forbiddenLayerDirection } from "./dependency-cruiser.config";
import { EDGE_ALLOWLIST } from "./fsd-allowlist";
import { expectOnlyAllowListed } from "./fsd-check";

// ADR 0012: shared < entities < features < widgets < pages < app. A lower layer
// never imports a higher one. Runs on the whole `src` tree, so it also guards
// layers that have no slices yet.
describe("architecture fitness — layer direction (ADR 0012)", () => {
  it(
    "no layer imports a higher layer, beyond the TODO(fsd) allow-list",
    () =>
      expectOnlyAllowListed(["src"], forbiddenLayerDirection(), EDGE_ALLOWLIST),
    60_000
  );
});

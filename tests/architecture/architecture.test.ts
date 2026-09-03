import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { cruise } from "dependency-cruiser";
import { describe, expect, it } from "vitest";
import {
  forbiddenFor,
  forbiddenForEntity,
  options,
} from "./dependency-cruiser.config";

/** Directory paths of the slices under an FSD layer root (e.g. src/features). */
function discoverSlices(root: string): string[] {
  let entries: string[];
  try {
    entries = readdirSync(root);
  } catch {
    return [];
  }
  return entries
    .filter((entry) => statSync(join(root, entry)).isDirectory())
    .map((entry) => join(root, entry));
}

// Discover every FSD slice so a new one is governed automatically — registration
// can't be forgotten. Features and entities share the segment-direction rules;
// entities additionally may not import "up" into features/widgets/pages.
const SLICE_CASES = [
  ...discoverSlices("src/features").map((dir) => ({
    dir,
    forbidden: forbiddenFor(dir),
  })),
  ...discoverSlices("src/entities").map((dir) => ({
    dir,
    forbidden: forbiddenForEntity(dir),
  })),
];

describe.each(SLICE_CASES)(
  "architecture fitness — $dir (ADR 0010)",
  ({ dir, forbidden }) => {
    it("honors the FSD segment dependency direction", async () => {
      const result = await cruise(
        [dir],
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        { ruleSet: { forbidden }, outputType: "json", ...options } as any
      );

      // `cruise()` serializes its result to a JSON string; parse it back.
      const out = result.output;
      const parsed = typeof out === "string" ? JSON.parse(out) : out;
      const violations: Array<{
        rule: { name: string };
        from: string;
        to: string;
      }> = parsed.summary.violations;

      const report = violations
        .map((v) => `  [${v.rule.name}] ${v.from} → ${v.to}`)
        .join("\n");

      expect(
        violations,
        `Dependency-direction violations:\n${report}`
      ).toHaveLength(0);
      // dependency-cruiser resolves the TypeScript graph per slice, which takes
      // several seconds on a cold run and longer with the whole suite competing
      // for CPU — comfortably past vitest's 5s default once the slice count
      // grew. Generous explicit budget so this reports real violations, not
      // scheduling noise.
    }, 30_000);

    it("the pure core (model + lib) makes no global network calls", () => {
      const offenders: string[] = [];
      for (const segment of ["model", "lib"]) {
        for (const file of walk(join(dir, segment))) {
          if (!/\.tsx?$/.test(file)) continue;
          const src = readFileSync(file, "utf8");
          if (/\bfetch\s*\(/.test(src) || /\bXMLHttpRequest\b/.test(src)) {
            offenders.push(file);
          }
        }
      }
      expect(
        offenders,
        `Core must call the gateway port, not fetch/XHR (ADR 0003):\n${offenders.join("\n")}`
      ).toHaveLength(0);
    });
  }
);

/** Recursively list files; returns [] for rings not yet created. */
function walk(dir: string): string[] {
  let entries: string[];
  try {
    entries = readdirSync(dir);
  } catch {
    return [];
  }
  return entries.flatMap((entry) => {
    const full = join(dir, entry);
    return statSync(full).isDirectory() ? walk(full) : [full];
  });
}

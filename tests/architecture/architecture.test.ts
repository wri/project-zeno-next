import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { cruise } from "dependency-cruiser";
import { describe, expect, it } from "vitest";
import { forbidden, options } from "./dependency-cruiser.config";

const FEATURE_DIR = "app/features/analysis";

describe("architecture fitness — features/analysis (ADR 0010)", () => {
  it("honors the hexagonal dependency direction", async () => {
    const result = await cruise(
      [FEATURE_DIR],
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
  });

  it("domain + application make no global network calls", () => {
    const offenders: string[] = [];
    for (const ring of ["domain", "application"]) {
      for (const file of walk(join(FEATURE_DIR, ring))) {
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
});

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

import { cruise } from "dependency-cruiser";
import { expect } from "vitest";
import { SLICE_LAYERS, options } from "./dependency-cruiser.config";

/** One rule violation: `from` imports `to`, breaking `rule`. */
export interface Edge {
  rule: string;
  from: string;
  to: string;
}

/** Allow-listed violation. `ticket` is the migration step that removes it. */
export interface EdgeAllow extends Edge {
  ticket: string;
}

/** Allow-listed import cycle, identified by its exact set of members. */
export interface CycleAllow {
  members: string[];
  ticket: string;
}

// `cruise()` serializes its result to a JSON string; parse it back.
async function cruiseJson(paths: string[], extra: object) {
  const result = await cruise(
    paths,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    { outputType: "json", ...options, ...extra } as any
  );
  const out = result.output;
  return typeof out === "string" ? JSON.parse(out) : out;
}

/** Cruise `paths` against a rule set and return every violation. */
export async function runCruise(
  paths: string[],
  forbidden: object[]
): Promise<Edge[]> {
  const parsed = await cruiseJson(paths, { ruleSet: { forbidden } });
  return parsed.summary.violations.map(
    (v: { rule: { name: string }; from: string; to: string }) => ({
      rule: v.rule.name,
      from: v.from,
      to: v.to,
    })
  );
}

/** The resolved import graph of `paths`: file → files it imports. */
export async function cruiseGraph(
  paths: string[]
): Promise<Map<string, string[]>> {
  const parsed = await cruiseJson(paths, { validate: false });
  const graph = new Map<string, string[]>();
  for (const m of parsed.modules as Array<{
    source: string;
    dependencies: Array<{ resolved: string; couldNotResolve?: boolean }>;
  }>) {
    graph.set(
      m.source,
      m.dependencies.filter((d) => !d.couldNotResolve).map((d) => d.resolved)
    );
  }
  return graph;
}

/**
 * Strongly connected components of size > 1 (Tarjan): each is one import cycle
 * cluster. Self-edges are ignored. Members are sorted, so the result is stable.
 */
export function findCycles(graph: Map<string, string[]>): string[][] {
  let counter = 0;
  const index = new Map<string, number>();
  const low = new Map<string, number>();
  const onStack = new Set<string>();
  const stack: string[] = [];
  const cycles: string[][] = [];

  const visit = (v: string) => {
    index.set(v, counter);
    low.set(v, counter++);
    stack.push(v);
    onStack.add(v);
    for (const w of graph.get(v) ?? []) {
      if (!graph.has(w)) continue; // outside the graph (node_modules, core)
      if (!index.has(w)) {
        visit(w);
        low.set(v, Math.min(low.get(v)!, low.get(w)!));
      } else if (onStack.has(w)) {
        low.set(v, Math.min(low.get(v)!, index.get(w)!));
      }
    }
    if (low.get(v) === index.get(v)) {
      const scc: string[] = [];
      let w: string;
      do {
        w = stack.pop()!;
        onStack.delete(w);
        scc.push(w);
      } while (w !== v);
      if (scc.length > 1) cycles.push(scc.sort());
    }
  };

  for (const v of graph.keys()) if (!index.has(v)) visit(v);
  return cycles.sort((a, b) => a[0].localeCompare(b[0]));
}

/**
 * Collapse a file graph to a slice graph: `src/<layer>/<slice>/…` becomes the
 * node `src/<layer>/<slice>`. Files outside a slice (shared, legacy app/,
 * src/app) are dropped, as are edges within one slice.
 */
export function toSliceGraph(
  graph: Map<string, string[]>
): Map<string, string[]> {
  const sliceOf = (file: string) =>
    new RegExp(`^src/(?:${SLICE_LAYERS.join("|")})/[^/]+`).exec(file)?.[0];
  const out = new Map<string, Set<string>>();
  for (const [file, deps] of graph) {
    const from = sliceOf(file);
    if (!from) continue;
    const set = out.get(from) ?? new Set<string>();
    for (const dep of deps) {
      const to = sliceOf(dep);
      if (to && to !== from) set.add(to);
    }
    out.set(from, set);
  }
  return new Map([...out].map(([k, v]) => [k, [...v]]));
}

const edgeKey = (e: Edge) => `${e.rule}\u0000${e.from}\u0000${e.to}`;
const cycleKey = (members: string[]) => [...members].sort().join("\u0000");

/**
 * Split `found` into `unexpected` (not allow-listed: the migration added one)
 * and `stale` (allow-listed but gone: delete the entry). Both must be empty,
 * so the allow-list can only shrink.
 */
export function applyAllowList<T>(
  found: T[],
  allow: T[],
  key: (t: T) => string
) {
  const allowed = new Set(allow.map(key));
  const seen = new Set(found.map(key));
  return {
    unexpected: found.filter((f) => !allowed.has(key(f))),
    stale: allow.filter((a) => !seen.has(key(a))),
  };
}

export const applyEdgeAllowList = (violations: Edge[], allow: EdgeAllow[]) =>
  applyAllowList(violations, allow, edgeKey);

export const applyCycleAllowList = (cycles: string[][], allow: CycleAllow[]) =>
  applyAllowList(
    cycles,
    allow.map((a) => a.members),
    cycleKey
  );

export const formatEdges = (edges: Edge[]) =>
  edges.map((v) => `  [${v.rule}] ${v.from} → ${v.to}`).join("\n");

/** Cruise `paths` with `rules` and assert nothing beyond the allow-list fires. */
export async function expectOnlyAllowListed(
  paths: string[],
  rules: Array<{ name: string }>,
  allow: EdgeAllow[]
) {
  const names = new Set(rules.map((r) => r.name));
  const { unexpected, stale } = applyEdgeAllowList(
    await runCruise(paths, rules),
    allow.filter((a) => names.has(a.rule))
  );
  expect(
    unexpected,
    `New violations:\n${formatEdges(unexpected)}`
  ).toHaveLength(0);
  expect(
    stale,
    `Stale allow-list entries, delete them:\n${formatEdges(stale)}`
  ).toHaveLength(0);
}

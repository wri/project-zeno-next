/**
 * The onboarding tour's contract with the UI it points at. The tour spotlights
 * elements and names labels that other people change; these checks make that
 * drift fail CI instead of silently breaking the tour.
 *
 * Static: the source is parsed with the TypeScript compiler and no component
 * is imported, so this runs in node with the rest of `pnpm test:arch`. It
 * cannot see what renders at runtime (conditional rendering, zero-size boxes,
 * an anchor moved to another element in the same file); the tour's
 * `tour_target_missing` event covers that in production.
 */
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { dirname, join } from "node:path";
import { cruise } from "dependency-cruiser";
import ts from "typescript";
import { describe, expect, it } from "vitest";

import * as datasets from "@/app/constants/datasets";
import { TOUR_ANCHORS } from "@/src/shared/lib/tour-anchors";

import { options } from "./dependency-cruiser.config";

const ONBOARDING = "src/features/onboarding/";
const ANCHORS_MODULE = "src/shared/lib/tour-anchors/";
/** Files whose text is tour copy (step titles, bodies, hints). */
const TOUR_COPY = `${ONBOARDING}ui/tours/`;

/** Builders for the anchor id families (one id per catalogue row). */
const FAMILIES = {
  catalogCardAnchor: "catalogCard",
} as const;

type AnchorName =
  | keyof typeof TOUR_ANCHORS
  | (typeof FAMILIES)[keyof typeof FAMILIES];

/**
 * Where each anchor is set (`tourAnchor(...)` or a `tourAnchorId` prop). An
 * anchor moved to another file, or set in an extra place, fails the test:
 * check the tour steps that point at it still make sense, then update this
 * table. A file listed twice sets the anchor in two places.
 */
const ANCHOR_HOMES: Record<AnchorName, readonly string[]> = {
  // Compact and full-size chat layouts; only one is mounted at a time.
  chatPanel: ["app/ChatPanelCompact.tsx", "app/ChatPanelFullSize.tsx"],
  chatInput: ["app/components/ChatInput.tsx"],
  datasetsButton: ["app/components/ChatInput.tsx"],
  areasPanel: ["app/components/AreasPanel.tsx"],
  viewAnalysisNudge: ["app/components/MessageBubble.tsx"],
  // The loading skeleton and the chart card; only one renders at a time.
  insightWorkspace: [
    "app/components/InsightWorkspace.tsx",
    "app/components/InsightWorkspace.tsx",
  ],
  analysesButton: ["app/components/ChatInput.tsx"],
  catalogCard: ["app/components/CatalogPanel.tsx"],
};

/** Verbs the copy puts before a label ("Click Datasets"). */
const NAMING_VERBS = new Set([
  "Click",
  "Open",
  "Press",
  "Choose",
  "Select",
  "Use",
  "Tap",
]);

/* ------------------------------------------------------------------ */
/* Source access                                                       */
/* ------------------------------------------------------------------ */

function walk(dir: string): string[] {
  return readdirSync(dir).flatMap((entry) => {
    const full = join(dir, entry);
    return statSync(full).isDirectory() ? walk(full) : [full];
  });
}

const isTestFile = (file: string) =>
  file.includes("/__tests__/") || /\.test\.[tj]sx?$/.test(file);

const SOURCE_FILES = ["app", "src"]
  .flatMap(walk)
  .filter((f) => /\.tsx?$/.test(f) && !f.endsWith(".d.ts") && !isTestFile(f));

const texts = new Map<string, string>();
const text = (file: string) => {
  if (!texts.has(file)) texts.set(file, readFileSync(file, "utf8"));
  return texts.get(file)!;
};

const parsed = new Map<string, ts.SourceFile>();
function parse(file: string): ts.SourceFile {
  let sf = parsed.get(file);
  if (!sf) {
    sf = ts.createSourceFile(
      file,
      text(file),
      ts.ScriptTarget.Latest,
      true,
      file.endsWith(".tsx") ? ts.ScriptKind.TSX : ts.ScriptKind.TS
    );
    parsed.set(file, sf);
  }
  return sf;
}

function visit(node: ts.Node, fn: (node: ts.Node) => void): void {
  fn(node);
  ts.forEachChild(node, (child) => visit(child, fn));
}

const where = (node: ts.Node) => {
  const sf = node.getSourceFile();
  return `${sf.fileName}:${sf.getLineAndCharacterOfPosition(node.getStart()).line + 1}`;
};

/** The file an import specifier points at, or null for a package. */
function resolveModule(fromFile: string, spec: string): string | null {
  let base: string;
  if (spec.startsWith("@/")) base = spec.slice(2);
  else if (spec.startsWith(".")) base = join(dirname(fromFile), spec);
  else return null;
  const candidates = [
    base,
    `${base}.ts`,
    `${base}.tsx`,
    `${base}/index.ts`,
    `${base}/index.tsx`,
  ];
  return candidates.find((c) => existsSync(c) && statSync(c).isFile()) ?? null;
}

const isExported = (node: ts.Node) =>
  ts.canHaveModifiers(node) &&
  !!ts.getModifiers(node)?.some((m) => m.kind === ts.SyntaxKind.ExportKeyword);

interface Declaration {
  readonly file: string;
  readonly name: string;
}

/** Follow re-exports (`export { x } from`, `export *`) to where `name` is declared. */
function resolveExport(file: string, name: string): Declaration | null {
  for (const st of parse(file).statements) {
    if (isExported(st)) {
      if (
        ts.isVariableStatement(st) &&
        st.declarationList.declarations.some(
          (d) => ts.isIdentifier(d.name) && d.name.text === name
        )
      )
        return { file, name };
      if (
        (ts.isFunctionDeclaration(st) || ts.isClassDeclaration(st)) &&
        st.name?.text === name
      )
        return { file, name };
    }
    if (
      ts.isExportDeclaration(st) &&
      st.moduleSpecifier &&
      ts.isStringLiteral(st.moduleSpecifier)
    ) {
      const target = resolveModule(file, st.moduleSpecifier.text);
      if (!target) continue;
      if (!st.exportClause) {
        const found = resolveExport(target, name);
        if (found) return found;
      } else if (ts.isNamedExports(st.exportClause)) {
        const el = st.exportClause.elements.find((e) => e.name.text === name);
        if (el) return resolveExport(target, (el.propertyName ?? el.name).text);
      }
    }
  }
  return null;
}

/** The initializer of an exported `const`, without `as const` / `satisfies`. */
function constInitializer(decl: Declaration): ts.Expression | null {
  for (const st of parse(decl.file).statements) {
    if (!ts.isVariableStatement(st)) continue;
    for (const d of st.declarationList.declarations) {
      if (
        ts.isIdentifier(d.name) &&
        d.name.text === decl.name &&
        d.initializer
      ) {
        let init: ts.Expression = d.initializer;
        while (
          ts.isAsExpression(init) ||
          ts.isSatisfiesExpression(init) ||
          ts.isParenthesizedExpression(init)
        )
          init = init.expression;
        return init;
      }
    }
  }
  return null;
}

/** The string at `path` ("a.b") inside a const initializer, if it is a literal. */
function stringAt(init: ts.Expression | null, path: string): string | null {
  let node: ts.Expression | null = init;
  for (const key of path ? path.split(".") : []) {
    while (node && (ts.isAsExpression(node) || ts.isSatisfiesExpression(node)))
      node = node.expression;
    if (!node || !ts.isObjectLiteralExpression(node)) return null;
    const prop = node.properties.find(
      (p): p is ts.PropertyAssignment =>
        ts.isPropertyAssignment(p) && p.name.getText() === key
    );
    node = prop?.initializer ?? null;
  }
  return node &&
    (ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node))
    ? node.text
    : null;
}

/** "a.b" for `X.a.b`; "" when `X` is used whole (called, indexed, passed). */
function accessPath(id: ts.Identifier): string {
  const parts: string[] = [];
  let node: ts.Node = id;
  while (
    ts.isPropertyAccessExpression(node.parent) &&
    node.parent.expression === node
  ) {
    parts.push(node.parent.name.text);
    node = node.parent;
  }
  return parts.join(".");
}

/** Value references to `local` in a file (not its declaration, imports or types). */
function references(file: string, local: string): ts.Identifier[] {
  const refs: ts.Identifier[] = [];
  visit(parse(file), (node) => {
    if (!ts.isIdentifier(node) || node.text !== local) return;
    const p = node.parent;
    const isDeclarationOrName =
      ts.isImportSpecifier(p) ||
      ts.isImportClause(p) ||
      ts.isExportSpecifier(p) ||
      ts.isTypeQueryNode(p) ||
      ((ts.isVariableDeclaration(p) ||
        ts.isFunctionDeclaration(p) ||
        ts.isPropertyAssignment(p) ||
        ts.isPropertyAccessExpression(p)) &&
        p.name === node);
    if (!isDeclarationOrName) refs.push(node);
  });
  return refs;
}

/* ------------------------------------------------------------------ */
/* Anchors                                                             */
/* ------------------------------------------------------------------ */

/** Which anchor an expression names, or null if the contract can't tell. */
function anchorOf(expr: ts.Expression): AnchorName | null {
  if (
    ts.isPropertyAccessExpression(expr) &&
    ts.isIdentifier(expr.expression) &&
    expr.expression.text === "TOUR_ANCHORS" &&
    expr.name.text in TOUR_ANCHORS
  )
    return expr.name.text as keyof typeof TOUR_ANCHORS;
  if (
    ts.isCallExpression(expr) &&
    ts.isIdentifier(expr.expression) &&
    expr.expression.text in FAMILIES
  )
    return FAMILIES[expr.expression.text as keyof typeof FAMILIES];
  return null;
}

/** Where components set anchors, and the anchor code the contract can't read. */
function scanAnchorHomes() {
  const homes = new Map<AnchorName, string[]>();
  const unreadable: string[] = [];
  const handWritten: string[] = [];
  const notForwarded: string[] = [];

  const files = SOURCE_FILES.filter(
    (f) =>
      !f.startsWith(ONBOARDING) &&
      !f.startsWith(ANCHORS_MODULE) &&
      /tourAnchor|data-tour/.test(text(f))
  );
  for (const file of files) {
    let declaresProp = false;
    let forwards = false;
    const record = (expr: ts.Expression | undefined, node: ts.Node) => {
      if (!expr) return;
      // A component passing on the `tourAnchorId` prop it was given.
      if (ts.isIdentifier(expr) && expr.text === "tourAnchorId") {
        forwards = true;
        return;
      }
      const anchor = anchorOf(expr);
      if (anchor) homes.set(anchor, [...(homes.get(anchor) ?? []), file]);
      else unreadable.push(`${where(node)}: ${expr.getText()}`);
    };
    visit(parse(file), (node) => {
      if (
        ts.isCallExpression(node) &&
        ts.isIdentifier(node.expression) &&
        node.expression.text === "tourAnchor"
      )
        record(node.arguments[0], node);
      if (ts.isJsxAttribute(node)) {
        const name = node.name.getText();
        if (
          name === "tourAnchorId" &&
          node.initializer &&
          ts.isJsxExpression(node.initializer)
        )
          record(node.initializer.expression, node);
        if (name === "data-tour") handWritten.push(where(node));
      }
      if (
        ts.isPropertyAssignment(node) &&
        ts.isStringLiteral(node.name) &&
        node.name.text === "data-tour"
      )
        handWritten.push(where(node));
      if (
        ts.isPropertySignature(node) &&
        node.name.getText() === "tourAnchorId"
      )
        declaresProp = true;
    });
    if (declaresProp && !forwards) notForwarded.push(file);
  }
  return { homes, unreadable, handWritten, notForwarded };
}

const onboardingFiles = () =>
  SOURCE_FILES.filter((f) => f.startsWith(ONBOARDING));

/** The anchors tour steps point at, plus step targets the contract can't read. */
function scanStepTargets() {
  const used = new Set<AnchorName>();
  const unreadable: string[] = [];
  const bypasses: string[] = [];
  const catalogIds: { id: unknown; at: string }[] = [];

  for (const file of onboardingFiles()) {
    const sf = parse(file);
    visit(sf, (node) => {
      if (
        ts.isCallExpression(node) &&
        ts.isIdentifier(node.expression) &&
        node.expression.text === "anchorTarget"
      ) {
        const arg = node.arguments[0];
        const anchor = arg && anchorOf(arg);
        if (anchor) used.add(anchor);
        else unreadable.push(`${where(node)}: ${node.getText()}`);
        if (anchor === "catalogCard" && ts.isCallExpression(arg))
          catalogIds.push({
            id: catalogIdValue(sf, arg.arguments[0]),
            at: where(node),
          });
      }
      // A selector target built by hand skips `anchorTarget`, and this check.
      if (
        ts.isPropertyAssignment(node) &&
        node.name.getText() === "kind" &&
        ts.isStringLiteral(node.initializer) &&
        node.initializer.text === "selector" &&
        !file.endsWith("model/tour.ts")
      )
        bypasses.push(where(node));
    });
  }
  return { used, unreadable, bypasses, catalogIds };
}

/** The dataset id passed to `catalogCardAnchor`: a number, or a constant from datasets.ts. */
function catalogIdValue(
  sf: ts.SourceFile,
  arg: ts.Expression | undefined
): unknown {
  if (!arg) return undefined;
  if (ts.isNumericLiteral(arg)) return Number(arg.text);
  if (!ts.isIdentifier(arg)) return undefined;
  for (const st of sf.statements) {
    if (
      !ts.isImportDeclaration(st) ||
      !ts.isStringLiteral(st.moduleSpecifier) ||
      st.moduleSpecifier.text !== "@/app/constants/datasets"
    )
      continue;
    const bindings = st.importClause?.namedBindings;
    const el =
      bindings && ts.isNamedImports(bindings)
        ? bindings.elements.find((e) => e.name.text === arg.text)
        : undefined;
    if (el)
      return (datasets as Record<string, unknown>)[
        (el.propertyName ?? el.name).text
      ];
  }
  return undefined;
}

/* ------------------------------------------------------------------ */
/* Labels                                                              */
/* ------------------------------------------------------------------ */

/**
 * Imports into tour copy from a component (`@/app/components/...`, or a chat
 * panel file such as `@/app/ChatPanelHeader`), another feature or a shared
 * UI module (the card kinds' labels) are UI labels. Covering a new label is
 * one import.
 */
const LABEL_SOURCE =
  /^@\/(app\/(components\/|ChatPanel)|src\/(features\/(?!onboarding(\/|$))|shared\/ui\/))/;

interface Label {
  readonly local: string;
  readonly decl: Declaration;
  readonly tourFile: string;
  /** Property paths the copy reads ("" for the value itself). */
  readonly paths: ReadonlySet<string>;
}

function tourLabels(): { labels: Label[]; unresolved: string[] } {
  const labels: Label[] = [];
  const unresolved: string[] = [];
  for (const file of onboardingFiles().filter((f) => f.startsWith(TOUR_COPY))) {
    for (const st of parse(file).statements) {
      if (
        !ts.isImportDeclaration(st) ||
        !ts.isStringLiteral(st.moduleSpecifier) ||
        !LABEL_SOURCE.test(st.moduleSpecifier.text) ||
        st.importClause?.isTypeOnly
      )
        continue;
      const bindings = st.importClause?.namedBindings;
      if (!bindings || !ts.isNamedImports(bindings)) continue;
      const moduleFile = resolveModule(file, st.moduleSpecifier.text);
      for (const el of bindings.elements) {
        if (el.isTypeOnly) continue;
        const imported = (el.propertyName ?? el.name).text;
        const decl = moduleFile && resolveExport(moduleFile, imported);
        if (!decl) {
          unresolved.push(`${where(el)}: ${imported}`);
          continue;
        }
        const paths = new Set(
          references(file, el.name.text).map((id) => accessPath(id))
        );
        labels.push({ local: el.name.text, decl, tourFile: file, paths });
      }
    }
  }
  return { labels, unresolved };
}

/** Property paths each app file (outside onboarding) reads off a declared label. */
function homeUses(decl: Declaration): Map<string, Set<string>> {
  const uses = new Map<string, Set<string>>();
  const add = (file: string, ids: ts.Identifier[]) => {
    if (ids.length) uses.set(file, new Set(ids.map((id) => accessPath(id))));
  };
  add(decl.file, references(decl.file, decl.name));
  for (const file of SOURCE_FILES) {
    if (
      file === decl.file ||
      file.startsWith(ONBOARDING) ||
      !text(file).includes(decl.name)
    )
      continue;
    for (const st of parse(file).statements) {
      if (
        !ts.isImportDeclaration(st) ||
        !ts.isStringLiteral(st.moduleSpecifier)
      )
        continue;
      const bindings = st.importClause?.namedBindings;
      const moduleFile = resolveModule(file, st.moduleSpecifier.text);
      if (!moduleFile || !bindings || !ts.isNamedImports(bindings)) continue;
      for (const el of bindings.elements) {
        const found = resolveExport(
          moduleFile,
          (el.propertyName ?? el.name).text
        );
        if (found?.file === decl.file && found.name === decl.name)
          add(file, references(file, el.name.text));
      }
    }
  }
  return uses;
}

/**
 * Whether `text` names `label` on its own. Not when the word only starts a
 * sentence, or sits inside a longer Title Case name ("Key Biodiversity Areas"
 * is not the "Areas" button).
 */
function namesLabel(text: string, label: string): boolean {
  const escaped = label.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  for (const match of text.matchAll(
    new RegExp(`(?<![\\w-])${escaped}(?![\\w-])`, "g")
  )) {
    const before = text.slice(0, match.index).trimEnd();
    if (/[.!?:]$/.test(before)) continue;
    const previousWord = before.split(/\s+/).pop() ?? "";
    const insideName =
      /^[A-Z]/.test(previousWord) && !NAMING_VERBS.has(previousWord);
    if (!insideName) return true;
  }
  return false;
}

/** Text in tour copy: JSX text, string literals and template parts (not imports). */
function copyTexts(file: string): { value: string; node: ts.Node }[] {
  const found: { value: string; node: ts.Node }[] = [];
  visit(parse(file), (node) => {
    const isText =
      ts.isJsxText(node) ||
      ts.isStringLiteral(node) ||
      ts.isNoSubstitutionTemplateLiteral(node) ||
      ts.isTemplateHead(node) ||
      ts.isTemplateMiddle(node) ||
      ts.isTemplateTail(node);
    if (!isText) return;
    const isModuleName =
      ts.isImportDeclaration(node.parent) ||
      ts.isExportDeclaration(node.parent);
    if (!isModuleName) found.push({ value: node.text, node });
  });
  return found;
}

/* ------------------------------------------------------------------ */
/* Tests                                                               */
/* ------------------------------------------------------------------ */

describe("tour contract: anchors", () => {
  const scan = scanAnchorHomes();
  const steps = scanStepTargets();

  it("(a) each anchor is set exactly where ANCHOR_HOMES says", () => {
    const drift = (Object.keys(ANCHOR_HOMES) as AnchorName[]).flatMap(
      (name) => {
        const actual = [...(scan.homes.get(name) ?? [])].sort();
        const expected = [...ANCHOR_HOMES[name]].sort();
        return actual.join() === expected.join()
          ? []
          : [
              `${name}: set in [${actual.join(", ")}], expected [${expected.join(", ")}]`,
            ];
      }
    );
    expect(
      drift,
      `Tour anchors moved. Check the steps that point at each one, then update ANCHOR_HOMES:\n${drift.join("\n")}`
    ).toEqual([]);
  });

  it("(a) every anchor is set with TOUR_ANCHORS or a family builder", () => {
    expect(
      scan.unreadable,
      "Pass TOUR_ANCHORS.x or catalogCardAnchor(...) so this contract can see the anchor"
    ).toEqual([]);
  });

  it("(b) every anchor is used by at least one tour step", () => {
    const unused = (Object.keys(ANCHOR_HOMES) as AnchorName[]).filter(
      (name) => !steps.used.has(name)
    );
    expect(
      unused,
      "No step points at these anchors: remove them from TOUR_ANCHORS and the components, or point a step at them"
    ).toEqual([]);
  });

  it("(c) every step target is a known anchor, built with anchorTarget", () => {
    expect(
      steps.unreadable,
      "Use anchorTarget(TOUR_ANCHORS.x) or a family builder for step targets"
    ).toEqual([]);
    expect(
      steps.bypasses,
      'Build selector targets with anchorTarget(...), not { kind: "selector" }'
    ).toEqual([]);
  });

  it("(d) no data-tour attribute is written by hand", () => {
    expect(
      scan.handWritten,
      "Use tourAnchor(...) so the anchor is typed and pinned here"
    ).toEqual([]);
  });

  it("(e) components that take a tourAnchorId prop forward it", () => {
    expect(
      scan.notForwarded,
      "Spread tourAnchor(tourAnchorId) on the element, or pass tourAnchorId={tourAnchorId} on"
    ).toEqual([]);
  });

  it("(f) the catalogue rows the tour points at are listed by default", () => {
    expect(steps.catalogIds.length).toBeGreaterThan(0);
    const problems = steps.catalogIds.flatMap(({ id, at }) => {
      if (typeof id !== "number")
        return [
          `${at}: dataset id must be a number or a constant from @/app/constants/datasets`,
        ];
      const card = datasets.DATASET_CARD_BY_ID[id];
      if (!card) return [`${at}: no catalogue card with dataset_id ${id}`];
      if (card.featureFlag)
        return [`${at}: dataset ${id} is behind ?ff=${card.featureFlag}`];
      if (!datasets.ORDERED_DATASET_CARDS.includes(card))
        return [`${at}: dataset ${id} is not in the catalogue order`];
      return [];
    });
    expect(problems).toEqual([]);
  });
});

describe("tour contract: labels", () => {
  const { labels, unresolved } = tourLabels();

  it("(g) every label the tour imports resolves to a declaration", () => {
    expect(labels.length).toBeGreaterThan(0);
    expect(unresolved).toEqual([]);
  });

  it("(g) every label the tour imports is rendered by its component", () => {
    const problems = labels.flatMap(({ local, decl, tourFile, paths }) => {
      const uses = [...homeUses(decl).values()];
      const shown = (path: string) =>
        uses.some((u) =>
          [...u].some((p) => p === "" || p === path || path.startsWith(`${p}.`))
        );
      if (!uses.length)
        return [
          `${decl.name} (${decl.file}) is imported by ${tourFile} but nothing renders it`,
        ];
      return [...paths]
        .filter((path) => !shown(path))
        .map(
          (path) =>
            `${local}.${path} (${decl.file}) is named by ${tourFile} but its component no longer uses it`
        );
    });
    expect(
      problems,
      "A component stopped rendering a label the tour names. Render the constant, or update the tour copy"
    ).toEqual([]);
  });

  it("(g) tour copy never repeats a covered label as text", () => {
    // Labels whose text the contract can read (string constants, objects of
    // strings), once each although several tour files import them.
    const byValue = new Map<string, { use: string; file: string }>();
    for (const { local, decl, paths } of labels)
      for (const path of paths) {
        const value = stringAt(constInitializer(decl), path);
        if (value && !byValue.has(value))
          byValue.set(value, {
            use: path ? `${local}.${path}` : local,
            file: decl.file,
          });
      }
    const covered = [...byValue].map(([value, at]) => ({ value, ...at }));
    expect(covered.length).toBeGreaterThan(0);
    const literals = onboardingFiles()
      .filter((f) => f.startsWith(TOUR_COPY))
      .flatMap((file) =>
        copyTexts(file).flatMap(({ value, node }) =>
          covered
            .filter((label) => namesLabel(value, label.value))
            .map(
              (label) =>
                `${where(node)} names "${label.value}" as text: use ${label.use} (${label.file})`
            )
        )
      );
    expect(
      literals,
      "Tour copy must name UI labels through their constants"
    ).toEqual([]);
  });
});

describe("tour contract: imports", () => {
  it("(h) the onboarding feature is in no import cycle", async () => {
    // The tour reads label constants while its modules load; a cycle back
    // into onboarding could make them undefined at that moment.
    const ruleSet = {
      forbidden: [
        {
          name: "onboarding-no-cycle",
          severity: "error",
          from: { path: "^src/features/onboarding" },
          to: { circular: true },
        },
      ],
    };
    const result = await cruise(
      ["src/features/onboarding"],
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      { ruleSet, outputType: "json", ...options } as any
    );
    const out = result.output;
    const parsedOut = typeof out === "string" ? JSON.parse(out) : out;
    const violations: Array<{ from: string; to: string; cycle?: unknown }> =
      parsedOut.summary.violations;
    expect(
      violations.map((v) => `${v.from} → ${v.to}`),
      "Import cycle through the onboarding feature (import labels through the feature's barrel or the component's own module)"
    ).toEqual([]);
  }, 30_000);
});

import type { Dashboard, DashboardWidget } from "@/app/types/dashboard";
import { WIDGET_FIXTURES } from "@/app/dashboards/lib/fixtures";

// ---------------------------------------------------------------------------
// Canned "AI" engine for the dashboards prototype.
//
// There is no backend here. Free-text prompts are keyword-matched to a recipe;
// suggestion rows reference a recipe directly (deterministic). Each result
// carries an assistant reply plus an action the chat panel applies to the
// dashboard store. Fully offline.
// ---------------------------------------------------------------------------

export type CannedAction =
  | { type: "addWidget"; widget: Omit<DashboardWidget, "id"> }
  | {
      type: "createDashboard";
      dashboard: Partial<Omit<Dashboard, "id">>;
      widget: Omit<DashboardWidget, "id">;
    }
  | { type: "none" };

export interface CannedResult {
  reply: string;
  action: CannedAction;
}

// --- widget builders --------------------------------------------------------

const insight = (
  key: keyof typeof WIDGET_FIXTURES,
  span: 1 | 2 = 1
): Omit<DashboardWidget, "id"> => ({
  kind: "insight",
  span,
  insight: WIDGET_FIXTURES[key],
});

const alertsMap = (): Omit<DashboardWidget, "id"> => ({
  kind: "map",
  span: 2,
  map: {
    caption: "Disturbance alerts — last 3 months",
    alertCount: 180,
    insetTitle: "Global all ecosystem disturbance alerts",
    center: [-55, -10],
    zoom: 4,
  },
});

const annotation = (): Omit<DashboardWidget, "id"> => ({
  kind: "text",
  span: 2,
  text: "Tree cover loss in this area fell from ~41,000 ha in 2018 to ~24,100 ha in 2023 — roughly a 41% decline over six years. Recent disturbance alerts suggest renewed pressure along the agricultural frontier worth monitoring.",
});

// --- recipes ----------------------------------------------------------------

interface Recipe {
  noun: string; // used in the assistant reply
  build: () => Omit<DashboardWidget, "id">;
}

const RECIPES = {
  alerts: { noun: "live alerts map", build: alertsMap },
  emissions: {
    noun: "carbon emissions chart",
    build: () => insight("emissionsLine"),
  },
  drivers: {
    noun: "deforestation drivers breakdown",
    build: () => insight("driversPie"),
  },
  table: { noun: "ranked table", build: () => insight("tclTable") },
  countries: {
    noun: "country comparison chart",
    build: () => insight("tclBar"),
  },
  treeCover: {
    noun: "tree cover loss trend",
    build: () => insight("treeCoverLine"),
  },
  annotation: { noun: "summary annotation", build: annotation },
} satisfies Record<string, Recipe>;

type RecipeKey = keyof typeof RECIPES;

// Ordered by specificity — first match wins.
const MATCHERS: { keywords: string[]; recipe: RecipeKey }[] = [
  {
    keywords: ["annotation", "summarize", "summary", "note", "write-up"],
    recipe: "annotation",
  },
  {
    keywords: ["emission", "carbon", "co2", "co₂", "greenhouse", "ghg", "flux"],
    recipe: "emissions",
  },
  {
    keywords: ["driver", "driving", "cause", "reason", "why", "attribut"],
    recipe: "drivers",
  },
  {
    keywords: [
      "alert",
      "fire",
      "wildfire",
      "disturbance",
      "real-time",
      "real time",
      "monitor",
      "near-real",
      "map",
    ],
    recipe: "alerts",
  },
  {
    keywords: ["table", "rank", "top regions", "top region", "list"],
    recipe: "table",
  },
  {
    keywords: ["country", "countries", "compare", "comparison", "across"],
    recipe: "countries",
  },
  {
    keywords: [
      "tree cover",
      "forest loss",
      "deforestation",
      "tree loss",
      "cover loss",
      "trend",
    ],
    recipe: "treeCover",
  },
];

function matchRecipe(prompt: string): RecipeKey {
  const text = prompt.toLowerCase();
  return (
    MATCHERS.find((m) => m.keywords.some((kw) => text.includes(kw)))?.recipe ??
    "treeCover"
  );
}

function truncate(s: string, n: number): string {
  const t = s.trim();
  return t.length > n ? `${t.slice(0, n - 1).trimEnd()}…` : t;
}

function buildResult(
  recipe: RecipeKey,
  label: string,
  context: "gallery" | "detail"
): CannedResult {
  const r = RECIPES[recipe];
  const widget = r.build();

  if (context === "detail") {
    return {
      reply: `Added a ${r.noun} to your dashboard. You can rearrange or remove it anytime.`,
      action: { type: "addWidget", widget },
    };
  }

  const title = label.trim() ? truncate(label, 48) : "New dashboard";
  return {
    reply: `I've started a new dashboard with a ${r.noun}. Open it from the card above to keep building.`,
    action: { type: "createDashboard", dashboard: { title }, widget },
  };
}

// --- suggestions ------------------------------------------------------------

export interface Suggestion {
  /** Full-width row label, also used as the user message + new-dashboard title. */
  label: string;
  recipe: RecipeKey;
}

const DETAIL_SUGGESTIONS: Suggestion[] = [
  {
    label: "Explain what's driving the recent disturbance alerts",
    recipe: "drivers",
  },
  {
    label: "Add a map comparing this period to previous years",
    recipe: "alerts",
  },
  {
    label: "Summarize the tree cover loss trend as an annotation",
    recipe: "annotation",
  },
];

const GALLERY_SUGGESTIONS: Suggestion[] = [
  {
    label: "Track near-real-time alerts for my areas of interest",
    recipe: "alerts",
  },
  { label: "Compare deforestation across countries", recipe: "countries" },
  { label: "Show carbon emissions over time", recipe: "emissions" },
];

export function getSuggestions(context: "gallery" | "detail"): Suggestion[] {
  return context === "detail" ? DETAIL_SUGGESTIONS : GALLERY_SUGGESTIONS;
}

// --- public API -------------------------------------------------------------

/** Free-text prompt → keyword-matched result. */
export function respondToPrompt(
  prompt: string,
  context: "gallery" | "detail"
): CannedResult {
  return buildResult(matchRecipe(prompt), prompt, context);
}

/** Suggestion row click → deterministic result for that recipe. */
export function respondToSuggestion(
  suggestion: Suggestion,
  context: "gallery" | "detail"
): CannedResult {
  return buildResult(suggestion.recipe, suggestion.label, context);
}

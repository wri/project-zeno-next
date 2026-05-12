import type { ChartType } from "@/app/types/portfolio";

export interface MockResponse {
  keywords: string[];
  insight_title: string;
  dataset: string;
  chart_type: ChartType;
  narration: string;
}

export const MOCK_RESPONSES: MockResponse[] = [
  {
    keywords: ["deforestation", "driver", "cause"],
    insight_title: "Deforestation drivers analysis",
    dataset: "Hansen TCL",
    chart_type: "bar",
    narration:
      "Agricultural expansion and small-scale mining are the primary drivers of tree cover loss in this area, concentrated in the southeastern corridors. Loss rates have increased 18% year-on-year since 2022.",
  },
  {
    keywords: ["fire", "burn", "alert"],
    insight_title: "Fire alert summary",
    dataset: "VIIRS fire alerts",
    chart_type: "line",
    narration:
      "Fire activity peaks between July and October, coinciding with the dry season. 2024 saw a 24% increase in active fire detections compared to the 2019–2023 average.",
  },
  {
    keywords: ["carbon", "stock", "biomass"],
    insight_title: "Carbon stock estimate",
    dataset: "Carbon flux (GFW Pro)",
    chart_type: "pie",
    narration:
      "Above-ground biomass in this area is estimated at 180 tonnes of carbon per hectare. Continued loss at current rates would release approximately 4.2 MtCO₂e over the next decade.",
  },
  {
    keywords: ["canopy", "height", "structure"],
    insight_title: "Canopy height profile",
    dataset: "Canopy height (Potapov)",
    chart_type: "bar",
    narration:
      "Mean canopy height is 28m, with old-growth areas reaching 42m. Degraded zones show a marked reduction to 8–12m, indicating selective logging pressure.",
  },
];

export const FALLBACK_RESPONSE: Omit<MockResponse, "keywords"> = {
  insight_title: "Area summary",
  dataset: "Hansen TCL",
  chart_type: "bar",
  narration:
    "Analysis complete for this area. Key indicators show continued pressure on forest cover, with the most significant changes in the past 24 months.",
};

export function matchMockResponse(
  message: string
): Omit<MockResponse, "keywords"> {
  const lower = message.toLowerCase();
  for (const r of MOCK_RESPONSES) {
    if (r.keywords.some((k) => lower.includes(k))) {
      return {
        insight_title: r.insight_title,
        dataset: r.dataset,
        chart_type: r.chart_type,
        narration: r.narration,
      };
    }
  }
  return FALLBACK_RESPONSE;
}

import { v4 as uuidv4 } from "uuid";
import type { PinnedInsight } from "@/app/types/portfolio";

// Fallback mock insights used when the inbox is completely empty.
// The five mocks mirror the cards shown in the wireframe so the
// prototype is demoable without first generating real insights in chat.
// Real pinned insights always take precedence.
export function buildSeedInsights(): PinnedInsight[] {
  const now = Date.now();
  const isoAgo = (days: number) =>
    new Date(now - days * 86_400_000).toISOString();

  return [
    {
      id: uuidv4(),
      title: "Tree cover loss 2024 — Madre de Dios",
      description: "Annual Hansen TCL loss in Madre de Dios, Peru.",
      datasetName: "Hansen TCL",
      chartType: "bar",
      aoi: {
        name: "Madre de Dios, Peru",
        src_ids: ["PER.16"],
        source: "GADM",
        isMultiArea: false,
        bbox: [-71.9, -13.5, -68.7, -9.9],
      },
      pinnedAt: isoAgo(3),
      data: [
        { year: 2019, loss_ha: 24000 },
        { year: 2020, loss_ha: 27000 },
        { year: 2021, loss_ha: 31000 },
        { year: 2022, loss_ha: 29000 },
        { year: 2023, loss_ha: 34000 },
        { year: 2024, loss_ha: 40000 },
      ],
      xAxis: "year",
      yAxis: "loss_ha",
    },
    {
      id: uuidv4(),
      title: "Fire alert summary Q1 2025 — Bwindi",
      description: "VIIRS fire detections across Q1 in Bwindi.",
      datasetName: "VIIRS fire alerts",
      chartType: "line",
      aoi: {
        name: "Bwindi Impenetrable Forest, Uganda",
        src_ids: ["UGA.10"],
        source: "GADM",
        isMultiArea: false,
        bbox: [29.5, -1.1, 29.8, -0.8],
      },
      pinnedAt: isoAgo(7),
      data: [
        { week: 1, alerts: 12 },
        { week: 2, alerts: 18 },
        { week: 3, alerts: 9 },
        { week: 4, alerts: 22 },
        { week: 5, alerts: 31 },
        { week: 6, alerts: 14 },
      ],
      xAxis: "week",
      yAxis: "alerts",
    },
    {
      id: uuidv4(),
      title: "Canopy height baseline — Cerrado",
      description: "Mean canopy height distribution across the Cerrado biome.",
      datasetName: "Canopy height (Potapov)",
      chartType: "pie",
      aoi: {
        name: "Cerrado, Brazil",
        src_ids: ["BRA-cerrado"],
        source: "GADM",
        isMultiArea: false,
        bbox: [-58.0, -24.0, -41.0, -3.0],
      },
      pinnedAt: isoAgo(14),
      data: [
        { band: "0-5m", share: 18 },
        { band: "5-15m", share: 42 },
        { band: "15-30m", share: 31 },
        { band: "30m+", share: 9 },
      ],
      xAxis: "band",
      yAxis: "share",
    },
    {
      id: uuidv4(),
      title: "Deforestation drivers — US Southeast States",
      description:
        "TCL drivers across Alabama, Georgia, Mississippi, Tennessee, South Carolina.",
      datasetName: "Hansen TCL",
      chartType: "bar",
      aoi: {
        name: "US Southeast (5 states)",
        src_ids: ["USA.1", "USA.10", "USA.24", "USA.42", "USA.40"],
        source: "GADM",
        isMultiArea: true,
        bbox: [-91.6, 30.1, -81.0, 36.7],
      },
      pinnedAt: isoAgo(5),
      data: [
        { driver: "Forestry", loss_ha: 410000 },
        { driver: "Agriculture", loss_ha: 220000 },
        { driver: "Urbanisation", loss_ha: 95000 },
        { driver: "Other", loss_ha: 38000 },
      ],
      xAxis: "driver",
      yAxis: "loss_ha",
    },
    {
      id: uuidv4(),
      title: "Carbon stock — Leuser Ecosystem",
      description: "Above-ground biomass distribution in Leuser, Sumatra.",
      datasetName: "Carbon flux (GFW Pro)",
      chartType: "bar",
      aoi: {
        name: "Leuser, Sumatra",
        src_ids: ["IDN-leuser"],
        source: "GADM",
        isMultiArea: false,
        bbox: [96.2, 2.6, 98.6, 4.7],
      },
      pinnedAt: isoAgo(21),
      data: [
        { zone: "Core", tonnes_c_ha: 220 },
        { zone: "Buffer", tonnes_c_ha: 145 },
        { zone: "Degraded", tonnes_c_ha: 60 },
      ],
      xAxis: "zone",
      yAxis: "tonnes_c_ha",
    },
  ];
}

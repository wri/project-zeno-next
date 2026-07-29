import type { InsightRecord } from "@/src/entities/insight";

/**
 * Curated, hand-verified insights shown under the "Verified" filter. A stub
 * until a real backend source exists; kept minimal on purpose.
 */
export const verifiedInsights: InsightRecord[] = [
  {
    id: "verified-tcl-brazil",
    source: "Global Forest Watch · Hansen/UMD",
    createdAt: "2024-01-15T00:00:00.000Z",
    verification: "verified",
    insightText:
      "Annual tree cover loss across Brazil, 2020–2022, from the Hansen/UMD dataset.",
    charts: [
      {
        id: "verified-tcl-brazil-chart-0",
        position: 0,
        title: "Annual tree cover loss",
        type: "bar",
        xAxis: "year",
        yAxis: "loss_ha",
        colorField: "",
        stackField: "",
        groupField: "",
        seriesFields: ["loss_ha"],
        data: [
          { year: "2020", loss_ha: 1700000 },
          { year: "2021", loss_ha: 1500000 },
          { year: "2022", loss_ha: 1600000 },
        ],
      },
    ],
  },
  {
    id: "verified-kba-coverage",
    source: "WDPA · KBA Partnership",
    createdAt: "2024-02-02T00:00:00.000Z",
    verification: "verified",
    insightText:
      "Share of Key Biodiversity Area extent under formal protection, by region.",
    charts: [
      {
        id: "verified-kba-coverage-chart-0",
        position: 0,
        title: "KBA area under protection",
        type: "bar",
        xAxis: "region",
        yAxis: "pct_protected",
        colorField: "",
        stackField: "",
        groupField: "",
        seriesFields: ["pct_protected"],
        data: [
          { region: "Amazonia", pct_protected: 48 },
          { region: "Congo Basin", pct_protected: 39 },
          { region: "SE Asia", pct_protected: 31 },
        ],
      },
    ],
  },
];

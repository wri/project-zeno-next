"use client";

import { useState } from "react";
import {
  Box,
  Container,
  Flex,
  Heading,
  Text,
  Separator,
  Badge,
  Button,
} from "@chakra-ui/react";
import WidgetMessage from "@/app/components/WidgetMessage";
import type { InsightWidget } from "@/app/types/chat";

// ---------------------------------------------------------------------------
// Dummy datasets
// ---------------------------------------------------------------------------

const BAR_DATA = [
  { country: "Brazil", tree_cover_loss_ha: 4812000 },
  { country: "Indonesia", tree_cover_loss_ha: 2610000 },
  { country: "DR Congo", tree_cover_loss_ha: 1100000 },
  { country: "Bolivia", tree_cover_loss_ha: 590000 },
  { country: "Malaysia", tree_cover_loss_ha: 475000 },
  { country: "Peru", tree_cover_loss_ha: 310000 },
  { country: "Colombia", tree_cover_loss_ha: 295000 },
  { country: "Cameroon", tree_cover_loss_ha: 270000 },
];

const STACKED_BAR_DATA = [
  { year: 2018, "Natural forests": 3200, "Plantations": 800, "Other": 400 },
  { year: 2019, "Natural forests": 3400, "Plantations": 900, "Other": 350 },
  { year: 2020, "Natural forests": 2900, "Plantations": 750, "Other": 500 },
  { year: 2021, "Natural forests": 3100, "Plantations": 820, "Other": 420 },
  { year: 2022, "Natural forests": 2700, "Plantations": 680, "Other": 380 },
  { year: 2023, "Natural forests": 2500, "Plantations": 600, "Other": 300 },
];

const GROUPED_BAR_DATA = [
  { region: "Southeast Asia", year: "2020", area_km2: 12500 },
  { region: "Southeast Asia", year: "2021", area_km2: 11800 },
  { region: "Southeast Asia", year: "2022", area_km2: 10200 },
  { region: "Central Africa", year: "2020", area_km2: 8400 },
  { region: "Central Africa", year: "2021", area_km2: 9100 },
  { region: "Central Africa", year: "2022", area_km2: 9800 },
  { region: "South America", year: "2020", area_km2: 15200 },
  { region: "South America", year: "2021", area_km2: 14300 },
  { region: "South America", year: "2022", area_km2: 12800 },
];

const LINE_DATA = [
  { year: 2015, carbon_emissions_mt: 2.1 },
  { year: 2016, carbon_emissions_mt: 2.3 },
  { year: 2017, carbon_emissions_mt: 2.0 },
  { year: 2018, carbon_emissions_mt: 2.5 },
  { year: 2019, carbon_emissions_mt: 2.8 },
  { year: 2020, carbon_emissions_mt: 2.2 },
  { year: 2021, carbon_emissions_mt: 3.1 },
  { year: 2022, carbon_emissions_mt: 3.4 },
  { year: 2023, carbon_emissions_mt: 3.0 },
];

const AREA_DATA = [
  { year: 2015, forest_area_km2: 39500 },
  { year: 2016, forest_area_km2: 39200 },
  { year: 2017, forest_area_km2: 38900 },
  { year: 2018, forest_area_km2: 38400 },
  { year: 2019, forest_area_km2: 37800 },
  { year: 2020, forest_area_km2: 37300 },
  { year: 2021, forest_area_km2: 36700 },
  { year: 2022, forest_area_km2: 36100 },
  { year: 2023, forest_area_km2: 35600 },
];

const PIE_LAND_COVER = [
  { land_cover_type: "Tree cover", area_km2: 42000 },
  { land_cover_type: "Short vegetation", area_km2: 18500 },
  { land_cover_type: "Cropland", area_km2: 12300 },
  { land_cover_type: "Water", area_km2: 5400 },
  { land_cover_type: "Bare and sparse vegetation", area_km2: 3200 },
  { land_cover_type: "Built-up", area_km2: 1800 },
  { land_cover_type: "Wetland – short vegetation", area_km2: 900 },
];

const PIE_GENERIC = [
  { category: "Agriculture", value: 45 },
  { category: "Energy", value: 30 },
  { category: "Transport", value: 15 },
  { category: "Industry", value: 10 },
];

const SCATTER_DATA = [
  { country: "Brazil", gdp_per_capita: 8900, deforestation_ha: 4812000 },
  { country: "Indonesia", gdp_per_capita: 4300, deforestation_ha: 2610000 },
  { country: "DR Congo", gdp_per_capita: 580, deforestation_ha: 1100000 },
  { country: "Bolivia", gdp_per_capita: 3600, deforestation_ha: 590000 },
  { country: "Malaysia", gdp_per_capita: 11400, deforestation_ha: 475000 },
  { country: "Peru", gdp_per_capita: 6700, deforestation_ha: 310000 },
  { country: "Colombia", gdp_per_capita: 6100, deforestation_ha: 295000 },
  { country: "Cameroon", gdp_per_capita: 1500, deforestation_ha: 270000 },
  { country: "Laos", gdp_per_capita: 2600, deforestation_ha: 220000 },
  { country: "Myanmar", gdp_per_capita: 1200, deforestation_ha: 310000 },
];

const TABLE_DATA = [
  { rank: 1, country: "Brazil", tree_cover_loss_ha: 4812000, primary_forest_loss_ha: 1695000, pct_of_total: 26.5 },
  { rank: 2, country: "Indonesia", tree_cover_loss_ha: 2610000, primary_forest_loss_ha: 930000, pct_of_total: 14.4 },
  { rank: 3, country: "DR Congo", tree_cover_loss_ha: 1100000, primary_forest_loss_ha: 510000, pct_of_total: 6.1 },
  { rank: 4, country: "Bolivia", tree_cover_loss_ha: 590000, primary_forest_loss_ha: 189000, pct_of_total: 3.3 },
  { rank: 5, country: "Malaysia", tree_cover_loss_ha: 475000, primary_forest_loss_ha: 173000, pct_of_total: 2.6 },
  { rank: 6, country: "Peru", tree_cover_loss_ha: 310000, primary_forest_loss_ha: 155000, pct_of_total: 1.7 },
  { rank: 7, country: "Colombia", tree_cover_loss_ha: 295000, primary_forest_loss_ha: 120000, pct_of_total: 1.6 },
  { rank: 8, country: "Cameroon", tree_cover_loss_ha: 270000, primary_forest_loss_ha: 95000, pct_of_total: 1.5 },
  { rank: 9, country: "Laos", tree_cover_loss_ha: 220000, primary_forest_loss_ha: 70000, pct_of_total: 1.2 },
  { rank: 10, country: "Myanmar", tree_cover_loss_ha: 210000, primary_forest_loss_ha: 68000, pct_of_total: 1.2 },
];

const DRIVER_PIE = [
  { driver: "Logging", area_ha: 3400000 },
  { driver: "Shifting cultivation", area_ha: 2800000 },
  { driver: "Wildfire", area_ha: 1900000 },
  { driver: "Permanent agriculture", area_ha: 1500000 },
  { driver: "Settlements & Infrastructure", area_ha: 600000 },
  { driver: "Hard commodities", area_ha: 350000 },
  { driver: "Other natural disturbances", area_ha: 250000 },
  { driver: "Unknown", area_ha: 180000 },
];

// Large table for pagination testing
const LARGE_TABLE_DATA = Array.from({ length: 50 }, (_, i) => ({
  rank: i + 1,
  province: `Province ${String.fromCharCode(65 + (i % 26))}${i >= 26 ? "2" : ""}`,
  area_ha: Math.round(50000 - i * 800 + Math.random() * 200),
  change_pct: +((-2 - Math.random() * 8).toFixed(1)),
}));

// Long category names for label testing
const LONG_LABEL_BAR_DATA = [
  { land_cover_type: "Tropical moist broadleaf forests", area_km2: 17000 },
  { land_cover_type: "Tropical dry broadleaf forests", area_km2: 4200 },
  { land_cover_type: "Tropical coniferous forests", area_km2: 1800 },
  { land_cover_type: "Temperate broadleaf mixed forests", area_km2: 10400 },
  { land_cover_type: "Temperate conifer forests", area_km2: 5600 },
  { land_cover_type: "Boreal forests / taiga", area_km2: 14200 },
  { land_cover_type: "Mediterranean forests", area_km2: 3100 },
];

// ---------------------------------------------------------------------------
// Widget fixtures
// ---------------------------------------------------------------------------

const FIXTURES: { label: string; notes: string; widget: InsightWidget }[] = [
  {
    label: "Bar chart",
    notes: "Simple bar with country-level data. Tests axis labels, Y-axis unit extraction (_ha), and tooltip.",
    widget: {
      type: "bar",
      title: "Tree cover loss by country (2023)",
      description: "Top countries by tree cover loss in hectares during 2023.",
      data: BAR_DATA,
      xAxis: "country",
      yAxis: "tree_cover_loss_ha",
    },
  },
  {
    label: "Bar chart — long labels",
    notes: "Stress test for X-axis label truncation and angling with long biome names.",
    widget: {
      type: "bar",
      title: "Forest area by biome type",
      description: "Distribution of forest area across major biome categories.",
      data: LONG_LABEL_BAR_DATA,
      xAxis: "land_cover_type",
      yAxis: "area_km2",
    },
  },
  {
    label: "Stacked bar chart",
    notes: "Multi-series stacked bar. Tests legend, series colors, and stacking.",
    widget: {
      type: "stacked-bar",
      title: "Forest loss by type (2018–2023)",
      description: "Annual tree cover loss disaggregated by forest type in thousands of hectares.",
      data: STACKED_BAR_DATA,
      xAxis: "year",
      yAxis: "Natural forests",
    },
  },
  {
    label: "Grouped bar chart",
    notes: "Tests the long-to-wide pivot in formatChartData and multi-year grouping.",
    widget: {
      type: "grouped-bar",
      title: "Deforestation by region and year",
      description: "Comparing deforestation trends across three tropical regions.",
      data: GROUPED_BAR_DATA,
      xAxis: "region",
      yAxis: "area_km2",
    },
  },
  {
    label: "Line chart",
    notes: "Simple time-series line. Tests year axis formatting and monotone curve.",
    widget: {
      type: "line",
      title: "Carbon emissions from land use (2015–2023)",
      description: "Annual CO₂ emissions from deforestation and land degradation.",
      data: LINE_DATA,
      xAxis: "year",
      yAxis: "carbon_emissions_mt",
    },
  },
  {
    label: "Area chart",
    notes: "Filled area chart showing decline. Tests fill opacity and stacking.",
    widget: {
      type: "area",
      title: "Forest area decline in Borneo",
      description: "Total forest cover in km² showing steady decline over 9 years.",
      data: AREA_DATA,
      xAxis: "year",
      yAxis: "forest_area_km2",
    },
  },
  {
    label: "Pie chart — domain colors",
    notes: "Uses land_cover_type which has a domain color mapping in chartColorMappings.ts.",
    widget: {
      type: "pie",
      title: "Land cover composition — Kalimantan",
      description: "Breakdown of land cover types by area in km².",
      data: PIE_LAND_COVER,
      xAxis: "land_cover_type",
      yAxis: "area_km2",
    },
  },
  {
    label: "Pie chart — driver colors",
    notes: "Uses driver field with its own domain color mapping.",
    widget: {
      type: "pie",
      title: "Deforestation drivers — Indonesia",
      description: "Area of forest loss attributed to each driver category.",
      data: DRIVER_PIE,
      xAxis: "driver",
      yAxis: "area_ha",
    },
  },
  {
    label: "Pie chart — generic",
    notes: "No domain color mapping — falls back to theme palette.",
    widget: {
      type: "pie",
      title: "Emissions by sector",
      description: "Percentage share of greenhouse gas emissions.",
      data: PIE_GENERIC,
      xAxis: "category",
      yAxis: "value",
    },
  },
  {
    label: "Scatter chart",
    notes: "GDP vs deforestation. Tests scatter tooltip, 3-column (name/x/y) layout.",
    widget: {
      type: "scatter",
      title: "GDP per capita vs deforestation",
      description: "Relationship between economic output and forest loss across countries.",
      data: SCATTER_DATA,
      xAxis: "gdp_per_capita",
      yAxis: "deforestation_ha",
    },
  },
  {
    label: "Table",
    notes: "Standard table with rank column. Tests badge, number formatting, sorting.",
    widget: {
      type: "table",
      title: "Top 10 countries by tree cover loss",
      description: "Ranked list of countries with the highest tree cover loss in 2023.",
      data: TABLE_DATA as unknown as InsightWidget["data"],
      xAxis: "",
      yAxis: "",
    },
  },
  {
    label: "Table — large (pagination)",
    notes: "50 rows to test pagination controls and sort stability.",
    widget: {
      type: "table",
      title: "Province-level deforestation data",
      description: "Simulated dataset with 50 rows to exercise table pagination.",
      data: LARGE_TABLE_DATA as unknown as InsightWidget["data"],
      xAxis: "",
      yAxis: "",
    },
  },
  {
    label: "Empty data",
    notes: "Tests the empty-state fallback when data is an empty array.",
    widget: {
      type: "bar",
      title: "No data available",
      description: "This chart intentionally has no data to verify the empty state.",
      data: [],
      xAxis: "x",
      yAxis: "y",
    },
  },
];

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function ChartDebugPanel() {
  const [filter, setFilter] = useState<string>("all");

  const categories = [
    { key: "all", label: "All" },
    { key: "bar", label: "Bars" },
    { key: "line", label: "Line / Area" },
    { key: "pie", label: "Pie" },
    { key: "scatter", label: "Scatter" },
    { key: "table", label: "Table" },
    { key: "edge", label: "Edge cases" },
  ];

  const filtered = FIXTURES.filter((f) => {
    if (filter === "all") return true;
    if (filter === "bar")
      return ["bar", "stacked-bar", "grouped-bar"].includes(f.widget.type);
    if (filter === "line") return ["line", "area"].includes(f.widget.type);
    if (filter === "pie") return f.widget.type === "pie";
    if (filter === "scatter") return f.widget.type === "scatter";
    if (filter === "table") return f.widget.type === "table";
    if (filter === "edge")
      return (
        f.label.includes("long labels") ||
        f.label.includes("pagination") ||
        f.label.includes("Empty")
      );
    return true;
  });

  return (
    <Box bg="bg.subtle" minH="100vh" py={8}>
      <Container maxW="4xl">
        <Flex align="center" gap={3} mb={2}>
          <Heading size="lg" m={0}>
            Chart Debug Panel
          </Heading>
          <Badge colorPalette="orange" variant="solid" fontSize="xs">
            DEBUG
          </Badge>
        </Flex>
        <Text fontSize="sm" color="fg.muted" mb={6}>
          Visual review of every chart type with representative dummy data.
          Only accessible when <code>NEXT_PUBLIC_ENABLE_DEBUG_TOOLS=true</code>.
        </Text>

        {/* Filter bar */}
        <Flex gap={2} mb={6} flexWrap="wrap">
          {categories.map((c) => (
            <Button
              key={c.key}
              size="xs"
              variant={filter === c.key ? "solid" : "outline"}
              colorPalette={filter === c.key ? "primary" : undefined}
              onClick={() => setFilter(c.key)}
            >
              {c.label}
            </Button>
          ))}
        </Flex>

        <Flex direction="column" gap={8}>
          {filtered.map((fixture, idx) => (
            <Box key={idx}>
              <Flex align="baseline" gap={2} mb={1}>
                <Heading size="sm" m={0}>
                  {fixture.label}
                </Heading>
                <Badge size="sm" variant="outline">
                  {fixture.widget.type}
                </Badge>
              </Flex>
              <Text fontSize="xs" color="fg.muted" mb={3}>
                {fixture.notes}
              </Text>
              <WidgetMessage widget={fixture.widget} />
              {idx < filtered.length - 1 && <Separator mt={8} />}
            </Box>
          ))}
        </Flex>

        <Separator my={8} />
        <Text fontSize="xs" color="fg.subtle" textAlign="center">
          {FIXTURES.length} fixtures · showing {filtered.length} ·
          rendered at {new Date().toLocaleTimeString()}
        </Text>
      </Container>
    </Box>
  );
}

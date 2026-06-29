import type { ElementType } from "react";
import {
  BellIcon,
  ChartLineIcon,
  FireIcon,
  GlobeIcon,
} from "@phosphor-icons/react";
import { WIDGET_FIXTURES } from "@/app/dashboards/lib/fixtures";
import type { DashboardWidget } from "@/app/types/dashboard";

// Curated dashboard starting points. Used both on the gallery ("Start from a
// template" — seeds a brand-new dashboard) and in the setup-flow Analyses pane
// ("Templates" tab — appends to the dashboard being created). One source of
// truth so the two never drift.

/** Brand colourway for a template card (matches the Figma template cards). */
export interface TemplateTheme {
  /** Card background fill. */
  bg: string;
  /** Title / foreground colour. */
  fg: string;
  /** "Template" eyebrow colour. */
  eyebrow: string;
  /** Card border colour. */
  border: string;
}

export interface DashboardTemplate {
  key: string;
  /** Card title (shown on the gallery + Analyses-pane cards). */
  label: string;
  /** Longer descriptor — retained for tooltips/future use, not shown on cards. */
  description: string;
  /** Placeholder thumbnail icon (no per-template artwork yet). */
  icon: ElementType;
  theme: TemplateTheme;
  title: string;
  widgets: Omit<DashboardWidget, "id">[];
}

export const TEMPLATES: DashboardTemplate[] = [
  {
    key: "alerts",
    label: "Track near-real-time alerts for my areas of interest",
    description: "Near-real-time alerts for my areas of interest",
    icon: BellIcon,
    theme: {
      bg: "#FFFFFF",
      fg: "#0049AA",
      eyebrow: "#4A64CB",
      border: "#DDE2F5",
    },
    title: "Near-real-time alerts",
    widgets: [
      {
        kind: "text",
        span: 2,
        text: "Monitor disturbance alerts across your areas of interest. New alerts from the last three months are highlighted on the map below.",
      },
      {
        kind: "map",
        span: 2,
        map: {
          caption: "Disturbance alerts — last 3 months",
          alertCount: 200,
          insetTitle: "Global all ecosystem disturbance alerts",
        },
      },
    ],
  },
  {
    key: "emissions",
    label: "Monitor emissions over time",
    description: "Emissions and carbon flux over time",
    icon: ChartLineIcon,
    theme: {
      bg: "#0049AA",
      fg: "#FFFFFF",
      eyebrow: "rgba(255,255,255,0.72)",
      border: "#0049AA",
    },
    title: "Emissions over time",
    widgets: [
      {
        kind: "text",
        span: 2,
        text: "Track carbon emissions from land use across the selected area over the past decade.",
      },
      {
        kind: "insight",
        span: 1,
        verified: true,
        insight: WIDGET_FIXTURES.emissionsLine,
      },
      {
        kind: "insight",
        span: 1,
        verified: true,
        insight: WIDGET_FIXTURES.driversPie,
      },
    ],
  },
  {
    key: "event",
    label: "Assess impact of a recent event",
    description: "Impact of a recent fire, storm, or clearing",
    icon: FireIcon,
    theme: {
      bg: "#D7E94F",
      fg: "#1A2E05",
      eyebrow: "#5A6B1E",
      border: "#D7E94F",
    },
    title: "Recent event impact",
    widgets: [
      {
        kind: "text",
        span: 2,
        text: "Assess the impact of a recent disturbance event on tree cover and emissions.",
      },
      {
        kind: "insight",
        span: 1,
        verified: true,
        insight: WIDGET_FIXTURES.treeCoverLine,
      },
      {
        kind: "map",
        span: 1,
        map: { caption: "Affected area", alertCount: 120 },
      },
    ],
  },
  {
    key: "compare",
    label: "Compare deforestation across regions",
    description: "Deforestation across countries and regions",
    icon: GlobeIcon,
    theme: {
      bg: "#102A6B",
      fg: "#FFFFFF",
      eyebrow: "rgba(255,255,255,0.72)",
      border: "#102A6B",
    },
    title: "Compare deforestation",
    widgets: [
      {
        kind: "text",
        span: 2,
        text: "Compare tree cover loss across countries and rank the worst-affected regions.",
      },
      {
        kind: "insight",
        span: 1,
        verified: true,
        insight: WIDGET_FIXTURES.tclBar,
      },
      {
        kind: "insight",
        span: 1,
        verified: false,
        insight: WIDGET_FIXTURES.tclTable,
      },
    ],
  },
];

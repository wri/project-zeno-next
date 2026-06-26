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

export interface DashboardTemplate {
  key: string;
  label: string;
  description: string;
  accent: string;
  icon: ElementType;
  title: string;
  widgets: Omit<DashboardWidget, "id">[];
}

export const TEMPLATES: DashboardTemplate[] = [
  {
    key: "alerts",
    label: "Track alerts",
    description: "Near-real-time alerts for my areas of interest",
    accent: "green.500",
    icon: BellIcon,
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
    label: "Monitor emissions",
    description: "Emissions and carbon flux over time",
    accent: "blue.500",
    icon: ChartLineIcon,
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
    label: "Assess an event",
    description: "Impact of a recent fire, storm, or clearing",
    accent: "orange.500",
    icon: FireIcon,
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
    label: "Compare regions",
    description: "Deforestation across countries and regions",
    accent: "purple.500",
    icon: GlobeIcon,
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

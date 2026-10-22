import type { LayerId } from "@/app/types/map";

/**
 * The feature tour in the What's new panel. Its own module so the menu side
 * bar can count the updates without importing the panel.
 */

// A feature's "try it" button is data so this module stays free of the
// stores; the panel runs it.
export interface BoundaryAction {
  kind: "boundary";
  label: string;
  layerId: LayerId;
  /** [[west, south], [east, north]] */
  bounds: [[number, number], [number, number]];
}

export interface PromptAction {
  kind: "prompt";
  label: string;
  prompt: string;
}

export interface LinkAction {
  kind: "link";
  label: string;
  /** An in-app path */
  href: string;
}

export type WhatsNewAction = BoundaryAction | PromptAction | LinkAction;

export interface WhatsNewFeature {
  step: number;
  title: string;
  description: string;
  // TODO: screenshots for the v6 features; until then their rows are text only.
  image?: string;
  action?: WhatsNewAction;
}

export const WHATS_NEW_FEATURES: WhatsNewFeature[] = [
  {
    step: 1,
    title: "Analyse concession areas",
    description:
      "Logging, mining, oil palm, RSPO oil palm and wood fiber concessions are now under 'Boundaries' in the 'Areas' panel. Show a concession layer, zoom in, click a concession on the map to select it, and ask the AI-assistant to analyze it.",
    action: {
      kind: "boundary",
      label: "Show oil palm concessions",
      layerId: "OIL_PALM",
      // Indonesia and Malaysia.
      bounds: [
        [95, -11],
        [141, 7.5],
      ],
    },
  },
  {
    step: 2,
    title: "Planet imagery of the Amazon",
    description:
      "Ask for Planet imagery to see high-resolution monthly mosaics of the Amazon, back to September 2020. Planet covers land near recent forest disturbance alerts and appears once you zoom in close. Where it has no imagery, the assistant shows Sentinel-2 instead.",
    action: {
      kind: "prompt",
      label: "Show Planet imagery of Lago do Amapá",
      // A small protected area, so the map frames it above Planet's minimum
      // zoom and the imagery shows without zooming in.
      prompt:
        "Show me the latest Planet imagery of Área De Proteção Ambiental Lago Do Amapá, Brazil",
    },
  },
  {
    step: 3,
    title: "Focus on natural forests and lands",
    description:
      "Ask the assistant to limit tree cover loss to natural forests, or integrated alerts to natural lands, using the SBTN Natural Lands Map. Plantations, cropland and built-up areas are left out, which suits deforestation-free and no-conversion questions. Natural forest loss is available from 2021.",
    action: {
      kind: "prompt",
      label: "Analyse natural forest loss in Brazil",
      prompt: "Show tree cover loss in natural forests in Brazil since 2021",
    },
  },
  {
    step: 4,
    title: "Weekly alerts on your dashboards",
    description:
      "Each week, your dashboards now flag new integrated alerts. Check the Dashboards page to see which ones have them, then open a dashboard to see how many hectares were detected. Ask the assistant to create or update charts with the latest alerts.",
    action: {
      kind: "link",
      label: "Go to dashboards",
      href: "/dashboards",
    },
  },
];

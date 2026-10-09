/**
 * The feature tour in the What's new panel. Its own module so the menu side
 * bar can count the updates without importing the panel.
 */
export interface WhatsNewFeature {
  step: number;
  title: string;
  description: string;
}

export const WHATS_NEW_FEATURES: WhatsNewFeature[] = [
  {
    step: 1,
    title: "Introducing dashboards",
    description:
      "Turn your analyses into dashboards. Ask the assistant to create one for the area you are exploring, or start one straight from the map, and every insight you save is there to revisit.",
  },
  {
    step: 2,
    title: "Make a dashboard your own",
    description:
      "Group charts into sections, drag sections to reorder them, and customise any chart using the section menu. Ask the assistant to create a new section for you.",
  },
  {
    step: 3,
    title: "Satellite imagery in chat",
    description:
      "Ask to see recent satellite imagery of your area and the assistant brings Sentinel-2 imagery straight onto the map.",
  },
  {
    step: 4,
    title: "Answers with sources",
    description:
      "When the assistant draws on WRI research, it cites its sources with cards linking to the original blog posts and insights.",
  },
];

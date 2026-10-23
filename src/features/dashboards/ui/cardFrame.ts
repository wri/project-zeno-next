import { HERO_GRID_IMAGE } from "./heroGrid";

// The list card's outer frame, spread by `DashboardCard` and
// `DashboardCardSkeleton` so the skeleton swaps for the card without moving.
export const CARD_FRAME_PROPS = {
  minH: "308px",
  bg: "white",
  backgroundImage: HERO_GRID_IMAGE,
  borderWidth: "1px",
  borderColor: "border",
  borderTopWidth: "2px",
  borderTopColor: "primary.solid",
  borderRadius: "sm",
} as const;

// The card's content column. Text starts 48px down per the Figma cards list,
// just under the 24px actions menu that sits at the 20px top padding.
export const CARD_BODY_PROPS = {
  direction: "column",
  gap: 2,
  p: 5,
  pt: "48px",
} as const;

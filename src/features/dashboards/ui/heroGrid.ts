// Graph-paper hero per the Figma page shell (node 1317-3730): minor 1px
// #FCFCFC lines every 7px with a stronger #F9F9FA line every 70px, on white.
// Major lines listed first so they paint over coincident minor lines.
// Shared by the dashboard detail hero band and the dashboard list cards.
export const HERO_GRID_IMAGE = [
  "repeating-linear-gradient(to right, #F9F9FA 0 1px, transparent 1px 70px)",
  "repeating-linear-gradient(to bottom, #F9F9FA 0 1px, transparent 1px 70px)",
  "repeating-linear-gradient(to right, #FCFCFC 0 1px, transparent 1px 7px)",
  "repeating-linear-gradient(to bottom, #FCFCFC 0 1px, transparent 1px 7px)",
].join(",");

// The 200px hero band across a card's top edge. Spread by the dashboard
// detail card and the pinned condensed header (which reads as that card's
// top edge) so the band stays identical on both.
export const HERO_BAND_PROPS = {
  backgroundImage: HERO_GRID_IMAGE,
  backgroundRepeat: "no-repeat",
  backgroundSize: "100% 200px",
} as const;

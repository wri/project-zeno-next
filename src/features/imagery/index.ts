/**
 * Public API of the `imagery` feature (FSD slice): Sentinel-2 imagery
 * searched and rendered in the browser, with no tiler and no server mosaic.
 *
 * - model: the request (and its recipe token, shared with the backend), scene
 *   selection and limits.
 * - api: the earth-search scene search.
 * - ui: the deck.gl map layers (lazy) and the legend's filter popover.
 *
 * Consumers import ONLY from this barrel. It never imports deck.gl
 * statically: `Sentinel2Layers` is a lazy component.
 */
import { lazy } from "react";

export {
  CLOUD_OPTIONS,
  DEFAULT_MAX_CLOUD_COVER,
  DEFAULT_MAX_ITEMS,
  DEFAULT_WINDOW_DAYS,
  FIRST_SCENE_DATE,
  WINDOW_OPTIONS,
  decodeRecipe,
  defaultRequest,
  encodeRecipe,
  normalizeRequest,
  searchRange,
  type AoiRef,
  type Sentinel2Request,
} from "./model/request";
export {
  SCENE_LIMITS,
  type CaptureStatus,
  type Scene,
  type SceneLimits,
  type SceneSummary,
} from "./model/scenes";
export { toFeatureCollection } from "./lib/search";
export { findScenes, type SceneSearchResult } from "./api/find-scenes";
export type {
  Sentinel2LayerCapture,
  Sentinel2LayersProps,
} from "./ui/Sentinel2Layers";
export {
  ImageryFilterPopover,
  type ScenePreview,
} from "./ui/ImageryFilterPopover";

/** The deck.gl imagery layers; must render inside react-map-gl's `<Map>`. */
export const Sentinel2Layers = lazy(() => import("./ui/Sentinel2Layers"));

/** The URL feature flag (`?ff=client-imagery`) for client-side imagery. */
export const CLIENT_IMAGERY_FLAG = "client-imagery";

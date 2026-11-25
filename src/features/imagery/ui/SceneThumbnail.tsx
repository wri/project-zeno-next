import { useEffect, useState, type ReactNode } from "react";
import {
  boundingBox,
  boxCorners,
  previewCrop,
  type PreviewCrop,
} from "../lib/thumbnail";
import type { Scene } from "../model/scenes";
import { ImageryPlaceholder } from "./ImageryPlaceholder";

type Bounds = [number, number, number, number];

/** proj4 definition of a WGS 84 / UTM zone EPSG code (326xx north, 327xx south). */
function utmDefinition(epsg: number): string | null {
  const zone = epsg % 100;
  if (Math.floor(epsg / 100) === 326 && zone >= 1 && zone <= 60) {
    return `+proj=utm +zone=${zone} +datum=WGS84 +units=m +no_defs`;
  }
  if (Math.floor(epsg / 100) === 327 && zone >= 1 && zone <= 60) {
    return `+proj=utm +zone=${zone} +south +datum=WGS84 +units=m +no_defs`;
  }
  return null;
}

interface Thumb {
  href: string;
  crop: PreviewCrop | null;
}

/**
 * The best scene's preview, cropped to the area. Tries the top-ranked scenes
 * in order and takes the first whose tile covers the area's centre (else the
 * first that overlaps it). proj4 loads lazily, only when a thumbnail shows.
 */
async function resolveThumb(
  scenes: Scene[],
  bounds: Bounds
): Promise<Thumb | null> {
  const candidates = scenes.filter(
    (s) => s.rank === 0 && s.thumbnailHref && s.epsg && s.extent
  );
  if (candidates.length === 0) return null;
  const { default: proj4 } = await import("proj4");
  const [west, south, east, north] = bounds;
  let overlapping: Thumb | null = null;
  for (const scene of candidates) {
    const definition = utmDefinition(scene.epsg!);
    if (!definition) continue;
    const toUtm = proj4("WGS84", definition);
    const area = boundingBox(
      boxCorners(bounds).map((p) => toUtm.forward(p) as [number, number])
    );
    const crop = previewCrop(scene.extent!, area);
    if (!crop) continue;
    const [cx, cy] = toUtm.forward([(west + east) / 2, (south + north) / 2]);
    const [minX, minY, maxX, maxY] = scene.extent!;
    const thumb = { href: scene.thumbnailHref!, crop };
    if (cx >= minX && cx <= maxX && cy >= minY && cy <= maxY) return thumb;
    overlapping ??= thumb;
  }
  return overlapping;
}

/**
 * A satellite-imagery thumbnail: the best scene's preview cropped to the
 * area (`bounds`, lon/lat), or the uncropped preview when the area or the
 * scene's projection is unknown, or `fallback` (the imagery placeholder)
 * when there is no preview or it fails to load.
 */
export function SceneThumbnail({
  scenes,
  bounds,
  size,
  fallback,
}: {
  scenes: Scene[];
  bounds?: Bounds;
  size: number;
  fallback?: ReactNode;
}) {
  const [thumb, setThumb] = useState<Thumb | null>(null);
  const [failedHref, setFailedHref] = useState<string>();
  const firstHref = scenes.find((s) => s.thumbnailHref)?.thumbnailHref;

  useEffect(() => {
    let cancelled = false;
    if (!bounds) return;
    resolveThumb(scenes, bounds)
      .then((t) => {
        if (!cancelled) setThumb(t);
      })
      .catch(() => {
        // No crop: the uncropped preview below still shows.
      });
    return () => {
      cancelled = true;
    };
  }, [scenes, bounds]);

  const href = thumb?.href ?? firstHref;
  if (!href || href === failedHref) {
    return <>{fallback ?? <ImageryPlaceholder size={size} />}</>;
  }
  const crop = thumb?.href === href ? thumb.crop : null;
  return (
    <div
      style={{
        position: "relative",
        width: size,
        height: size,
        overflow: "hidden",
        background: "#14304A",
      }}
    >
      <img
        src={href}
        alt="Satellite imagery"
        // The focus editor's strip can hold hundreds of scenes.
        loading="lazy"
        onError={() => setFailedHref(href)}
        style={
          crop
            ? {
                position: "absolute",
                width: `${crop.scale * 100}%`,
                height: `${crop.scale * 100}%`,
                left: `${crop.left * 100}%`,
                top: `${crop.top * 100}%`,
                maxWidth: "none",
              }
            : { width: "100%", height: "100%", objectFit: "cover" }
        }
      />
    </div>
  );
}

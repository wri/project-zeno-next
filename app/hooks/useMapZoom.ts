import { useEffect, useState } from "react";
import useMapStore from "@/app/store/mapStore";

/**
 * The main map's zoom, or undefined until the map has loaded. Updates on
 * `zoomend` rather than `zoom` so consumers re-render once per gesture, not
 * on every animation frame.
 */
export function useMapZoom(): number | undefined {
  const mapRef = useMapStore((s) => s.mapRef);
  const [zoom, setZoom] = useState<number>();

  useEffect(() => {
    if (!mapRef) return;
    const map = mapRef.getMap();
    const update = () => setZoom(map.getZoom());
    update();
    map.on("zoomend", update);
    return () => {
      map.off("zoomend", update);
    };
  }, [mapRef]);

  return zoom;
}

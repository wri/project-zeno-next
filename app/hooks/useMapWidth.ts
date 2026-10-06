import { useEffect, useState } from "react";
import useMapStore from "@/app/store/mapStore";

/**
 * The main map container's width in px, or undefined until the map has
 * loaded. Updates on MapLibre's `resize`, which it fires whenever the
 * container changes size.
 */
export function useMapWidth(): number | undefined {
  const mapRef = useMapStore((s) => s.mapRef);
  const [width, setWidth] = useState<number>();

  useEffect(() => {
    if (!mapRef) return;
    const map = mapRef.getMap();
    const update = () => setWidth(map.getContainer().clientWidth);
    update();
    map.on("resize", update);
    return () => {
      map.off("resize", update);
    };
  }, [mapRef]);

  return width;
}

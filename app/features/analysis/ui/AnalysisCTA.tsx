"use client";
import { Popup } from "react-map-gl/maplibre";
import useSelectionStore from "./selection-store";
import { useAnalysis } from "./use-analysis";
import { AnalysisCTAContent } from "./AnalysisCTAContent";

/**
 * Container for the analysis CTA: a geo-anchored popup at the clicked point,
 * driven by the selection store and the analysis hook. Holds no logic — the
 * tested pieces are the store, the hook, and AnalysisCTAContent.
 */
export function AnalysisCTA() {
  const selection = useSelectionStore((state) => state.selection);
  const lngLat = useSelectionStore((state) => state.lngLat);
  const clear = useSelectionStore((state) => state.clear);
  const { status, run } = useAnalysis();

  if (!selection || !lngLat) return null;

  return (
    <Popup
      longitude={lngLat.lng}
      latitude={lngLat.lat}
      anchor="bottom"
      closeOnClick={false}
      onClose={clear}
    >
      <AnalysisCTAContent
        name={selection.name}
        status={status}
        onAnalyze={() => run(selection)}
      />
    </Popup>
  );
}

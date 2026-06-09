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
  const { status, error, run } = useAnalysis();

  if (!selection || !lngLat) return null;

  // TODO: source dataset and date range from context before wiring the
  // real service — placeholder values used until that step lands.
  const handleAnalyze = () => {
    run({
      area: selection,
      dataset: { id: 4 },
      startDate: "2020-01-01",
      endDate: "2022-12-31",
    });
  };

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
        error={error}
        onAnalyze={handleAnalyze}
      />
    </Popup>
  );
}

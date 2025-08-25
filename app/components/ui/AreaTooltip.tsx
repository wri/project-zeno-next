import { Popup } from "react-map-gl/maplibre";

export interface HoverInfo {
  lng: number;
  lat: number;
  name: string;
}

interface AreaTooltipProps {
  hoverInfo: HoverInfo | undefined;
  areaName?: string;
}

function AreaTooltip({ hoverInfo, areaName }: AreaTooltipProps) {
  if (!hoverInfo) return null;

  const displayName = hoverInfo?.name || areaName;

  return (
    <Popup
      longitude={hoverInfo.lng}
      latitude={hoverInfo.lat}
      offset={[0, -20] as [number, number]}
      closeButton={false}
      anchor="left"
    >
      <p className="area-name">
        <b>{displayName}</b>
      </p>
      <p className="hint">Click to select {displayName}. Esc to exit.</p>
    </Popup>
  );
}

export default AreaTooltip;

import { Popup } from "react-map-gl/maplibre";

export interface HoverInfo {
  lng: number;
  lat: number;
  name: string;
}

interface AreaTooltipProps {
  hoverInfo: HoverInfo | undefined;
}

function AreaTooltip({ hoverInfo }: AreaTooltipProps) {
  if (!hoverInfo) return null;

  // The area name is resolved synchronously from vector-tile properties, but a
  // feature's name props aren't always populated the instant it's hovered.
  // Treat an empty name as "still resolving" and show a skeleton placeholder
  // rather than a blank or generic label, swapping in the real name as soon as
  // it's available.
  const resolvedName = hoverInfo.name?.trim();
  const isLoading = !resolvedName;

  return (
    <Popup
      longitude={hoverInfo.lng}
      latitude={hoverInfo.lat}
      offset={[0, -20] as [number, number]}
      closeButton={false}
      anchor="left"
    >
      <p className="hint">{isLoading ? "this area" : resolvedName}</p>
    </Popup>
  );
}

export default AreaTooltip;

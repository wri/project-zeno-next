import {
  CloudFogIcon,
  CloudIcon,
  CloudSunIcon,
  SunIcon,
  type Icon,
} from "@phosphor-icons/react";

/** A scene's cloud cover as weather: sunny, partly cloudy, cloudy, overcast. */
export interface CloudWeather {
  icon: Icon;
  label: string;
  /** Icon colour on a dark badge. */
  color: string;
}

export function cloudWeather(cloudCover: number): CloudWeather {
  if (cloudCover < 10)
    return { icon: SunIcon, label: "Clear", color: "#FFD15C" };
  if (cloudCover < 30) {
    return { icon: CloudSunIcon, label: "Mostly clear", color: "#FFE7A3" };
  }
  if (cloudCover < 60)
    return { icon: CloudIcon, label: "Cloudy", color: "#E3E8F0" };
  return { icon: CloudFogIcon, label: "Overcast", color: "#B9C2D0" };
}

/** "12 Nov", or "12 Nov 2024" with `withYear`; UTC, as the scene dates are. */
export function formatSceneDate(iso: string, withYear = false): string {
  return new Date(
    iso.length === 10 ? `${iso}T00:00:00Z` : iso
  ).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    ...(withYear ? { year: "numeric" } : {}),
    timeZone: "UTC",
  });
}

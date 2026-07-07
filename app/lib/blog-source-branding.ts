export type BlogSource = "wri" | "lcl" | "other";

export function inferBlogSource(url: string, source?: string): BlogSource {
  if (source === "lcl" || source === "wri") return source;
  if (/landcarbonlab\.org\/insights\//i.test(url)) return "lcl";
  if (/wri\.org/i.test(url)) return "wri";
  // Anything we don't recognise falls back to the neutral "other" treatment.
  return "other";
}

export function blogSourceBranding(source: BlogSource) {
  if (source === "lcl") {
    return {
      source: "lcl" as const,
      label: "Land & Carbon Lab",
      readOn: "landcarbonlab.org",
      favicon: "/LCL-logo.svg",
      useLclLogo: true,
      // Brand-tinted source pill. LCL now uses the primary (blue) palette —
      // primary.100 / primary.300 / primary.900 — matching the latest Figma.
      pillBg: "#D7DFF2",
      pillBorder: "#7898D7",
      pillText: "#0E1E3C",
    };
  }
  if (source === "other") {
    return {
      source: "other" as const,
      label: "Other source",
      readOn: "",
      favicon: "",
      useLclLogo: false,
      // Neutral fallback pill (neutral.200 / neutral.300 / neutral.600) for any
      // source that isn't WRI or LCL.
      pillBg: "#F4F5F7",
      pillBorder: "#E1E2E6",
      pillText: "#394048",
    };
  }
  return {
    source: "wri" as const,
    label: "WRI Insights",
    readOn: "wri.org",
    favicon: "/wri-favicon.ico",
    useLclLogo: false,
    // Source pill colors from the Figma "source-pill" component (WRI gold).
    pillBg: "#FFFBF2",
    pillBorder: "#FADFA7",
    pillText: "#855B00",
  };
}

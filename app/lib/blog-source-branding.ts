export type BlogSource = "wri" | "lcl";

export function inferBlogSource(url: string, source?: string): BlogSource {
  if (source === "lcl" || source === "wri") return source;
  if (/landcarbonlab\.org\/insights\//i.test(url)) return "lcl";
  return "wri";
}

export function blogSourceBranding(source: BlogSource) {
  if (source === "lcl") {
    return {
      source: "lcl" as const,
      label: "Land & Carbon Lab",
      readOn: "landcarbonlab.org",
      favicon: "/LCL-logo.svg",
      useLclLogo: true,
      // Brand-tinted source pill (green), mirroring the WRI gold treatment.
      pillBg: "#EDF7F1",
      pillBorder: "#B9E0CB",
      pillText: "#116A3E",
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

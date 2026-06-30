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
    };
  }
  return {
    source: "wri" as const,
    label: "WRI Insights",
    readOn: "wri.org",
    favicon: "/wri-favicon.ico",
    useLclLogo: false,
  };
}

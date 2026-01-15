"use client";

import { GoogleAnalytics } from "@next/third-parties/google";

export default function Analytics() {
  const gaId = process.env.NEXT_PUBLIC_GOOGLE_ANALYTICS_ID;
  if (!gaId) return null;
  return <GoogleAnalytics gaId={gaId} />;
}

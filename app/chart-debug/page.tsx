import { notFound } from "next/navigation";
import ChartDebugPanel from "./ChartDebugPanel";

export const metadata = { title: "Chart Debug", robots: "noindex, nofollow" };

export default function ChartDebugPage() {
  if (process.env.NEXT_PUBLIC_ENABLE_DEBUG_TOOLS !== "true") {
    notFound();
  }

  return <ChartDebugPanel />;
}

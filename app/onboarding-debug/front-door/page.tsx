import { notFound } from "@/app/lib/router";
import FrontDoorPreview from "./FrontDoorPreview";

export const metadata = {
  title: "Front Door Preview",
  robots: "noindex, nofollow",
};

// Debug-only click-through of the proposed front door (Welcome consent, then
// the first answer, then the profile card), built from the front-door slice
// with mock people. Offline: no API calls and nothing is saved.
export default function FrontDoorPreviewPage() {
  if (process.env.NEXT_PUBLIC_ENABLE_DEBUG_TOOLS !== "true") {
    notFound();
  }

  return <FrontDoorPreview />;
}

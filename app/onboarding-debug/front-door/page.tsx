import { notFound } from "@/app/lib/router";
import FrontDoorPreview from "./FrontDoorPreview";

export const metadata = {
  title: "Front Door Components",
  robots: "noindex, nofollow",
};

// Debug-only gallery of the front door's interactive components (terms,
// profile card, banner, account-menu reminder), each with the rules for when
// it appears. Offline: no API calls and nothing is saved.
export default function FrontDoorPreviewPage() {
  if (process.env.NEXT_PUBLIC_ENABLE_DEBUG_TOOLS !== "true") {
    notFound();
  }

  return <FrontDoorPreview />;
}

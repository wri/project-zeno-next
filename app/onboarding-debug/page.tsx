import { Suspense } from "react";
import { notFound } from "@/app/lib/router";
import OnboardingForm from "@/app/onboarding/form";
import { MOCK_PROFILE_CONFIG } from "./mock-profile-config";

export const metadata = {
  title: "Onboarding Debug",
  robots: "noindex, nofollow",
};

// Debug-only mirror of /onboarding that renders the real form with mock data
// and no API/auth — for visual review of the page, content, and form offline.
export default function OnboardingDebugPage() {
  if (process.env.NEXT_PUBLIC_ENABLE_DEBUG_TOOLS !== "true") {
    notFound();
  }

  return (
    <Suspense fallback={null}>
      <OnboardingForm previewConfig={MOCK_PROFILE_CONFIG} />
    </Suspense>
  );
}

import { Suspense } from "react";
import { notFound } from "next/navigation";
import OnboardingForm, { type ProfileConfig } from "@/app/onboarding/form";

export const metadata = {
  title: "Onboarding Debug",
  robots: "noindex, nofollow",
};

// Representative mock so every control renders populated without the API.
// Kept here (not fetched) so this page stays fully offline.
const MOCK_PROFILE_CONFIG: ProfileConfig = {
  sectors: {
    government: "Government",
    ngo: "NGO / Non-profit",
    academia: "Academia / Research",
    private: "Private sector",
    media: "Media",
  },
  sector_roles: {
    government: { analyst: "Analyst", policy_maker: "Policy maker" },
    ngo: { program_manager: "Program manager", field_officer: "Field officer" },
    academia: { researcher: "Researcher", student: "Student" },
    private: { consultant: "Consultant", executive: "Executive" },
    media: { journalist: "Journalist", editor: "Editor" },
  },
  countries: {
    BRA: "Brazil",
    COD: "Democratic Republic of the Congo",
    IDN: "Indonesia",
    KEN: "Kenya",
    GBR: "United Kingdom",
    USA: "United States",
  },
  languages: {
    en: "English",
    fr: "Français",
    es: "Español",
    pt: "Português",
    id: "Bahasa Indonesia",
  },
  gis_expertise_levels: {
    none: "No experience",
    basic: "Basic",
    intermediate: "Intermediate",
    advanced: "Advanced",
  },
  topics: {
    deforestation: "Deforestation",
    fires: "Fires",
    biodiversity: "Biodiversity",
    carbon: "Carbon emissions",
    water: "Water",
    restoration: "Restoration",
  },
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

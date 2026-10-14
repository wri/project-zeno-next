import type { ProfileConfig } from "@/app/schemas/api/profile/config";

// Representative mock so every control renders populated without the API.
// Kept here (not fetched) so the debug pages stay fully offline.
export const MOCK_PROFILE_CONFIG: ProfileConfig = {
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
  // The real labels (project-zeno user_profile_configs/topics.py): the long
  // ones are what tests the pills' wrapping.
  topics: {
    restoring_degraded_landscapes: "Restoring Degraded Landscapes",
    combating_deforestation: "Combating Deforestation",
    responsible_supply_chains: "Responsible Supply Chains",
    indigenous_land_rights:
      "Strengthening Indigenous Peoples & Local Communities Land Rights",
    agricultural_food_systems: "Improving Agricultural Land Use & Food Systems",
    protecting_ecosystems: "Protecting Natural Ecosystems",
  },
};

import type { ProfileSuggestion } from "@/src/features/front-door";

export type PersonaId = "new" | "gfw" | "gfw-thin";

export interface Persona {
  id: PersonaId;
  label: string;
  /** One line for the debug bar. */
  summary: string;
  /** The name Resource Watch returns for the account. */
  name: string;
  email: string;
  /** Where the person clicks in from. */
  entry: "gnw" | "gfw";
  /** The query string /app receives, including ?prompt=. */
  search: string;
  /** The MyGFW profile the backend would return, already mapped to GNW codes. */
  suggestion?: ProfileSuggestion;
  /** Stands in for the browser locale in the real app. */
  defaultCountry?: string;
}

const QUESTION = "How much tree cover has Pará lost since 2020?";

function query(params: Record<string, string>): string {
  return `?${new URLSearchParams(params).toString()}`;
}

const GFW_REFERRAL = {
  prompt: QUESTION,
  utm_source: "gfw",
  utm_medium: "referral",
  utm_campaign: "map-panel",
};

// Example people for the preview. Codes match MOCK_PROFILE_CONFIG.
export const PERSONAS: Record<PersonaId, Persona> = {
  new: {
    id: "new",
    label: "New person",
    summary: "Signed up with Google from the GNW landing page. No GFW profile.",
    name: "Amina Otieno",
    email: "amina@example.org",
    entry: "gnw",
    search: query({ prompt: QUESTION }),
    defaultCountry: "KEN",
  },
  gfw: {
    id: "gfw",
    label: "GFW user",
    summary: "Existing GFW account with a full MyGFW profile.",
    name: "Maria Silva",
    email: "maria@example.org",
    entry: "gfw",
    search: query(GFW_REFERRAL),
    suggestion: {
      source: "gfw",
      organisation: "State environment agency",
      sector: "government",
      role: "analyst",
      country: "BRA",
      language: "pt",
    },
  },
  "gfw-thin": {
    id: "gfw-thin",
    label: "GFW user, thin profile",
    summary:
      "Existing GFW account; GFW only required email, last name and sector.",
    name: "Tomás Rivera",
    email: "tomas@example.org",
    entry: "gfw",
    search: query(GFW_REFERRAL),
    suggestion: { source: "gfw", sector: "government" },
  },
};

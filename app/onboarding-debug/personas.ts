import type { ProfileSuggestion } from "@/src/features/front-door";

export type PersonaId = "new" | "gfw" | "gfw-thin";

export interface Persona {
  id: PersonaId;
  label: string;
  /** One line under the persona switch. */
  summary: string;
  /** The name Resource Watch returns for the account. */
  name: string;
  /** The MyGFW profile the backend would return, already mapped to GNW codes. */
  suggestion?: ProfileSuggestion;
  /** Stands in for the browser locale in the real app. */
  defaultCountry?: string;
}

export const QUESTION = "How much tree cover has Pará lost since 2020?";

// Example people for the preview. Codes match MOCK_PROFILE_CONFIG.
export const PERSONAS: Record<PersonaId, Persona> = {
  new: {
    id: "new",
    label: "New person",
    summary: "Signed up with Google from the GNW landing page. No GFW profile.",
    name: "Amina Otieno",
    defaultCountry: "KEN",
  },
  gfw: {
    id: "gfw",
    label: "GFW user",
    summary:
      "Existing GFW account with a full MyGFW profile: one-click confirmation.",
    name: "Maria Silva",
    suggestion: {
      company_organization: "Secretaria de Meio Ambiente do Pará",
      sector_code: "government",
      country_code: "BRA",
      preferred_language_code: "pt",
      topics: ["deforestation", "fires"],
    },
  },
  "gfw-thin": {
    id: "gfw-thin",
    label: "GFW user, thin profile",
    summary:
      "Existing GFW account; GFW only required email, last name and sector.",
    name: "Tomás Rivera",
    suggestion: { sector_code: "government" },
  },
};

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

/** A pasted brief, plus an unbroken URL, to stress the Welcome screen. */
export const LONG_QUESTION =
  "I'm preparing a report for our board on deforestation risk across our sourcing regions in Pará and Mato Grosso. " +
  "Can you compare tree cover loss from 2015 to 2024, break it down by year, flag any years with unusual spikes, " +
  "and show how much of the loss was primary forest? I'd also like to know whether the loss is concentrated inside " +
  "or outside protected areas and Indigenous lands, and which municipalities contributed most. If possible, compare " +
  "against the national trend for Brazil so we can tell whether our regions are better or worse than average. " +
  "Our supplier list is here: https://example.org/suppliers/2024/brazil/para-mato-grosso/soy-and-cattle-sourcing-regions-final-v3.csv";

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
      topics: ["combating_deforestation", "indigenous_land_rights"],
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

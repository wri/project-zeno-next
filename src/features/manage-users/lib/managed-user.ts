import type { UserModel, UserType } from "@/app/schemas/api/admin/users/get";

// Staff, consultants and the backend contractor. Subdomains count too.
const INTERNAL_EMAIL_DOMAINS = [
  "wri.org",
  "wriconsultant.org",
  "developmentseed.org",
];

export type Audience = "internal" | "external";

/** Where the person's account came from, read from their RW apps. */
export type SignupSource = "gfw" | "horizon" | "other" | "unknown";

/** How each source reads in the filter and in the Source column. */
export const SIGNUP_SOURCE_COPY: Record<
  SignupSource,
  { option: string; column: string | null }
> = {
  gfw: { option: "GFW account", column: "GFW" },
  horizon: { option: "Signed up in Horizon", column: "Horizon" },
  other: { option: "Other Resource Watch app", column: "Other" },
  unknown: { option: "Not recorded", column: null },
};

/** A user as the page shows, filters and sorts them. */
export interface ManagedUser {
  id: string;
  email: string;
  name: string | null;
  organization: string | null;
  countryCode: string | null;
  sectorCode: string | null;
  languageCode: string | null;
  hasProfile: boolean;
  userType: UserType;
  audience: Audience;
  /** The UTC day of the first GNW sign-in, `yyyy-MM-dd`. */
  joinedOn: string | null;
  signupSource: SignupSource;
  /** The user as the API sent it, for the CSV download. */
  wire: UserModel;
}

function audienceOf(email: string): Audience {
  const domain = email.slice(email.lastIndexOf("@") + 1).toLowerCase();
  const internal = INTERNAL_EMAIL_DOMAINS.some(
    (d) => domain === d || domain.endsWith(`.${d}`)
  );
  return internal ? "internal" : "external";
}

// A GFW account counts as GFW even when it also lists GNW.
function signupSourceOf(rwApps: readonly string[]): SignupSource {
  if (rwApps.includes("gfw")) return "gfw";
  if (rwApps.includes("gnw")) return "horizon";
  return rwApps.length > 0 ? "other" : "unknown";
}

export function toManagedUser(user: UserModel): ManagedUser {
  return {
    id: user.id,
    email: user.email,
    name: user.name ?? null,
    organization: user.companyOrganization ?? null,
    countryCode: user.countryCode ?? null,
    sectorCode: user.sectorCode ?? null,
    languageCode: user.preferredLanguageCode ?? null,
    hasProfile: user.hasProfile ?? false,
    userType: user.userType,
    audience: audienceOf(user.email),
    joinedOn: user.firstSeenAt
      ? new Date(user.firstSeenAt).toISOString().slice(0, 10)
      : null,
    signupSource: signupSourceOf(user.rwApps ?? []),
    wire: user,
  };
}

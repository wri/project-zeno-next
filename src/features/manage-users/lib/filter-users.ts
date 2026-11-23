import type { UserModel, UserType } from "@/app/schemas/api/admin/users/get";

// Staff, consultants and the backend contractor. Subdomains count too.
const INTERNAL_EMAIL_DOMAINS = [
  "wri.org",
  "wriconsultant.org",
  "developmentseed.org",
];

export type Audience = "internal" | "external";

export interface UserFilters {
  query: string;
  userType: UserType | "all";
  audience: Audience | "all";
}

export function audienceOf(email: string): Audience {
  const domain = email.slice(email.lastIndexOf("@") + 1).toLowerCase();
  const internal = INTERNAL_EMAIL_DOMAINS.some(
    (d) => domain === d || domain.endsWith(`.${d}`)
  );
  return internal ? "internal" : "external";
}

/** Matches the query against email and name, case-insensitively. */
export function filterUsers(
  users: readonly UserModel[],
  { query, userType, audience }: UserFilters
): UserModel[] {
  const needle = query.trim().toLowerCase();
  return users.filter(
    (u) =>
      (userType === "all" || u.userType === userType) &&
      (audience === "all" || audienceOf(u.email) === audience) &&
      (u.email.toLowerCase().includes(needle) ||
        (u.name ?? "").toLowerCase().includes(needle))
  );
}

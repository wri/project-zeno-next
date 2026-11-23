import type { UserType } from "@/app/schemas/api/admin/users/get";
import type { Audience, ManagedUser } from "./managed-user";

export interface UserFilters {
  query: string;
  userType: UserType | "all";
  audience: Audience | "all";
}

/** Matches the query against email and name, case-insensitively. */
export function filterUsers(
  users: readonly ManagedUser[],
  { query, userType, audience }: UserFilters
): ManagedUser[] {
  const needle = query.trim().toLowerCase();
  return users.filter(
    (u) =>
      (userType === "all" || u.userType === userType) &&
      (audience === "all" || u.audience === audience) &&
      (u.email.toLowerCase().includes(needle) ||
        (u.name ?? "").toLowerCase().includes(needle))
  );
}

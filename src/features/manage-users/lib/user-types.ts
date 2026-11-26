import type { UserType } from "@/app/schemas/api/admin/users/get";
import type { AssignableUserType } from "@/app/schemas/api/admin/users/patch";

/**
 * Every user type from least to most access, machine accounts last: the
 * order the filter lists them in and the Type column sorts by.
 */
export const USER_TYPES: readonly UserType[] = [
  "regular",
  "pro",
  "admin",
  "superuser",
  "machine",
];

/** The types a superuser can give someone, in the same order. */
export const ASSIGNABLE_USER_TYPES = USER_TYPES.filter(
  (t): t is AssignableUserType => t !== "machine"
);

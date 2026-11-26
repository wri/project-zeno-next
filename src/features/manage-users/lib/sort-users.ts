import type { ManagedUser } from "./managed-user";
import { USER_TYPES } from "./user-types";

export type SortKey = "email" | "joined" | "type";

export interface UserSort {
  key: SortKey;
  direction: "asc" | "desc";
}

export const DEFAULT_SORT: UserSort = { key: "joined", direction: "desc" };

type Compare = (a: ManagedUser, b: ManagedUser) => number;

const COMPARE: Record<SortKey, Compare> = {
  email: (a, b) => a.email.localeCompare(b.email),
  // ISO days sort as strings. sortUsers places a missing day before this.
  joined: (a, b) => (a.joinedOn ?? "").localeCompare(b.joinedOn ?? ""),
  type: (a, b) =>
    USER_TYPES.indexOf(a.userType) - USER_TYPES.indexOf(b.userType),
};

/** A sorted copy; ties keep their order. No join day sorts last either way. */
export function sortUsers(
  users: readonly ManagedUser[],
  { key, direction }: UserSort
): ManagedUser[] {
  const sign = direction === "asc" ? 1 : -1;
  return [...users].sort((a, b) => {
    if (key === "joined" && (a.joinedOn === null) !== (b.joinedOn === null)) {
      return a.joinedOn === null ? 1 : -1;
    }
    return sign * COMPARE[key](a, b);
  });
}

/** A header click: the same column flips, a new one starts newest or A to Z. */
export function nextSort(current: UserSort, key: SortKey): UserSort {
  if (current.key === key) {
    return { key, direction: current.direction === "asc" ? "desc" : "asc" };
  }
  return { key, direction: key === "joined" ? "desc" : "asc" };
}

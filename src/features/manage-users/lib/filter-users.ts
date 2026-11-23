import type { UserType } from "@/app/schemas/api/admin/users/get";
import { toSentenceCase } from "@/app/utils/formatText";
import {
  SIGNUP_SOURCE_COPY,
  type Audience,
  type ManagedUser,
  type SignupSource,
} from "./managed-user";
import { USER_TYPES } from "./user-types";

type ProfileState = "completed" | "not-completed";

/** Every filter is off at its empty value: "", [] or null. */
export interface UserFilters {
  query: string;
  /** Any of these types; empty means every type. */
  userTypes: UserType[];
  audience: Audience | null;
  country: string | null;
  sector: string | null;
  profile: ProfileState | null;
  /** Inclusive `yyyy-MM-dd` bounds on the join day. */
  joinedFrom: string | null;
  joinedTo: string | null;
  signupSource: SignupSource | null;
}

export const NO_FILTERS: UserFilters = {
  query: "",
  userTypes: [],
  audience: null,
  country: null,
  sector: null,
  profile: null,
  joinedFrom: null,
  joinedTo: null,
  signupSource: null,
};

export interface Option<T extends string = string> {
  value: T;
  label: string;
}

export const USER_TYPE_OPTIONS: Option<UserType>[] = USER_TYPES.map((t) => ({
  value: t,
  label: toSentenceCase(t),
}));

export const AUDIENCE_OPTIONS: Option<Audience>[] = [
  { value: "internal", label: "Internal" },
  { value: "external", label: "External" },
];

export const PROFILE_OPTIONS: Option<ProfileState>[] = [
  { value: "completed", label: "Completed" },
  { value: "not-completed", label: "Not completed" },
];

export const SIGNUP_SOURCE_OPTIONS: Option<SignupSource>[] = (
  Object.keys(SIGNUP_SOURCE_COPY) as SignupSource[]
).map((s) => ({ value: s, label: SIGNUP_SOURCE_COPY[s].option }));

/** A profile code's label, or the code itself when the config lacks it. */
export const codeLabel = (
  labels: Record<string, string> | undefined,
  code: string
) => labels?.[code] ?? code;

/** One option per code the users have, sorted by label. */
export function codeOptions(
  codes: readonly (string | null)[],
  labels: Record<string, string> | undefined
): Option[] {
  return [...new Set(codes)]
    .filter((code) => code !== null)
    .map((code) => ({ value: code, label: codeLabel(labels, code) }))
    .sort((a, b) => a.label.localeCompare(b.label));
}

export const hasFilters = (filters: UserFilters) =>
  Object.values(filters).some((v) =>
    Array.isArray(v)
      ? v.length > 0
      : typeof v === "string"
        ? v.trim() !== ""
        : v !== null
  );

/**
 * Search matches email, name or organization, case-insensitively. A join
 * date bound leaves out users with no join date.
 */
export function filterUsers(
  users: readonly ManagedUser[],
  f: UserFilters
): ManagedUser[] {
  const needle = f.query.trim().toLowerCase();
  const byJoinDate = f.joinedFrom !== null || f.joinedTo !== null;
  return users.filter(
    (u) =>
      (f.userTypes.length === 0 || f.userTypes.includes(u.userType)) &&
      (f.audience === null || u.audience === f.audience) &&
      (f.country === null || u.countryCode === f.country) &&
      (f.sector === null || u.sectorCode === f.sector) &&
      (f.profile === null || u.hasProfile === (f.profile === "completed")) &&
      (f.signupSource === null || u.signupSource === f.signupSource) &&
      (!byJoinDate ||
        (u.joinedOn !== null &&
          (f.joinedFrom === null || u.joinedOn >= f.joinedFrom) &&
          (f.joinedTo === null || u.joinedOn <= f.joinedTo))) &&
      [u.email, u.name, u.organization].some((s) =>
        s?.toLowerCase().includes(needle)
      )
  );
}

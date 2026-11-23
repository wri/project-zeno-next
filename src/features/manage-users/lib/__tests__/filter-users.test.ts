import { describe, expect, it } from "vitest";
import type { UserModel } from "@/app/schemas/api/admin/users/get";
import {
  NO_FILTERS,
  codeOptions,
  filterUsers,
  hasFilters,
  type UserFilters,
} from "../filter-users";
import { toManagedUser } from "../managed-user";

const user = (id: string, overrides: Partial<UserModel>) =>
  toManagedUser({
    id,
    email: `${id}@example.org`,
    userType: "regular",
    ...overrides,
  });

const users = [
  user("1", {
    email: "ana@wri.org",
    userType: "superuser",
    name: "Ana Lima",
    companyOrganization: "World Resources Institute",
    countryCode: "BRA",
    sectorCode: "ngo",
    hasProfile: true,
    firstSeenAt: "2026-03-01T09:00:00Z",
    rwApps: ["gfw"],
  }),
  user("2", {
    email: "bo@gmail.com",
    name: "Bo Chen",
    countryCode: "IDN",
    sectorCode: "gov",
    hasProfile: false,
    firstSeenAt: "2026-06-15T09:00:00Z",
    rwApps: ["gnw"],
  }),
  user("3", {
    email: "cy@developmentseed.org",
    userType: "admin",
    countryCode: "BRA",
    firstSeenAt: "2026-06-30T23:59:00Z",
    rwApps: ["rw"],
  }),
  user("4", {
    email: "di@example.org",
    userType: "pro",
    name: "Di Wri",
    companyOrganization: "Forest Monitoring Network",
  }),
  user("5", { email: "eval-bot@example.org", userType: "machine" }),
];

describe("filterUsers", () => {
  const ids = (filters: Partial<UserFilters>) =>
    filterUsers(users, { ...NO_FILTERS, ...filters }).map((u) => u.id);

  it.each<[string, Partial<UserFilters>, string[]]>([
    ["no filters keeps every user in order", {}, ["1", "2", "3", "4", "5"]],
    ["one user type", { userTypes: ["admin"] }, ["3"]],
    [
      "any of several user types",
      { userTypes: ["pro", "machine"] },
      ["4", "5"],
    ],
    ["internal", { audience: "internal" }, ["1", "3"]],
    ["external", { audience: "external" }, ["2", "4", "5"]],
    ["country", { country: "BRA" }, ["1", "3"]],
    ["sector", { sector: "gov" }, ["2"]],
    ["profile completed", { profile: "completed" }, ["1"]],
    [
      "profile not completed",
      { profile: "not-completed" },
      ["2", "3", "4", "5"],
    ],
    ["signup source", { signupSource: "horizon" }, ["2"]],
    ["signup source not recorded", { signupSource: "unknown" }, ["4", "5"]],
    ["joined from, inclusive", { joinedFrom: "2026-06-15" }, ["2", "3"]],
    ["joined to, inclusive", { joinedTo: "2026-06-15" }, ["1", "2"]],
    [
      "joined between",
      { joinedFrom: "2026-06-01", joinedTo: "2026-06-29" },
      ["2"],
    ],
    ["query on email, any case", { query: "  GMAIL " }, ["2"]],
    ["query on name", { query: "chen" }, ["2"]],
    ["query on organization", { query: "monitoring" }, ["4"]],
    ["query matches email, name or organization", { query: "wri" }, ["1", "4"]],
    ["filters together", { query: "wri", audience: "external" }, ["4"]],
    ["no match", { userTypes: ["pro"], audience: "internal" }, []],
  ])("%s", (_, filters, expected) => {
    expect(ids(filters)).toEqual(expected);
  });
});

describe("hasFilters", () => {
  it.each<[Partial<UserFilters>, boolean]>([
    [{}, false],
    [{ query: "   " }, false],
    [{ query: "ana" }, true],
    [{ userTypes: ["pro"] }, true],
    [{ audience: "internal" }, true],
    [{ country: "BRA" }, true],
    [{ profile: "not-completed" }, true],
    [{ joinedTo: "2026-01-01" }, true],
    [{ signupSource: "unknown" }, true],
  ])("%j is %s", (filters, expected) => {
    expect(hasFilters({ ...NO_FILTERS, ...filters })).toBe(expected);
  });
});

describe("codeOptions", () => {
  it("lists each code once, labelled and sorted by label", () => {
    expect(
      codeOptions(["IDN", null, "BRA", "XYZ", "IDN"], {
        BRA: "Brazil",
        IDN: "Indonesia",
      })
    ).toEqual([
      { value: "BRA", label: "Brazil" },
      { value: "IDN", label: "Indonesia" },
      { value: "XYZ", label: "XYZ" },
    ]);
  });

  it("labels with the codes until the labels load", () => {
    expect(codeOptions(["gov", "ngo"], undefined)).toEqual([
      { value: "gov", label: "gov" },
      { value: "ngo", label: "ngo" },
    ]);
  });
});

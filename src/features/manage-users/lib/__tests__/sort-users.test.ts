import { describe, expect, it } from "vitest";
import type { UserModel } from "@/app/schemas/api/admin/users/get";
import { toManagedUser } from "../managed-user";
import { nextSort, sortUsers, type UserSort } from "../sort-users";

const user = (
  id: string,
  email: string,
  userType: UserModel["userType"],
  firstSeenAt: string | null
) => toManagedUser({ id, email, userType, firstSeenAt });

// In API order, newest account first.
const users = [
  user("1", "cy@example.org", "admin", "2026-03-01T09:00:00Z"),
  user("2", "ana@example.org", "regular", null),
  user("3", "bo@example.org", "superuser", "2026-06-15T09:00:00Z"),
  user("4", "di@example.org", "regular", "2026-01-10T09:00:00Z"),
  user("5", "eva@example.org", "machine", null),
  user("6", "fe@example.org", "pro", "2026-06-15T18:00:00Z"),
];

describe("sortUsers", () => {
  it.each<[UserSort, string[]]>([
    [{ key: "joined", direction: "desc" }, ["3", "6", "1", "4", "2", "5"]],
    [{ key: "joined", direction: "asc" }, ["4", "1", "3", "6", "2", "5"]],
    [{ key: "email", direction: "asc" }, ["2", "3", "1", "4", "5", "6"]],
    [{ key: "email", direction: "desc" }, ["6", "5", "4", "1", "3", "2"]],
    [{ key: "type", direction: "asc" }, ["2", "4", "6", "1", "3", "5"]],
    [{ key: "type", direction: "desc" }, ["5", "3", "1", "6", "2", "4"]],
  ])("%j", (sort, expected) => {
    expect(sortUsers(users, sort).map((u) => u.id)).toEqual(expected);
  });

  it("leaves its input in place", () => {
    sortUsers(users, { key: "email", direction: "asc" });
    expect(users.map((u) => u.id)).toEqual(["1", "2", "3", "4", "5", "6"]);
  });
});

describe("nextSort", () => {
  it.each<[UserSort, UserSort["key"], UserSort]>([
    [
      { key: "joined", direction: "desc" },
      "joined",
      { key: "joined", direction: "asc" },
    ],
    [
      { key: "email", direction: "asc" },
      "email",
      { key: "email", direction: "desc" },
    ],
    [
      { key: "joined", direction: "desc" },
      "email",
      { key: "email", direction: "asc" },
    ],
    [
      { key: "email", direction: "desc" },
      "type",
      { key: "type", direction: "asc" },
    ],
    [
      { key: "type", direction: "asc" },
      "joined",
      { key: "joined", direction: "desc" },
    ],
  ])("from %j, a click on %s gives %j", (current, key, expected) => {
    expect(nextSort(current, key)).toEqual(expected);
  });
});

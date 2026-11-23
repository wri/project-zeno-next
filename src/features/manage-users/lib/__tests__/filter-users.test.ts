import { describe, expect, it } from "vitest";
import type { UserModel } from "@/app/schemas/api/admin/users/get";
import { filterUsers, type UserFilters } from "../filter-users";
import { toManagedUser } from "../managed-user";

describe("filterUsers", () => {
  const user = (
    id: string,
    email: string,
    userType: UserModel["userType"],
    name: string | null = null
  ) => toManagedUser({ id, email, userType, name });

  const users = [
    user("1", "ana@wri.org", "superuser", "Ana Lima"),
    user("2", "bo@gmail.com", "regular", "Bo Chen"),
    user("3", "cy@developmentseed.org", "admin"),
    user("4", "di@example.org", "pro", "Di Wri"),
    user("5", "eval-bot@example.org", "machine"),
  ];

  const all: UserFilters = { query: "", userType: "all", audience: "all" };
  const ids = (filters: Partial<UserFilters>) =>
    filterUsers(users, { ...all, ...filters }).map((u) => u.id);

  it.each<[string, Partial<UserFilters>, string[]]>([
    ["no filters keeps every user in order", {}, ["1", "2", "3", "4", "5"]],
    ["user type", { userType: "admin" }, ["3"]],
    ["internal", { audience: "internal" }, ["1", "3"]],
    ["external", { audience: "external" }, ["2", "4", "5"]],
    ["query on email, any case", { query: "  GMAIL " }, ["2"]],
    ["query on name", { query: "chen" }, ["2"]],
    ["query matches email or name", { query: "wri" }, ["1", "4"]],
    ["all filters together", { query: "wri", audience: "external" }, ["4"]],
    ["no match", { userType: "pro", audience: "internal" }, []],
  ])("%s", (_, filters, expected) => {
    expect(ids(filters)).toEqual(expected);
  });
});

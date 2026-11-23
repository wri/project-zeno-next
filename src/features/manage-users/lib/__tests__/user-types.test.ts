import { describe, expect, it } from "vitest";
import { UserTypeEnum } from "@/app/schemas/api/admin/users/get";
import { AssignableUserTypeEnum } from "@/app/schemas/api/admin/users/patch";
import { ASSIGNABLE_USER_TYPES, USER_TYPES } from "../user-types";

describe("USER_TYPES", () => {
  it("lists every user type once", () => {
    expect([...USER_TYPES].sort()).toEqual([...UserTypeEnum.options].sort());
  });

  it("offers every assignable type once", () => {
    expect([...ASSIGNABLE_USER_TYPES].sort()).toEqual(
      [...AssignableUserTypeEnum.options].sort()
    );
  });
});

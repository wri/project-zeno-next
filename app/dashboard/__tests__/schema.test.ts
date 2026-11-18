import { describe, expect, it } from "vitest";
import {
  REQUIRED_PROFILE_FIELDS,
  isProfileFieldRequired,
} from "@/app/config/profile-fields";
import { getSettingsFormSchema } from "@/app/dashboard/schema";

/** A profile that satisfies every required field. Settings has no terms checkbox. */
const completeForm = {
  firstName: "Ada",
  lastName: "Lovelace",
  email: "ada@example.org",
  sector: "ngo",
  role: "program_manager",
  jobTitle: "",
  company: "World Resources Institute",
  country: "GBR",
  expertise: "",
  preferredLanguage: "",
  topics: [] as string[],
  receiveNewsEmails: false,
  helpTestFeatures: false,
};

describe("settings schema", () => {
  it("accepts a profile with every optional field left blank", () => {
    expect(getSettingsFormSchema().safeParse(completeForm).success).toBe(true);
  });

  it.each(REQUIRED_PROFILE_FIELDS)("rejects a blank %s", (field) => {
    expect(
      getSettingsFormSchema().safeParse({ ...completeForm, [field]: "" })
        .success
    ).toBe(false);
  });

  it.each(["jobTitle", "expertise", "preferredLanguage"] as const)(
    "treats %s as optional",
    (field) => {
      expect(isProfileFieldRequired(field)).toBe(false);
      expect(
        getSettingsFormSchema().safeParse({ ...completeForm, [field]: "" })
          .success
      ).toBe(true);
    }
  );

  it("treats topics as optional", () => {
    expect(isProfileFieldRequired("topics")).toBe(false);
  });

  it("does not ask for terms acceptance (that's /welcome)", () => {
    expect("termsAccepted" in getSettingsFormSchema().shape).toBe(false);
    expect(
      getSettingsFormSchema().safeParse({
        ...completeForm,
        termsAccepted: false,
      }).success
    ).toBe(true);
  });
});

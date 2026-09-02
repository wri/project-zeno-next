import { describe, expect, it } from "vitest";
import { REQUIRED_ONBOARDING_FIELDS } from "@/app/config/onboarding";
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

  it.each(REQUIRED_ONBOARDING_FIELDS.filter((f) => f !== "termsAccepted"))(
    "rejects a blank %s, matching the onboarding contract",
    (field) => {
      expect(
        getSettingsFormSchema().safeParse({ ...completeForm, [field]: "" })
          .success
      ).toBe(false);
    }
  );

  it("does not ask for terms acceptance again", () => {
    expect("termsAccepted" in getSettingsFormSchema().shape).toBe(false);
    expect(
      getSettingsFormSchema().safeParse({
        ...completeForm,
        termsAccepted: false,
      }).success
    ).toBe(true);
  });
});

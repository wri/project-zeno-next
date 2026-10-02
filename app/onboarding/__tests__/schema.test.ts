import { describe, expect, it } from "vitest";
import {
  REQUIRED_ONBOARDING_FIELDS,
  isOnboardingFieldRequired,
  type OnboardingFieldKey,
} from "@/app/config/onboarding";
import { getOnboardingFormSchema } from "@/app/onboarding/schema";

/** A submission that satisfies every required field. */
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
  termsAccepted: true,
};

const OPTIONAL_TEXT_FIELDS = [
  "jobTitle",
  "expertise",
  "preferredLanguage",
] as const satisfies readonly OnboardingFieldKey[];

describe("onboarding schema", () => {
  it("accepts a form with every optional field left blank", () => {
    expect(getOnboardingFormSchema().safeParse(completeForm).success).toBe(
      true
    );
  });

  it.each(OPTIONAL_TEXT_FIELDS)("treats %s as optional", (field) => {
    expect(isOnboardingFieldRequired(field)).toBe(false);
    const parsed = getOnboardingFormSchema().safeParse({
      ...completeForm,
      [field]: "",
    });
    expect(parsed.success).toBe(true);
  });

  it("treats topics as optional when it is not in the required list", () => {
    expect(isOnboardingFieldRequired("topics")).toBe(false);
    expect(
      getOnboardingFormSchema().safeParse({ ...completeForm, topics: [] })
        .success
    ).toBe(true);
  });

  it.each(REQUIRED_ONBOARDING_FIELDS.filter((f) => f !== "termsAccepted"))(
    "rejects a blank %s",
    (field) => {
      const parsed = getOnboardingFormSchema().safeParse({
        ...completeForm,
        [field]: "",
      });
      expect(parsed.success).toBe(false);
    }
  );

  it("rejects unaccepted terms while they are required", () => {
    expect(isOnboardingFieldRequired("termsAccepted")).toBe(true);
    expect(
      getOnboardingFormSchema().safeParse({
        ...completeForm,
        termsAccepted: false,
      }).success
    ).toBe(false);
  });
});

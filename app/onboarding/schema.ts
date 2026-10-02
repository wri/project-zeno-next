import z from "zod";
import {
  isOnboardingFieldRequired,
  type OnboardingFieldKey,
} from "@/app/config/onboarding";

const optionalString = () =>
  z.preprocess(
    (v) => (typeof v === "string" && v.trim().length === 0 ? undefined : v),
    z.string().optional()
  );

const requiredString = () => z.string().trim().min(1);

const optionalStringArray = () =>
  z.preprocess(
    (v) => (Array.isArray(v) && v.length === 0 ? undefined : v),
    z.array(z.string()).optional()
  );

const requiredStringArray = () => z.array(z.string()).min(1);

export const getOnboardingFormSchema = () => {
  const str = (key: OnboardingFieldKey) =>
    isOnboardingFieldRequired(key) ? requiredString() : optionalString();

  return z.object({
    firstName: str("firstName"),
    lastName: str("lastName"),
    email: str("email"),
    sector: str("sector"),
    role: str("role"),
    jobTitle: str("jobTitle"),
    company: str("company"),
    country: str("country"),
    expertise: str("expertise"),
    preferredLanguage: str("preferredLanguage"),
    topics: isOnboardingFieldRequired("topics")
      ? requiredStringArray()
      : optionalStringArray(),
    receiveNewsEmails: z.boolean().optional(),
    helpTestFeatures: z.boolean().optional(),
    termsAccepted: isOnboardingFieldRequired("termsAccepted")
      ? z.literal(true)
      : z.boolean().optional(),
  });
};

export type OnboardingFormSchema = ReturnType<typeof getOnboardingFormSchema>;

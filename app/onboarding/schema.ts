import z from "zod";
import {
  getOnboardingRequiredFields,
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
  const req = getOnboardingRequiredFields();

  const str = (key: OnboardingFieldKey) =>
    req.has(key) ? requiredString() : optionalString();

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
    topics: req.has("topics") ? requiredStringArray() : optionalStringArray(),
    receiveNewsEmails: z.boolean().optional(),
    helpTestFeatures: z.boolean().optional(),
    termsAccepted: req.has("termsAccepted")
      ? z.literal(true)
      : z.boolean().optional(),
  });
};

export type OnboardingFormSchema = ReturnType<typeof getOnboardingFormSchema>;

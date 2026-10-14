import z from "zod";
import {
  isProfileFieldRequired,
  type ProfileFieldKey,
} from "@/app/config/profile-fields";

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

/**
 * Validation for the profile form (User Profile, /dashboard), driven by
 * `REQUIRED_PROFILE_FIELDS`. Terms are accepted on /welcome, not here.
 */
export const getSettingsFormSchema = () => {
  const str = (key: ProfileFieldKey) =>
    isProfileFieldRequired(key) ? requiredString() : optionalString();

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
    topics: isProfileFieldRequired("topics")
      ? requiredStringArray()
      : optionalStringArray(),
    receiveNewsEmails: z.boolean().optional(),
    helpTestFeatures: z.boolean().optional(),
  });
};

export type SettingsFormSchema = ReturnType<typeof getSettingsFormSchema>;

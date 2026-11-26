import { z } from "zod";

export const UserTypeEnum = z.enum([
  "regular",
  "admin",
  "pro",
  "superuser",
  "machine",
]);
export type UserType = z.infer<typeof UserTypeEnum>;

export const UserModelSchema = z
  .object({
    id: z.string(),
    email: z.string(),
    name: z.string().nullable().optional(),
    userType: UserTypeEnum,
    firstName: z.string().nullish(),
    lastName: z.string().nullish(),
    profileDescription: z.string().nullish(),
    sectorCode: z.string().nullish(),
    roleCode: z.string().nullish(),
    jobTitle: z.string().nullish(),
    companyOrganization: z.string().nullish(),
    countryCode: z.string().nullish(),
    preferredLanguageCode: z.string().nullish(),
    gisExpertiseLevel: z.string().nullish(),
    areasOfInterest: z.string().nullish(),
    hasProfile: z.boolean().optional(),
    topics: z.array(z.string()).nullish(),
    receiveNewsEmails: z.boolean().nullish(),
    helpTestFeatures: z.boolean().nullish(),
    termsAcceptedAt: z.string().nullish(),
    termsVersion: z.string().nullish(),
    // First GNW sign-in, and the apps the Resource Watch account had then.
    firstSeenAt: z.iso.datetime({ offset: true }).nullish(),
    rwApps: z.array(z.string()).nullish(),
    createdAt: z.string().optional(),
    updatedAt: z.string().optional(),
  })
  .passthrough();
export type UserModel = z.infer<typeof UserModelSchema>;

export const ListUsersResponseSchema = z.array(UserModelSchema);
export type ListUsersResponse = z.infer<typeof ListUsersResponseSchema>;

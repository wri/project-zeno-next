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
    companyOrganization: z.string().nullish(),
    countryCode: z.string().nullish(),
    sectorCode: z.string().nullish(),
    preferredLanguageCode: z.string().nullish(),
    hasProfile: z.boolean().optional(),
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

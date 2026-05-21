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
    hasProfile: z.boolean().optional(),
    createdAt: z.string().optional(),
    updatedAt: z.string().optional(),
  })
  .passthrough();
export type UserModel = z.infer<typeof UserModelSchema>;

export const ListUsersResponseSchema = z.array(UserModelSchema);
export type ListUsersResponse = z.infer<typeof ListUsersResponseSchema>;

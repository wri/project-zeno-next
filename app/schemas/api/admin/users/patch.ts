import { z } from "zod";

export const AssignableUserTypeEnum = z.enum([
  "regular",
  "admin",
  "pro",
  "superuser",
]);
export type AssignableUserType = z.infer<typeof AssignableUserTypeEnum>;

export const PatchUserTypeRequestSchema = z.object({
  user_type: AssignableUserTypeEnum,
});
export type PatchUserTypeRequest = z.infer<typeof PatchUserTypeRequestSchema>;

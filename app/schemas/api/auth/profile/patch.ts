import z from "zod";

export const PatchProfileRequestSchema = z.object({
  first_name: z.string().min(1),
  last_name: z.string().min(1),
  profile_description: z.string().optional().nullable(),
  sector_code: z.string().optional().nullable(),
  role_code: z.string().optional().nullable(),
  job_title: z.string().optional().nullable(),
  company_organization: z.string().optional().nullable(),
  country_code: z.string().optional().nullable(),
  preferred_language_code: z.string().optional().nullable(),
  gis_expertise_level: z.string().optional().nullable(),
  areas_of_interest: z.string().optional().nullable(),
  has_profile: z.boolean(),
});

export type PatchProfileRequest = z.infer<typeof PatchProfileRequestSchema>;

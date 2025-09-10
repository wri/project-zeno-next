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
  topics: z.array(z.string()).optional(),
  receive_news_emails: z.boolean().optional(),
  help_test_features: z.boolean().optional(),
  has_profile: z.boolean(),
});

export type PatchProfileRequest = z.infer<typeof PatchProfileRequestSchema>;

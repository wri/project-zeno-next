import { z } from "zod";

const Labels = z.record(z.string(), z.string());

/**
 * GET /api/profile/config (public): the profile form's option lists, each a
 * map of code → label. Used by the onboarding form, the settings page and
 * the front door's profile card.
 */
export const ProfileConfigSchema = z.object({
  sectors: Labels,
  sector_roles: z.record(z.string(), Labels),
  countries: Labels,
  languages: Labels,
  gis_expertise_levels: Labels,
  topics: Labels.optional(),
});

export type ProfileConfig = z.infer<typeof ProfileConfigSchema>;

import { z } from "zod";

/** An area in the user's library: a custom area they own or a source area they saved. */
export const UserAoiSchema = z.object({
  /** The library entry's id, used to rename or remove it. */
  id: z.string(),
  relationship: z.enum(["owner", "saved"]),
  /** The user's label for the area, else its own name. */
  name: z.string(),
  source: z.string(),
  // The API returns KBA ids as numbers; the map addresses every area by string.
  src_id: z.union([z.string(), z.number()]).transform(String),
  subtype: z.string(),
  bbox: z.tuple([z.number(), z.number(), z.number(), z.number()]).nullable(),
  created_at: z.string(),
});

export const UserAoiListSchema = z.array(UserAoiSchema);

export type UserAoi = z.infer<typeof UserAoiSchema>;

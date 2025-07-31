import { z } from "zod";

export const CreateCustomAreaRequestSchema = z.object({
  name: z.string(),
  geometry: z.object({
    type: z.string(),
    coordinates: z.array(z.array(z.array(z.number()))),
  }),
});

export const CreateCustomAreaResponseSchema = z.object({
  id: z.string(),
  name: z.string(),
  geometry: z.object({
    type: z.string(),
    coordinates: z.array(z.array(z.array(z.number()))),
  }),
  created_at: z.string(),
  updated_at: z.string(),
});

export type CreateCustomAreaRequest = z.infer<
  typeof CreateCustomAreaRequestSchema
>;
export type CreateCustomAreaResponse = z.infer<
  typeof CreateCustomAreaResponseSchema
>;

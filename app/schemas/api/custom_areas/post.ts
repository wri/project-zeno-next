import z from "zod";
import type { Polygon } from "geojson";

export const CreateCustomAreaRequestSchema = z.object({
  name: z.string(),
  geometries: z.array(z.custom<Polygon>()),
});

export const CreateCustomAreaResponseSchema = z.object({
  id: z.string(),
  name: z.string(),
  geometries: z.array(z.custom<Polygon>()),
  created_at: z.string(),
  updated_at: z.string(),
});

export type CreateCustomAreaRequest = z.infer<
  typeof CreateCustomAreaRequestSchema
>;
export type CreateCustomAreaResponse = z.infer<
  typeof CreateCustomAreaResponseSchema
>;

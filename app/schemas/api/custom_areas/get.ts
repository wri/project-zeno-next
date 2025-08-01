import { z } from "zod";
import type { Polygon } from "geojson";

export const CustomAreaSchema = z.object({
  id: z.string(),
  user_id: z.string(),
  name: z.string(),
  geometries: z.array(z.custom<Polygon>()),
  created_at: z.string(),
  updated_at: z.string(),
});

export const ListCustomAreasResponseSchema = z.array(CustomAreaSchema);

export type CustomArea = z.infer<typeof CustomAreaSchema>;
export type ListCustomAreasResponse = z.infer<
  typeof ListCustomAreasResponseSchema
>;

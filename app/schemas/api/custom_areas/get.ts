import { z } from "zod";
import type { MultiPolygon, Polygon } from "geojson";

export const CustomAreaSchema = z.object({
  id: z.string(),
  user_id: z.string(),
  name: z.string(),
  // Drawn areas store Polygons; uploaded areas can also store MultiPolygons.
  geometries: z.array(z.custom<Polygon | MultiPolygon>()),
  created_at: z.string(),
  updated_at: z.string(),
});

export type CustomArea = z.infer<typeof CustomAreaSchema>;

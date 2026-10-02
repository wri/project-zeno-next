import { z } from "zod";
import type { DivergentColors } from "@/app/types/chartColors";

export const DatasetPaletteCategorySchema = z.object({
  slug: z.string(),
  label_en: z.string(),
  color: z.string(),
});

// `satisfies` keeps this schema pinned to the shared DivergentColors shape:
// the two must not drift, since chart and legend colors are the same registry.
export const DatasetDivergentColorsSchema = z.object({
  positive: z.string(),
  negative: z.string(),
}) satisfies z.ZodType<DivergentColors>;

export const DatasetPaletteSchema = z.object({
  dataset_id: z.number(),
  dataset_name: z.string(),
  categories: z.array(DatasetPaletteCategorySchema),
  series_color: z.string().nullable(),
  divergent_colors: DatasetDivergentColorsSchema.nullable(),
  /**
   * False for datasets whose map legend intentionally curates/collapses
   * categories that are less relevant at a glance (e.g. SBTN Natural Lands
   * groups all non-natural classes into one legend row). Chart colors still
   * cover every category regardless — this only controls whether a legend
   * should be expanded to the full category list.
   */
  legend_categories: z.boolean(),
});

export const DatasetCatalogResponseSchema = z.object({
  datasets: z.array(DatasetPaletteSchema),
});

export type DatasetPaletteCategory = z.infer<
  typeof DatasetPaletteCategorySchema
>;
export type DatasetPalette = z.infer<typeof DatasetPaletteSchema>;
export type DatasetCatalogResponse = z.infer<
  typeof DatasetCatalogResponseSchema
>;

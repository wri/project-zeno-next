import { z } from "zod";

export const DatasetPaletteCategorySchema = z.object({
  slug: z.string(),
  label_en: z.string(),
  color: z.string(),
});

export const DatasetDivergentColorsSchema = z.object({
  positive: z.string(),
  negative: z.string(),
});

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
export type DatasetDivergentColors = z.infer<
  typeof DatasetDivergentColorsSchema
>;
export type DatasetPalette = z.infer<typeof DatasetPaletteSchema>;
export type DatasetCatalogResponse = z.infer<
  typeof DatasetCatalogResponseSchema
>;

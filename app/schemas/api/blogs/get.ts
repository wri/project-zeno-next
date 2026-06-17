import { z } from "zod";

const BlogArticleFieldsSchema = z.object({
  slug: z.string(),
  title: z.string(),
  abstract: z.string().optional().default(""),
  summary: z.string().optional(),
  url: z.string(),
  lastmod: z.string().optional().default(""),
  image: z.string().optional().default(""),
  image_alt: z.string().optional().default(""),
});

export const BlogArticleSchema = BlogArticleFieldsSchema.transform((data) => ({
  slug: data.slug,
  title: data.title,
  abstract: data.abstract || data.summary || "",
  url: data.url,
  lastmod: data.lastmod,
  image: data.image,
  image_alt: data.image_alt,
}));

export type BlogArticle = z.infer<typeof BlogArticleSchema>;

/** Normalize a single cited-articles entry from the agent stream. */
export function normalizeCitedArticle(raw: unknown): BlogArticle | null {
  const parsed = BlogArticleSchema.safeParse(raw);
  return parsed.success ? parsed.data : null;
}

/** Normalize and filter cited-articles batches from stream state updates. */
export function normalizeCitedArticles(raw: unknown[]): BlogArticle[] {
  return raw
    .map((item) => normalizeCitedArticle(item))
    .filter((item): item is BlogArticle => item !== null);
}

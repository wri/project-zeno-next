import { z } from "zod";

export const BlogArticleSchema = z.object({
  slug: z.string(),
  title: z.string(),
  abstract: z.string(),
  url: z.string(),
  lastmod: z.string(),
  image: z.string().optional().default(""),
  image_alt: z.string().optional().default(""),
});

export const BlogMetadataResponseSchema = z.object({
  articles: z.record(z.string(), BlogArticleSchema),
});

export type BlogArticle = z.infer<typeof BlogArticleSchema>;
export type BlogMetadataResponse = z.infer<typeof BlogMetadataResponseSchema>;

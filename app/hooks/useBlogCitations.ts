"use client";
import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "@/app/lib/api-client";
import { extractCitationUrls } from "@/app/lib/blog-citations";
import {
  BlogMetadataResponseSchema,
  type BlogArticle,
} from "@/app/schemas/api/blogs/get";

export type BlogCitationMap = Record<string, BlogArticle>;

const EMPTY: BlogCitationMap = {};

async function fetchBlogMetadata(urls: string[]): Promise<BlogCitationMap> {
  const params = new URLSearchParams();
  for (const url of urls) {
    params.append("url", url);
  }
  const res = await apiFetch(`/api/blogs/metadata?${params.toString()}`);
  if (!res.ok) {
    throw new Error(`Blog metadata request failed: ${res.statusText}`);
  }
  const data = await res.json();
  return BlogMetadataResponseSchema.parse(data).articles;
}

/**
 * Fetch card metadata for every WRI Insights citation in a markdown
 * message, batched into a single request and cached per URL set.
 */
export function useBlogCitations(markdown: string) {
  const urls = useMemo(() => extractCitationUrls(markdown).sort(), [markdown]);

  const { data, isLoading } = useQuery<BlogCitationMap>({
    queryKey: ["blogCitations", urls],
    queryFn: () => fetchBlogMetadata(urls),
    enabled: urls.length > 0,
    staleTime: Infinity,
    retry: 1,
  });

  return { articles: data ?? EMPTY, isLoading };
}

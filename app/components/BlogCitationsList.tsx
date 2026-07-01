"use client";
import { Flex, Text } from "@chakra-ui/react";
import type { BlogArticle } from "@/app/schemas/api/blogs/get";
import {
  inferBlogSource,
  type BlogSource,
} from "@/app/lib/blog-source-branding";
import { SourcePill } from "./BlogArticleCard";

interface BlogCitationsListProps {
  articles: BlogArticle[];
}

/** Cited articles grouped by publisher, preserving first-appearance order. */
function groupBySource(
  articles: BlogArticle[]
): { source: BlogSource; count: number }[] {
  const counts = new Map<BlogSource, number>();
  for (const article of articles) {
    const source = inferBlogSource(article.url, article.source);
    counts.set(source, (counts.get(source) ?? 0) + 1);
  }
  return [...counts.entries()].map(([source, count]) => ({ source, count }));
}

/**
 * Collapsed source-count summary shown at the end of an assistant reply that
 * cites Insights articles. One "From [source] · N sources" row per publisher,
 * stacked when a reply draws on more than one. The top border is the divider
 * separating the reply text from its sources. Individual articles are reachable
 * from the inline citation chips' hover cards.
 */
export function BlogCitationsList({ articles }: BlogCitationsListProps) {
  if (articles.length === 0) return null;

  const groups = groupBySource(articles);

  return (
    <Flex
      direction="column"
      gap="1"
      w="100%"
      mt="3"
      pt="8px"
      pb="4px"
      borderTop="1px solid"
      borderColor="border.emphasized"
    >
      {groups.map(({ source, count }) => (
        <Flex
          key={source}
          align="center"
          justify="space-between"
          gap="4"
          w="100%"
        >
          <Flex align="center" gap="8px" minW={0}>
            <Text
              fontFamily="mono"
              fontSize="xs"
              lineHeight="20px"
              color="fg.muted"
            >
              From
            </Text>
            <SourcePill source={source} iconSize={12} />
          </Flex>
          <Text
            fontFamily="mono"
            fontSize="xs"
            lineHeight="20px"
            color="fg.muted"
            whiteSpace="nowrap"
            flexShrink={0}
          >
            {count} {count === 1 ? "source" : "sources"}
          </Text>
        </Flex>
      ))}
    </Flex>
  );
}

export default BlogCitationsList;

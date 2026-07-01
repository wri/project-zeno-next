"use client";
import { Flex, Text } from "@chakra-ui/react";
import type { BlogArticle } from "@/app/schemas/api/blogs/get";
import { BlogArticleCard } from "./BlogArticleCard";

interface BlogCitationsListProps {
  articles: BlogArticle[];
}

/**
 * Compact source cards for Insights articles cited in an assistant reply.
 */
export function BlogCitationsList({ articles }: BlogCitationsListProps) {
  if (articles.length === 0) return null;

  return (
    <Flex direction="column" gap="2" mt="3" w="100%">
      <Text
        fontFamily="mono"
        fontSize="10px"
        letterSpacing="0.5px"
        textTransform="uppercase"
        color="fg.muted"
      >
        Sources
      </Text>
      <Flex direction="column" gap="2" w="100%">
        {articles.map((article) => (
          <BlogArticleCard
            key={article.id ?? article.url}
            article={article}
            variant="compact"
          />
        ))}
      </Flex>
    </Flex>
  );
}

export default BlogCitationsList;

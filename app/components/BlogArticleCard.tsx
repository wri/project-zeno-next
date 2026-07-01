"use client";
import { Box, Flex, Image, Text, chakra } from "@chakra-ui/react";
import { ArrowSquareOutIcon } from "@phosphor-icons/react";
import { format } from "date-fns";
import type { BlogArticle } from "@/app/schemas/api/blogs/get";
import {
  blogSourceBranding,
  inferBlogSource,
} from "@/app/lib/blog-source-branding";
import { BlogSourceIcon } from "./BlogSourceIcon";

function formatLastmod(lastmod: string): string {
  if (!lastmod) return "";
  const date = new Date(lastmod);
  if (isNaN(date.getTime())) return "";
  return format(date, "MMM d, yyyy");
}

interface BlogArticleCardProps {
  article: BlogArticle;
  /** Link target; defaults to the article's canonical URL. */
  href?: string;
  variant?: "hover" | "compact";
}

function ArticleImage({
  article,
  height,
  source,
}: {
  article: BlogArticle;
  height: string;
  source: ReturnType<typeof inferBlogSource>;
}) {
  if (article.image) {
    return (
      <Box h={height} overflow="hidden" bg="bg.muted" flexShrink={0}>
        <Image
          src={article.image}
          alt={article.image_alt || article.title}
          w="100%"
          h="100%"
          objectFit="cover"
        />
      </Box>
    );
  }

  return (
    <Flex
      h={height}
      align="center"
      justify="center"
      bg={
        source === "lcl"
          ? "linear-gradient(135deg, #EEF7F1 0%, #F4F7FB 100%)"
          : "linear-gradient(135deg, #E8F0FC 0%, #F4F7FB 100%)"
      }
      flexShrink={0}
    >
      <BlogSourceIcon source={source} size={28} wordmark={source === "lcl"} />
    </Flex>
  );
}

/**
 * Brand-tinted badge naming the article's source (WRI gold / LCL green).
 * Matches the Figma "source-pill" component.
 */
export function SourcePill({
  source,
  iconSize = 16,
}: {
  source: ReturnType<typeof inferBlogSource>;
  iconSize?: number;
}) {
  const branding = blogSourceBranding(source);

  return (
    <Flex
      align="center"
      justify="center"
      gap="4px"
      px="4px"
      py="2px"
      borderRadius="4px"
      border="1px solid"
      bg={branding.pillBg}
      borderColor={branding.pillBorder}
      flexShrink={0}
    >
      <BlogSourceIcon source={source} size={iconSize} />
      <Text
        fontFamily="mono"
        fontSize="10px"
        lineHeight="1"
        letterSpacing="0.9px"
        textTransform="uppercase"
        whiteSpace="nowrap"
        color={branding.pillText}
      >
        {branding.label}
      </Text>
    </Flex>
  );
}

function SourceLabel({
  date,
  source,
}: {
  date: string;
  source: ReturnType<typeof inferBlogSource>;
}) {
  return (
    <Flex align="center" justify="space-between" gap="8px" w="100%">
      <SourcePill source={source} />
      {date && (
        <Text
          fontFamily="mono"
          fontSize="10px"
          letterSpacing="0.5px"
          lineHeight="16px"
          whiteSpace="nowrap"
          flexShrink={0}
          color="fg.subtle"
        >
          {date}
        </Text>
      )}
    </Flex>
  );
}

/**
 * Rich preview card for an Insights article (title, summary, hero image).
 */
export function BlogArticleCard({
  article,
  href,
  variant = "hover",
}: BlogArticleCardProps) {
  const link = href ?? article.url;
  const date = formatLastmod(article.lastmod);
  const summary = article.abstract;
  const source = inferBlogSource(article.url, article.source);
  const branding = blogSourceBranding(source);

  if (variant === "compact") {
    return (
      <chakra.a
        href={link}
        target="_blank"
        rel="noopener noreferrer"
        display="flex"
        alignItems="stretch"
        overflow="hidden"
        borderRadius="md"
        border="1px solid"
        borderColor="border"
        bg="bg.panel"
        transition="border-color 0.16s ease, box-shadow 0.16s ease"
        _hover={{
          borderColor: "primary.200",
          boxShadow: "sm",
          textDecoration: "none",
        }}
      >
        <Box w="96px" minW="96px" alignSelf="stretch">
          <ArticleImage article={article} height="96px" source={source} />
        </Box>
        <Flex direction="column" gap="4px" p="10px 12px" minW={0} flex="1">
          <SourceLabel date={date} source={source} />
          <Text
            fontSize="sm"
            fontWeight="600"
            lineHeight="1.35"
            lineClamp={2}
            color="fg"
          >
            {article.title}
          </Text>
          {summary && (
            <Text
              fontSize="xs"
              color="fg.muted"
              lineHeight="1.45"
              lineClamp={2}
            >
              {summary}
            </Text>
          )}
        </Flex>
      </chakra.a>
    );
  }

  return (
    <Box>
      <ArticleImage article={article} height="80px" source={source} />
      <Flex direction="column" gap="12px" p="16px">
        <Flex direction="column" gap="16px">
          <SourceLabel date={date} source={source} />
          <Flex direction="column" gap="4px">
            <Text
              fontSize="sm"
              fontWeight="600"
              lineHeight="20px"
              lineClamp={3}
              color="fg"
            >
              {article.title}
            </Text>
            {summary && (
              <Text
                fontSize="sm"
                color="fg.muted"
                lineHeight="20px"
                lineClamp={3}
              >
                {summary}
              </Text>
            )}
          </Flex>
        </Flex>
        <Flex direction="column" gap="4px">
          <Box h="1px" w="100%" bg="border.emphasized" />
          <Flex align="center" gap="4px" color="fg.link" fontSize="xs">
            Read on {branding.readOn} <ArrowSquareOutIcon size={16} />
          </Flex>
        </Flex>
      </Flex>
    </Box>
  );
}

export default BlogArticleCard;

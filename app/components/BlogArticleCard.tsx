"use client";
import { Box, Flex, Image, Text, chakra } from "@chakra-ui/react";
import { ArrowSquareOutIcon } from "@phosphor-icons/react";
import { format } from "date-fns";
import type { BlogArticle } from "@/app/schemas/api/blogs/get";

const WRI_FAVICON = "/wri-favicon.ico";

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
}: {
  article: BlogArticle;
  height: string;
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
      bg="linear-gradient(135deg, #E8F0FC 0%, #F4F7FB 100%)"
      flexShrink={0}
    >
      <Image src={WRI_FAVICON} alt="" boxSize="28px" opacity={0.7} />
    </Flex>
  );
}

function SourceLabel({ date }: { date: string }) {
  return (
    <Flex align="center" gap="6px">
      <Image src={WRI_FAVICON} alt="" boxSize="12px" />
      <Text
        fontFamily="mono"
        fontSize="10px"
        letterSpacing="0.5px"
        textTransform="uppercase"
        color="fg.muted"
      >
        WRI Insights
      </Text>
      {date && (
        <Text ml="auto" fontFamily="mono" fontSize="10px" color="fg.subtle">
          {date}
        </Text>
      )}
    </Flex>
  );
}

/**
 * Rich preview card for a WRI Insights article (title, summary, hero image).
 */
export function BlogArticleCard({
  article,
  href,
  variant = "hover",
}: BlogArticleCardProps) {
  const link = href ?? article.url;
  const date = formatLastmod(article.lastmod);
  const summary = article.abstract;

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
          <ArticleImage article={article} height="96px" />
        </Box>
        <Flex direction="column" gap="4px" p="10px 12px" minW={0} flex="1">
          <SourceLabel date={date} />
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
      <ArticleImage article={article} height="168px" />
      <Flex direction="column" gap="8px" p="14px 16px 16px">
        <SourceLabel date={date} />
        <Text
          fontSize="md"
          fontWeight="600"
          lineHeight="1.35"
          lineClamp={3}
          color="fg"
        >
          {article.title}
        </Text>
        {summary && (
          <Text fontSize="sm" color="fg.muted" lineHeight="1.55" lineClamp={4}>
            {summary}
          </Text>
        )}
        <Flex
          align="center"
          gap="4px"
          mt="2px"
          color="primary.solid"
          fontSize="xs"
          fontWeight="500"
        >
          Read on wri.org <ArrowSquareOutIcon size={12} />
        </Flex>
      </Flex>
    </Box>
  );
}

export default BlogArticleCard;

"use client";
import { Flex, HoverCard, Portal, Text, chakra } from "@chakra-ui/react";
import type { BlogArticle } from "@/app/schemas/api/blogs/get";
import {
  blogSourceBranding,
  inferBlogSource,
} from "@/app/lib/blog-source-branding";
import { BlogArticleCard } from "./BlogArticleCard";
import { BlogSourceIcon } from "./BlogSourceIcon";

interface BlogCitationProps {
  /** Citation number from the markdown marker, e.g. "1". */
  number: string;
  /** Insights article URL the marker points to. */
  url: string;
  /** Card metadata from agent state `cited_articles`. */
  article?: BlogArticle;
}

function FallbackCard({
  url,
  source,
}: {
  url: string;
  source: ReturnType<typeof inferBlogSource>;
}) {
  const branding = blogSourceBranding(source);

  return (
    <Flex direction="column" gap="6px" p="14px 16px 16px">
      <Flex align="center" gap="6px">
        <BlogSourceIcon source={source} size={12} />
        <Text
          fontFamily="mono"
          fontSize="10px"
          letterSpacing="0.5px"
          textTransform="uppercase"
          color="fg.muted"
        >
          {branding.label}
        </Text>
      </Flex>
      <Text fontSize="xs" color="fg.muted" wordBreak="break-all">
        {url}
      </Text>
    </Flex>
  );
}

/**
 * Inline citation chip rendered in place of `[N](url)` markers in
 * assistant replies. Shows the article card on hover; clicking the chip
 * or the card opens the article in a new tab.
 */
export function BlogCitation({ number, url, article }: BlogCitationProps) {
  const source = inferBlogSource(url, article?.source);
  const branding = blogSourceBranding(source);

  return (
    <HoverCard.Root
      openDelay={200}
      closeDelay={150}
      lazyMount
      unmountOnExit
      positioning={{ placement: "top" }}
    >
      <HoverCard.Trigger asChild>
        <chakra.a
          data-citation=""
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={`Citation ${number}: ${article?.title ?? branding.label}`}
          display="inline-flex"
          alignItems="center"
          gap="2px"
          verticalAlign="super"
          fontFamily="mono"
          fontSize="9px"
          fontWeight="600"
          lineHeight="1"
          px="5px"
          py="2.5px"
          mx="1px"
          borderRadius="full"
          bg="primary.25"
          color="primary.500"
          border="1px solid"
          borderColor="primary.100"
          cursor="pointer"
          transition="all 0.16s ease"
          _hover={{
            bg: "primary.50",
            borderColor: "primary.300",
            color: "primary.700",
          }}
        >
          <BlogSourceIcon source={source} size={10} />
          {number}
        </chakra.a>
      </HoverCard.Trigger>
      <Portal>
        <HoverCard.Positioner>
          <HoverCard.Content
            w="340px"
            maxW="90vw"
            p={0}
            overflow="hidden"
            borderRadius="lg"
            bg="bg.panel"
            boxShadow="0px 12px 32px rgba(0, 0, 0, 0.18)"
          >
            <HoverCard.Arrow>
              <HoverCard.ArrowTip />
            </HoverCard.Arrow>
            <chakra.a
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              display="block"
              color="inherit"
              textDecoration="none"
              _hover={{ textDecoration: "none" }}
            >
              {article ? (
                <BlogArticleCard article={article} href={url} variant="hover" />
              ) : (
                <FallbackCard url={url} source={source} />
              )}
            </chakra.a>
          </HoverCard.Content>
        </HoverCard.Positioner>
      </Portal>
    </HoverCard.Root>
  );
}

export default BlogCitation;

"use client";
import { Flex, HoverCard, Portal, Text, chakra } from "@chakra-ui/react";
import type { BlogArticle } from "@/app/schemas/api/blogs/get";
import {
  blogSourceBranding,
  inferBlogSource,
} from "@/app/lib/blog-source-branding";
import { BlogArticleCard, SourcePill } from "./BlogArticleCard";
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
  return (
    <Flex direction="column" gap="12px" p="16px">
      <SourcePill source={source} />
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
          justifyContent="center"
          gap="2px"
          verticalAlign="super"
          fontFamily="mono"
          fontSize="8px"
          fontWeight="600"
          letterSpacing="0.9px"
          lineHeight="1"
          px="4px"
          py="2px"
          mx="1px"
          borderRadius="4px"
          // Colours taken from the Figma "source-pill" citation chip. The chip
          // is source-agnostic (blue) — only the BlogSourceIcon glyph varies.
          bg="#F0F4FF"
          color="#2A5FB5"
          border="1px solid"
          borderColor="#B2C3F0"
          cursor="pointer"
          transition="all 0.16s ease"
          _hover={{
            bg: "#E4EAFB",
            borderColor: "#9FB4E8",
            color: "#1E4C99",
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
            border="1px solid"
            borderColor="border.emphasized"
            boxShadow="0px 4px 6px -1px rgba(0, 0, 0, 0.1), 0px 2px 4px -2px rgba(0, 0, 0, 0.1)"
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

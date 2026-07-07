"use client";
import { Fragment, useState } from "react";
import { Box, Flex, Text, chakra } from "@chakra-ui/react";
import { ArrowSquareOutIcon, CaretDownIcon } from "@phosphor-icons/react";
import type { CitedArticleRef } from "@/app/lib/blog-citations";
import {
  blogSourceBranding,
  inferBlogSource,
  type BlogSource,
} from "@/app/lib/blog-source-branding";
import { SourcePill } from "./BlogArticleCard";
import { BlogSourceIcon } from "./BlogSourceIcon";

interface BlogCitationsListProps {
  refs: CitedArticleRef[];
}

/** Distinct sources cited, in first-appearance order. */
function distinctSources(refs: CitedArticleRef[]): BlogSource[] {
  const seen = new Set<BlogSource>();
  const order: BlogSource[] = [];
  for (const { url, article } of refs) {
    const source = inferBlogSource(url, article.source);
    if (!seen.has(source)) {
      seen.add(source);
      order.push(source);
    }
  }
  return order;
}

/** Citation number chip mirroring the inline marker (mono, white, bordered). */
function NumberBadge({ number }: { number: string }) {
  return (
    <Flex
      align="center"
      justify="center"
      boxSize="16px"
      px="4px"
      py="2px"
      borderRadius="4px"
      border="1px solid"
      borderColor="border"
      bg="bg.panel"
      flexShrink={0}
    >
      <Text
        fontFamily="mono"
        fontWeight="600"
        fontSize="9px"
        lineHeight="1"
        color="fg.muted"
      >
        {number}
      </Text>
    </Flex>
  );
}

/** Compact brand-tinted square holding just the source glyph. */
function SourceIconBadge({ source }: { source: BlogSource }) {
  const branding = blogSourceBranding(source);
  return (
    <Flex
      align="center"
      justify="center"
      boxSize="16px"
      p="2px"
      borderRadius="4px"
      border="1px solid"
      bg={branding.pillBg}
      borderColor={branding.pillBorder}
      flexShrink={0}
    >
      <BlogSourceIcon source={source} size={12} />
    </Flex>
  );
}

/** One row in the expanded list: number, source glyph, title, open-in-new. */
function SourceRow({ item }: { item: CitedArticleRef }) {
  const { number, url, article } = item;
  const source = inferBlogSource(url, article.source);

  return (
    <chakra.a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      display="flex"
      alignItems="flex-start"
      gap="8px"
      w="100%"
      py="2px"
      color="fg.link"
      _hover={{ textDecoration: "underline" }}
    >
      <Flex flex="1" minW={0} gap="4px" align="flex-start">
        <NumberBadge number={number} />
        <SourceIconBadge source={source} />
        <Text
          fontSize="12px"
          lineHeight="16px"
          color="fg.link"
          flex="1"
          minW={0}
        >
          {article.title}
        </Text>
      </Flex>
      <Box as="span" display="inline-flex" flexShrink={0} color="fg.link">
        <ArrowSquareOutIcon size={16} />
      </Box>
    </chakra.a>
  );
}

/**
 * Sources footer shown at the end of an assistant reply that cites Insights
 * articles. Collapsed, it summarises the distinct publishers ("From [WRI]
 * [LCL] · N sources"); clicking the chevron expands a compact list of every
 * cited article. The top border is the divider separating the reply text from
 * its sources.
 */
export function BlogCitationsList({ refs }: BlogCitationsListProps) {
  const [open, setOpen] = useState(false);
  if (refs.length === 0) return null;

  const sources = distinctSources(refs);
  const total = refs.length;

  return (
    <Flex
      direction="column"
      w="100%"
      mt="3"
      pt="8px"
      borderTop="1px solid"
      borderColor="border.emphasized"
    >
      <chakra.button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        aria-expanded={open}
        aria-label={open ? "Hide sources" : "Show sources"}
        display="flex"
        alignItems="flex-start"
        justifyContent="space-between"
        gap="8px"
        w="100%"
        pb="4px"
        bg="transparent"
        textAlign="left"
        cursor="pointer"
      >
        <Flex flex="1" minW={0} gap="8px" align="flex-start">
          <Text
            fontFamily="mono"
            fontSize="xs"
            lineHeight="20px"
            color="fg.muted"
            flexShrink={0}
          >
            From
          </Text>
          <Flex wrap="wrap" gap="4px" py="4px" flex="1" minW={0}>
            {sources.map((source) => (
              <SourcePill key={source} source={source} iconSize={12} />
            ))}
          </Flex>
        </Flex>
        <Flex align="center" gap="4px" flexShrink={0}>
          <Text
            fontFamily="mono"
            fontSize="xs"
            lineHeight="20px"
            color="fg.muted"
            whiteSpace="nowrap"
          >
            {total} {total === 1 ? "source" : "sources"}
          </Text>
          <Box
            as="span"
            display="inline-flex"
            color="fg.muted"
            transform={open ? "rotate(180deg)" : undefined}
            transition="transform 0.16s ease"
          >
            <CaretDownIcon size={16} />
          </Box>
        </Flex>
      </chakra.button>

      {open && (
        <Flex direction="column" gap="8px" w="100%" pt="12px" pb="4px">
          {refs.map((item, i) => (
            <Fragment key={item.article.slug}>
              <SourceRow item={item} />
              {i < refs.length - 1 && <Box h="1px" w="100%" bg="border" />}
            </Fragment>
          ))}
        </Flex>
      )}
    </Flex>
  );
}

export default BlogCitationsList;

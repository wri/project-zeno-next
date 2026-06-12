"use client";
import {
  Box,
  Flex,
  HoverCard,
  Image,
  Portal,
  Skeleton,
  Text,
  chakra,
} from "@chakra-ui/react";
import { ArrowSquareOutIcon } from "@phosphor-icons/react";
import { format } from "date-fns";
import type { BlogArticle } from "@/app/schemas/api/blogs/get";

const WRI_FAVICON = "/wri-favicon.ico";

interface BlogCitationProps {
  /** Citation number from the markdown marker, e.g. "1". */
  number: string;
  /** WRI Insights article URL the marker points to. */
  url: string;
  /** Card metadata, when already resolved by useBlogCitations. */
  article?: BlogArticle;
  /** True while metadata is being fetched. */
  isLoading?: boolean;
}

function formatLastmod(lastmod: string): string {
  const date = new Date(lastmod);
  if (isNaN(date.getTime())) return "";
  return format(date, "MMM d, yyyy");
}

function CardBody({ article, url }: { article?: BlogArticle; url: string }) {
  if (!article) {
    // Unknown URL: still give the user somewhere to go.
    return (
      <Flex direction="column" gap="6px" p="12px 14px 14px">
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
        </Flex>
        <Text fontSize="xs" color="fg.muted" wordBreak="break-all">
          {url}
        </Text>
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
    );
  }

  const date = formatLastmod(article.lastmod);

  return (
    <>
      {article.image && (
        <Box h="132px" overflow="hidden" bg="bg.muted">
          <Image
            src={article.image}
            alt={article.image_alt || article.title}
            w="100%"
            h="100%"
            objectFit="cover"
          />
        </Box>
      )}
      <Flex direction="column" gap="6px" p="12px 14px 14px">
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
        <Text
          fontSize="sm"
          fontWeight="600"
          lineHeight="1.35"
          lineClamp={2}
          color="fg"
        >
          {article.title}
        </Text>
        {article.abstract && (
          <Text fontSize="xs" color="fg.muted" lineHeight="1.5" lineClamp={3}>
            {article.abstract}
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
    </>
  );
}

/**
 * Inline citation chip rendered in place of `[N](url)` markers in
 * assistant replies. Shows the article card on hover; clicking the chip
 * or the card opens the article in a new tab.
 */
export function BlogCitation({
  number,
  url,
  article,
  isLoading = false,
}: BlogCitationProps) {
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
          aria-label={`Citation ${number}: ${article?.title ?? "WRI Insights article"}`}
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
          <Image src={WRI_FAVICON} alt="" boxSize="10px" flexShrink={0} />
          {number}
        </chakra.a>
      </HoverCard.Trigger>
      <Portal>
        <HoverCard.Positioner>
          <HoverCard.Content
            w="320px"
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
            {isLoading && !article ? (
              <Box p="14px">
                <Skeleton h="10px" w="40%" mb="3" />
                <Skeleton h="14px" w="90%" mb="2" />
                <Skeleton h="10px" w="100%" mb="1" />
                <Skeleton h="10px" w="75%" />
              </Box>
            ) : (
              <chakra.a
                href={url}
                target="_blank"
                rel="noopener noreferrer"
                display="block"
                color="inherit"
                textDecoration="none"
                _hover={{ textDecoration: "none" }}
              >
                <CardBody article={article} url={url} />
              </chakra.a>
            )}
          </HoverCard.Content>
        </HoverCard.Positioner>
      </Portal>
    </HoverCard.Root>
  );
}

export default BlogCitation;

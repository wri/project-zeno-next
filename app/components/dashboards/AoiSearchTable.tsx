"use client";

import { useState } from "react";
import {
  Box,
  Button,
  Flex,
  Input,
  InputGroup,
  Skeleton,
  Table,
  Text,
} from "@chakra-ui/react";
import { ArrowRightIcon, MagnifyingGlassIcon } from "@phosphor-icons/react";

import { AreaCatalogThumbnail } from "@/app/components/AreaCatalogThumbnail";
import { useAoiSearch } from "@/app/hooks/useAoiSearch";
import {
  isPlaceholderBbox,
  type AoiSearchResult,
} from "@/app/schemas/api/aois/get";
import type { AOISelection } from "@/app/types/chat";

// Category filter chips → the endpoint's `source` values.
const CATEGORIES: { label: string; source: string }[] = [
  { label: "Administrative areas", source: "gadm" },
  { label: "Key biodiversity areas", source: "kba" },
  { label: "Protected areas", source: "wdpa" },
  { label: "Indigenous lands", source: "landmark" },
  { label: "Custom areas", source: "custom" },
];

const TYPE_LABELS: Record<string, string> = Object.fromEntries(
  CATEGORIES.map(({ source, label }) => [source, label])
);

/** "state-province" → "State province". */
function formatSubtype(subtype: string): string {
  const words = subtype.replace(/[-_]+/g, " ").trim();
  return words ? words.charAt(0).toUpperCase() + words.slice(1) : "";
}

function toAoiSelection(result: AoiSearchResult): AOISelection {
  const bbox = isPlaceholderBbox(result.bbox)
    ? undefined
    : (result.bbox as [number, number, number, number]);
  return {
    name: result.name,
    aois: [
      {
        name: result.name,
        src_id: result.src_id,
        source: result.source,
        subtype: result.subtype,
        ...(bbox ? { bbox } : {}),
      },
    ],
  };
}

function HeadCell(props: React.ComponentProps<typeof Table.ColumnHeader>) {
  return (
    <Table.ColumnHeader
      fontSize="10px"
      fontFamily="mono"
      letterSpacing="0.5px"
      textTransform="uppercase"
      color="fg.muted"
      fontWeight="normal"
      {...props}
    />
  );
}

function ResultRow({
  result,
  onSelect,
  disabled,
}: {
  result: AoiSearchResult;
  onSelect: (result: AoiSearchResult) => void;
  disabled: boolean;
}) {
  return (
    <Table.Row
      role="group"
      bg="transparent"
      cursor={disabled ? "default" : "pointer"}
      opacity={disabled ? 0.6 : 1}
      onClick={disabled ? undefined : () => onSelect(result)}
      _hover={disabled ? undefined : { bg: "bg.subtle" }}
    >
      <Table.Cell>
        <Flex align="center" gap={3}>
          <Box
            w="48px"
            h="48px"
            rounded="md"
            overflow="hidden"
            flexShrink={0}
            borderWidth="1px"
            borderColor="border"
          >
            <AreaCatalogThumbnail
              aoiSelection={toAoiSelection(result)}
              alt={`Map of ${result.name}`}
            />
          </Box>
          <Box minW={0}>
            <Text fontWeight="medium" lineClamp={1}>
              {result.name}
            </Text>
            <Text fontSize="xs" color="fg.muted" lineClamp={1}>
              {formatSubtype(result.subtype)}
            </Text>
          </Box>
        </Flex>
      </Table.Cell>
      <Table.Cell whiteSpace="nowrap" fontSize="sm" color="fg.muted">
        {TYPE_LABELS[result.source] ?? result.source}
      </Table.Cell>
      <Table.Cell textAlign="end">
        <Button
          size="xs"
          variant="ghost"
          colorPalette="primary"
          disabled={disabled}
          opacity={0}
          _groupHover={{ opacity: 1 }}
          _focusVisible={{ opacity: 1 }}
          onClick={(e) => {
            e.stopPropagation();
            onSelect(result);
          }}
        >
          New dashboard
          <ArrowRightIcon size={14} />
        </Button>
      </Table.Cell>
    </Table.Row>
  );
}

function SkeletonRow() {
  return (
    <Table.Row bg="transparent">
      <Table.Cell>
        <Flex align="center" gap={3}>
          <Skeleton w="48px" h="48px" rounded="md" flexShrink={0} />
          <Box flex="1" maxW="260px">
            <Skeleton h="14px" mb={2} maxW="180px" />
            <Skeleton h="10px" maxW="120px" />
          </Box>
        </Flex>
      </Table.Cell>
      <Table.Cell>
        <Skeleton h="12px" maxW="120px" />
      </Table.Cell>
      <Table.Cell>
        <Skeleton h="12px" maxW="60px" ml="auto" />
      </Table.Cell>
    </Table.Row>
  );
}

/**
 * The "create new dashboard" area picker: search input, source category
 * chips, and a results table whose row action starts a dashboard for that
 * area. States per the design: browse (empty query), loading skeletons,
 * results, no-results.
 */
export default function AoiSearchTable({
  onSelect,
  isCreating,
}: {
  onSelect: (result: AoiSearchResult) => void;
  isCreating: boolean;
}) {
  const [query, setQuery] = useState("");
  const [activeSource, setActiveSource] = useState<string | null>(null);

  const { results, isSearching } = useAoiSearch(
    query,
    activeSource ? [activeSource] : []
  );

  const chip = (label: string, source: string | null) => {
    const active = activeSource === source;
    return (
      <Button
        key={label}
        size="xs"
        rounded="full"
        variant={active ? "solid" : "outline"}
        colorPalette={active ? "primary" : "gray"}
        onClick={() => setActiveSource(source)}
      >
        {label}
      </Button>
    );
  };

  return (
    <Flex direction="column" gap={4}>
      <InputGroup
        endElement={<MagnifyingGlassIcon size={16} />}
        colorPalette="primary"
      >
        <Input
          placeholder="Search areas by name…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          bg="bg"
        />
      </InputGroup>

      <Flex gap={2} wrap="wrap">
        {chip("All categories", null)}
        {CATEGORIES.map(({ label, source }) => chip(label, source))}
      </Flex>

      <Box
        bg="bg"
        borderWidth="1px"
        borderColor="border"
        rounded="md"
        overflow="hidden"
      >
        <Table.Root variant="line" size="sm" bg="transparent">
          <Table.Header>
            <Table.Row bg="bg.subtle">
              <HeadCell width="100%">Area name</HeadCell>
              <HeadCell whiteSpace="nowrap">Type</HeadCell>
              <HeadCell textAlign="end">Actions</HeadCell>
            </Table.Row>
          </Table.Header>
          <Table.Body>
            {isSearching && !results?.length ? (
              [0, 1, 2, 3].map((i) => <SkeletonRow key={i} />)
            ) : !results?.length ? (
              <Table.Row bg="transparent">
                <Table.Cell colSpan={3} textAlign="center" py={10}>
                  <Text fontWeight="medium">
                    “{query.trim()}” didn’t return any results.
                  </Text>
                  <Text fontSize="sm" color="fg.muted">
                    Please check spelling and try again.
                  </Text>
                </Table.Cell>
              </Table.Row>
            ) : (
              results.map((result) => (
                <ResultRow
                  key={`${result.source}:${result.src_id}`}
                  result={result}
                  onSelect={onSelect}
                  disabled={isCreating}
                />
              ))
            )}
          </Table.Body>
        </Table.Root>
      </Box>
    </Flex>
  );
}

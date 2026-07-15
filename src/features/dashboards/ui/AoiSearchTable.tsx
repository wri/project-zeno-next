"use client";

import { useState } from "react";
import type { ComponentProps } from "react";
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
import {
  CaretRightIcon,
  MagnifyingGlassIcon,
  UploadSimpleIcon,
} from "@phosphor-icons/react";

import { AreaCatalogThumbnail } from "@/app/components/AreaCatalogThumbnail";
import type { AOISelection } from "@/app/types/chat";
import type { AoiSearchResult } from "../api/schemas";
import { AOI_SOURCE_OPTIONS, sourceLabel, subtypeLabel } from "../lib/aoi";
import { useAoiSearch } from "./dashboardQueries";

function toAoiSelection(result: AoiSearchResult): AOISelection {
  const bbox =
    result.bbox?.length === 4
      ? (result.bbox as [number, number, number, number])
      : undefined;

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

function HeadCell(props: ComponentProps<typeof Table.ColumnHeader>) {
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

function SkeletonRow() {
  return (
    <Table.Row bg="transparent">
      <Table.Cell>
        <Flex align="center" gap={3}>
          <Skeleton w="48px" h="48px" borderRadius="sm" flexShrink={0} />
          <Box flex="1">
            <Skeleton h="14px" mb={2} maxW="180px" />
            <Skeleton h="10px" maxW="120px" />
          </Box>
        </Flex>
      </Table.Cell>
      <Table.Cell>
        <Skeleton h="12px" maxW="120px" />
      </Table.Cell>
      <Table.Cell>
        <Skeleton h="12px" maxW="40px" />
      </Table.Cell>
      <Table.Cell>
        <Skeleton h="12px" maxW="80px" ml="auto" />
      </Table.Cell>
    </Table.Row>
  );
}

function ResultRow({
  result,
  disabled,
  onCreate,
}: {
  result: AoiSearchResult;
  disabled: boolean;
  onCreate: (result: AoiSearchResult) => void;
}) {
  return (
    <Table.Row
      // `.group` (not role="group") is what Chakra's _groupHover targets, so
      // the row must carry the class for the reveal-on-hover action to fire.
      className="group"
      bg="transparent"
      opacity={disabled ? 0.6 : 1}
      _hover={disabled ? undefined : { bg: "blue.50" }}
    >
      <Table.Cell>
        <Flex align="center" gap={3}>
          <Box
            w="48px"
            h="48px"
            borderRadius="sm"
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
              {subtypeLabel(result.subtype)}
            </Text>
          </Box>
        </Flex>
      </Table.Cell>
      <Table.Cell whiteSpace="nowrap" fontSize="sm" color="fg.muted">
        {sourceLabel(result.source)}
      </Table.Cell>
      <Table.Cell color="fg.muted" fontSize="sm">
        -
      </Table.Cell>
      <Table.Cell textAlign="end">
        <Button
          size="xs"
          variant="ghost"
          colorPalette="primary"
          disabled={disabled}
          opacity={{ base: 1, md: 0 }}
          // No hover fill: the Figma shows plain text + chevron on the row's
          // hover bg, not a nested ghost-button box. Keyboard focus still
          // reveals it and keeps the default focus ring for a11y.
          _hover={{ bg: "transparent" }}
          _groupHover={{ opacity: 1 }}
          _focusVisible={{ opacity: 1 }}
          onClick={() => onCreate(result)}
        >
          New dashboard
          <CaretRightIcon size={16} />
        </Button>
      </Table.Cell>
    </Table.Row>
  );
}

export default function AoiSearchTable({
  isCreating,
  onCreateDashboard,
}: {
  isCreating: boolean;
  onCreateDashboard: (result: AoiSearchResult) => void;
}) {
  const [query, setQuery] = useState("");
  const [source, setSource] = useState<string | null>(null);
  const {
    data: results = [],
    isLoading,
    isFetching,
    isError,
  } = useAoiSearch(query, source);
  const showSkeletons = isLoading || (isFetching && results.length === 0);
  const trimmed = query.trim();
  const canSearch = trimmed.length >= 2;
  const hint =
    trimmed.length > 0 && !canSearch
      ? "Type at least 2 characters to search by name."
      : null;

  return (
    <Flex direction="column" gap={3}>
      <Flex gap={3} align="center">
        <InputGroup
          flex="1"
          endElement={<MagnifyingGlassIcon size={16} />}
          colorPalette="primary"
        >
          <Input
            placeholder="Search areas by name..."
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            bg="white"
          />
        </InputGroup>
        <Button size="sm" variant="outline" disabled>
          <UploadSimpleIcon size={16} />
          Upload shapefile
        </Button>
      </Flex>

      <Flex gap={2} wrap="wrap">
        {AOI_SOURCE_OPTIONS.map((option) => {
          const active = source === option.source;
          return (
            <Button
              key={option.label}
              size="xs"
              borderRadius="full"
              variant={active ? "solid" : "outline"}
              colorPalette={active ? "primary" : "gray"}
              onClick={() => setSource(option.source)}
            >
              {option.label}
            </Button>
          );
        })}
      </Flex>

      {hint && (
        <Text fontSize="xs" color="fg.muted">
          {hint}
        </Text>
      )}

      <Box
        bg="white"
        borderWidth="1px"
        borderColor="border"
        borderRadius="sm"
        overflow="hidden"
      >
        <Table.Root variant="line" size="sm">
          <Table.Header>
            <Table.Row bg="bg.subtle">
              <HeadCell width="100%">Area name</HeadCell>
              <HeadCell whiteSpace="nowrap">Type</HeadCell>
              <HeadCell whiteSpace="nowrap">Previous analyses</HeadCell>
              <HeadCell textAlign="end">Actions</HeadCell>
            </Table.Row>
          </Table.Header>
          <Table.Body>
            {showSkeletons ? (
              [0, 1, 2, 3].map((item) => <SkeletonRow key={item} />)
            ) : isError ? (
              <Table.Row bg="transparent">
                <Table.Cell colSpan={4}>
                  <Text color="fg.error" py={4}>
                    Could not load areas. Try another search.
                  </Text>
                </Table.Cell>
              </Table.Row>
            ) : !canSearch ? (
              <Table.Row bg="transparent">
                <Table.Cell colSpan={4}>
                  <Text color="fg.muted" py={4}>
                    Search for an area to start a dashboard.
                  </Text>
                </Table.Cell>
              </Table.Row>
            ) : results.length === 0 ? (
              <Table.Row bg="transparent">
                <Table.Cell colSpan={4}>
                  <Text color="fg.muted" py={4}>
                    No areas found.
                  </Text>
                </Table.Cell>
              </Table.Row>
            ) : (
              results.map((result) => (
                <ResultRow
                  key={`${result.source}-${result.src_id}`}
                  result={result}
                  disabled={isCreating}
                  onCreate={onCreateDashboard}
                />
              ))
            )}
          </Table.Body>
        </Table.Root>
      </Box>
    </Flex>
  );
}

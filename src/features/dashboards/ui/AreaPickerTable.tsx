"use client";

import { useState } from "react";
import {
  Box,
  Flex,
  IconButton,
  Input,
  Menu,
  Portal,
  Skeleton,
  Spinner,
  Table,
  Text,
} from "@chakra-ui/react";
import {
  CaretDownIcon,
  CaretRightIcon,
  DotsThreeVerticalIcon,
} from "@phosphor-icons/react";

import { AreaCatalogThumbnail } from "@/app/components/AreaCatalogThumbnail";
import type { AOISelection } from "@/app/types/chat";

import { subtypeLabel } from "../lib/aoi";
import type { AreaPickerRow } from "../model/area-picker-rows";
import {
  areaRowKey,
  areaTypeLabel,
  flattenAreaTree,
  type AreaTreeNode,
} from "../model/area-tree";

const ACTION_COLOR = "#0049AA";
const MUTED_TEXT = "#656E7B";
const FAINT_TEXT = "#9AA3B2";
const LEAF_DOT = "#C2C7D0";
const CARET_HOVER_BG = "#E7EEFF";

const CARET_COL_PX = 24;
const THUMBNAIL_PX = 64;
const CELL_GAP_PX = 12;
/** Explicit start padding on the name cell so the header label can be aligned
 * with the name text independently of the table-size default padding. */
const NAME_CELL_PL_PX = 12;

const columnHeaderStyle = {
  fontFamily: "body",
  fontSize: "12px",
  fontWeight: "400",
  lineHeight: "16px",
  letterSpacing: "normal",
  color: MUTED_TEXT,
  whiteSpace: "nowrap",
} as const;

const cellTextStyle = {
  fontFamily: "body",
  fontSize: "14px",
  fontWeight: "400",
  lineHeight: "16px",
  letterSpacing: "normal",
  color: MUTED_TEXT,
} as const;

/** Per-level indent of the name cell, mirroring the design's 0 / 24 / 56px
 * stepping (deeper levels keep adding 28px). */
function indentForDepth(depth: number): number {
  if (depth <= 0) return 0;
  if (depth === 1) return 24;
  return 56 + (depth - 2) * 28;
}

function toAoiSelection(row: AreaPickerRow): AOISelection {
  const bbox =
    row.bbox?.length === 4
      ? (row.bbox as [number, number, number, number])
      : undefined;
  return {
    name: row.name,
    aois: [
      {
        name: row.name,
        src_id: row.src_id,
        source: row.source,
        subtype: row.subtype,
        ...(bbox ? { bbox } : {}),
      },
    ],
  };
}

/** Highlights the first occurrence of the search term inside the area name.
 * Fuzzy matches without a literal occurrence render unhighlighted. */
function HighlightedName({ name, term }: { name: string; term: string }) {
  const trimmed = term.trim();
  const index = trimmed
    ? name.toLowerCase().indexOf(trimmed.toLowerCase())
    : -1;
  if (index < 0) return <>{name}</>;
  const end = index + trimmed.length;
  return (
    <>
      {name.slice(0, index)}
      <Box as="mark" display="inline" bg="lime.400" px="2px" borderRadius="2px">
        {name.slice(index, end)}
      </Box>
      {name.slice(end)}
    </>
  );
}

function ExpandToggle({
  node,
  collapsed,
  onToggle,
}: {
  node: AreaTreeNode;
  collapsed: boolean;
  onToggle: (key: string) => void;
}) {
  if (node.children.length === 0) {
    return (
      <Flex w={`${CARET_COL_PX}px`} justify="center" flexShrink={0}>
        <Box w="6px" h="6px" borderRadius="full" bg={LEAF_DOT} />
      </Flex>
    );
  }
  return (
    <IconButton
      aria-label={`${collapsed ? "Expand" : "Collapse"} ${node.row.name}`}
      aria-expanded={!collapsed}
      variant="ghost"
      size="xs"
      minW={`${CARET_COL_PX}px`}
      w={`${CARET_COL_PX}px`}
      h={`${CARET_COL_PX}px`}
      flexShrink={0}
      color={MUTED_TEXT}
      _hover={{ bg: CARET_HOVER_BG }}
      onClick={(e) => {
        e.stopPropagation();
        onToggle(areaRowKey(node.row));
      }}
    >
      {collapsed ? <CaretRightIcon size={16} /> : <CaretDownIcon size={16} />}
    </IconButton>
  );
}

const SKELETON_ROW_COUNT = 4;

/** Shimmer placeholder mirroring a row's layout (thumbnail + two text lines)
 * so the table doesn't jump when real results land. */
function SkeletonRow() {
  return (
    <Table.Row data-testid="area-picker-skeleton-row">
      <Table.Cell py="8px" pl={`${NAME_CELL_PL_PX}px`}>
        <Flex align="center" gap={`${CELL_GAP_PX}px`}>
          <Box w={`${CARET_COL_PX}px`} flexShrink={0} />
          <Skeleton
            w={`${THUMBNAIL_PX}px`}
            h={`${THUMBNAIL_PX}px`}
            borderRadius="4px"
            flexShrink={0}
          />
          <Box flex="1" minW={0}>
            <Skeleton h="14px" maxW="180px" mb="8px" />
            <Skeleton h="10px" maxW="120px" />
          </Box>
        </Flex>
      </Table.Cell>
      <Table.Cell py="8px">
        <Skeleton h="12px" maxW="120px" />
      </Table.Cell>
      <Table.Cell py="8px">
        <Skeleton h="12px" maxW="40px" />
      </Table.Cell>
      <Table.Cell py="8px">
        <Skeleton h="12px" maxW="100px" ml="auto" />
      </Table.Cell>
    </Table.Row>
  );
}

export interface AreaPickerTableProps {
  nodes: AreaTreeNode[];
  /** Replaces the rows with shimmer placeholders while data loads — both the
   * initial fetch and in-flight server-side searches over stale rows. */
  isLoading?: boolean;
  /** The (debounced) term that produced `nodes` — used for match highlight. */
  searchTerm: string;
  creatingRowKey: string | null;
  renamingId: string | null;
  renameValue: string;
  isDeleting: boolean;
  onSelect: (row: AreaPickerRow) => void;
  onRenameStart: (row: AreaPickerRow) => void;
  onRenameChange: (value: string) => void;
  onRenameSubmit: (areaId: string) => void;
  onRenameCancel: () => void;
  onDelete: (row: AreaPickerRow) => void;
}

interface RowProps extends Omit<AreaPickerTableProps, "nodes" | "isLoading"> {
  node: AreaTreeNode;
  collapsed: boolean;
  onToggle: (key: string) => void;
}

function AreaNameCell(props: RowProps) {
  const { node, searchTerm } = props;
  const { row } = node;
  const isCustom = row.source === "custom";
  const isRenamingThisRow = isCustom && props.renamingId === row.src_id;
  const crumb = node.ancestorNames.length > 0 ? [row.name].join(" › ") : null;

  return (
    <Table.Cell overflow="hidden" py="8px" pl={`${NAME_CELL_PL_PX}px`}>
      <Flex
        align="center"
        gap={`${CELL_GAP_PX}px`}
        pl={`${indentForDepth(node.depth)}px`}
      >
        <ExpandToggle
          node={node}
          collapsed={props.collapsed}
          onToggle={props.onToggle}
        />
        <Box
          w={`${THUMBNAIL_PX}px`}
          h={`${THUMBNAIL_PX}px`}
          borderRadius="4px"
          overflow="hidden"
          flexShrink={0}
          borderWidth="1px"
          borderColor="border"
        >
          <AreaCatalogThumbnail
            aoiSelection={toAoiSelection(row)}
            alt={`Map of ${row.name}`}
          />
        </Box>
        {isRenamingThisRow ? (
          <Input
            size="sm"
            value={props.renameValue}
            onChange={(e) => props.onRenameChange(e.target.value)}
            onClick={(e) => e.stopPropagation()}
            onKeyDown={(e) => {
              if (e.key === "Enter") props.onRenameSubmit(row.src_id);
              if (e.key === "Escape") props.onRenameCancel();
            }}
            autoFocus
          />
        ) : (
          <Box minW={0}>
            <Text
              fontWeight={node.depth === 0 ? "semibold" : "medium"}
              fontSize={node.depth === 0 ? "15px" : "14px"}
              whiteSpace="nowrap"
              overflow="hidden"
              textOverflow="ellipsis"
            >
              <HighlightedName name={row.name} term={searchTerm} />
            </Text>
            {crumb ? (
              <Text
                fontFamily="mono"
                fontSize="12px"
                color={FAINT_TEXT}
                mt="2px"
                whiteSpace="nowrap"
                overflow="hidden"
                textOverflow="ellipsis"
              >
                {crumb}
              </Text>
            ) : (
              !isCustom &&
              row.subtype && (
                <Text
                  fontFamily="mono"
                  fontSize="12px"
                  color={MUTED_TEXT}
                  mt="2px"
                  whiteSpace="nowrap"
                  overflow="hidden"
                  textOverflow="ellipsis"
                >
                  {subtypeLabel(row.subtype)}
                </Text>
              )
            )}
          </Box>
        )}
      </Flex>
    </Table.Cell>
  );
}

function AreaActionsCell(props: RowProps) {
  const { row } = props.node;
  const isCustom = row.source === "custom";
  const isCreatingThisRow = props.creatingRowKey === areaRowKey(row);

  return (
    <Table.Cell py="8px">
      <Flex align="center" gap={2} justify="flex-end">
        {isCreatingThisRow ? (
          <Spinner size="sm" />
        ) : (
          <Flex
            data-row-action
            align="center"
            gap="4px"
            opacity={{ base: 1, md: 0 }}
          >
            <Text
              fontFamily="body"
              fontSize="14px"
              fontWeight="500"
              lineHeight="150%"
              color={ACTION_COLOR}
              whiteSpace="nowrap"
            >
              New dashboard
            </Text>
            <CaretRightIcon size={14} color={ACTION_COLOR} />
          </Flex>
        )}
        {isCustom && (
          <Menu.Root>
            <Menu.Trigger asChild>
              <IconButton
                aria-label="Area actions"
                variant="ghost"
                size="xs"
                disabled={props.isDeleting}
                onClick={(e) => e.stopPropagation()}
              >
                <DotsThreeVerticalIcon />
              </IconButton>
            </Menu.Trigger>
            <Portal>
              <Menu.Positioner>
                <Menu.Content>
                  <Menu.Item
                    value="rename"
                    onClick={(e) => {
                      e.stopPropagation();
                      props.onRenameStart(row);
                    }}
                  >
                    Rename
                  </Menu.Item>
                  <Menu.Item
                    value="delete"
                    color="fg.error"
                    onClick={(e) => {
                      e.stopPropagation();
                      props.onDelete(row);
                    }}
                  >
                    Delete
                  </Menu.Item>
                </Menu.Content>
              </Menu.Positioner>
            </Portal>
          </Menu.Root>
        )}
      </Flex>
    </Table.Cell>
  );
}

function AreaPickerRowView(props: RowProps) {
  const { node, creatingRowKey, renamingId } = props;
  const { row } = node;
  const key = areaRowKey(row);
  const isRenamingThisRow =
    row.source === "custom" && renamingId === row.src_id;
  const isCreatingThisRow = creatingRowKey === key;

  return (
    <Table.Row
      tabIndex={creatingRowKey || isRenamingThisRow ? -1 : 0}
      aria-label={
        isRenamingThisRow ? undefined : `Create dashboard for ${row.name}`
      }
      cursor={creatingRowKey ? "default" : "pointer"}
      opacity={creatingRowKey && !isCreatingThisRow ? 0.5 : 1}
      _hover={{
        bg: "primary.25",
        "& [data-row-action]": { opacity: 1 },
      }}
      _focusVisible={{
        bg: "primary.25",
        "& [data-row-action]": { opacity: 1 },
        outline: "2px solid",
        outlineColor: "primary.500",
        outlineOffset: "-2px",
      }}
      onClick={() => {
        if (!isRenamingThisRow) props.onSelect(row);
      }}
      onKeyDown={(e) => {
        // Only react to keys on the row itself — Enter on the expand toggle
        // or the actions menu must not create a dashboard.
        if (e.target !== e.currentTarget) return;
        if (isRenamingThisRow || creatingRowKey) return;
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          props.onSelect(row);
        }
      }}
    >
      <AreaNameCell {...props} />
      <Table.Cell py="8px">
        <Text {...cellTextStyle}>{areaTypeLabel(row)}</Text>
      </Table.Cell>
      <Table.Cell py="8px">
        <Text {...cellTextStyle}>{row.previousAnalyses}</Text>
      </Table.Cell>
      <AreaActionsCell {...props} />
    </Table.Row>
  );
}

/**
 * The nested new-dashboard area table (per the "Area Search Table" design):
 * expandable admin-area hierarchy with map thumbnails, match highlight and
 * breadcrumb context lines. Expansion state lives here; everything else is
 * controlled by the parent screen.
 */
export function AreaPickerTable({
  nodes,
  isLoading = false,
  ...rowProps
}: AreaPickerTableProps) {
  const [collapsedKeys, setCollapsedKeys] = useState<ReadonlySet<string>>(
    new Set()
  );

  const handleToggle = (key: string) => {
    setCollapsedKeys((prev) => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  };

  const visibleNodes = flattenAreaTree(nodes, collapsedKeys);
  // Header label aligns with the name text, past the caret + thumbnail columns.
  const nameHeaderIndent =
    NAME_CELL_PL_PX + CARET_COL_PX + THUMBNAIL_PX + 2 * CELL_GAP_PX;

  return (
    <Table.Root size="md" css={{ tableLayout: "fixed" }}>
      <Table.Header>
        <Table.Row>
          <Table.ColumnHeader
            {...columnHeaderStyle}
            pl={`${nameHeaderIndent}px`}
          >
            Area name
          </Table.ColumnHeader>
          <Table.ColumnHeader {...columnHeaderStyle} w="180px">
            Type
          </Table.ColumnHeader>
          <Table.ColumnHeader {...columnHeaderStyle} w="140px">
            Previous analyses
          </Table.ColumnHeader>
          <Table.ColumnHeader
            {...columnHeaderStyle}
            w="200px"
            textAlign="right"
          >
            Actions
          </Table.ColumnHeader>
        </Table.Row>
      </Table.Header>
      <Table.Body>
        {isLoading
          ? Array.from({ length: SKELETON_ROW_COUNT }, (_, i) => (
              <SkeletonRow key={i} />
            ))
          : visibleNodes.map((node) => (
              <AreaPickerRowView
                key={areaRowKey(node.row)}
                node={node}
                collapsed={collapsedKeys.has(areaRowKey(node.row))}
                onToggle={handleToggle}
                {...rowProps}
              />
            ))}
      </Table.Body>
    </Table.Root>
  );
}

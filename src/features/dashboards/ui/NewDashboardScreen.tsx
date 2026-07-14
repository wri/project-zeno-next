"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Box,
  Button,
  Flex,
  IconButton,
  Input,
  Menu,
  Portal,
  Spinner,
  Table,
  Text,
} from "@chakra-ui/react";
import {
  CaretRightIcon,
  DotsThreeVerticalIcon,
  MagnifyingGlassIcon,
  PolygonIcon,
  UploadSimpleIcon,
} from "@phosphor-icons/react";

import { useCustomAreasCreate } from "@/app/hooks/useCustomAreasCreate";
import {
  useCustomAreasDelete,
  useCustomAreasUpdate,
} from "@/app/hooks/useCustomAreasMutations";
import { ACCEPTED_FILE_TYPES } from "@/app/constants/custom-areas";
import { generateRandomName } from "@/app/utils/generateRandomName";
import { toaster } from "@/app/components/ui/toaster";

import { useAreaPickerRows } from "../hooks/useAreaPickerRows";
import { useCreateDashboard } from "../hooks/useCreateDashboard";
import { validateAreaUploadFile } from "../lib/validate-area-upload";
import {
  AREA_PICKER_SECTIONS,
  type AreaPickerSectionId,
} from "../model/dashboard-area";
import type { AreaPickerRow } from "../model/area-picker-rows";

const AREA_ICON_COLOR = "#2D6BE4";

const columnHeaderStyle = {
  fontFamily: "body",
  fontSize: "12px",
  fontWeight: "400",
  lineHeight: "16px",
  letterSpacing: "normal",
  color: "#656E7B",
  whiteSpace: "nowrap",
} as const;

const cellTextStyle = {
  fontFamily: "body",
  fontSize: "14px",
  fontWeight: "400",
  lineHeight: "16px",
  letterSpacing: "normal",
  color: "#656E7B",
} as const;

const cellSubtextStyle = { ...cellTextStyle, fontSize: "12px" } as const;

const CATEGORY_PILLS: { id: AreaPickerSectionId | "all"; label: string }[] = [
  { id: "all", label: "All categories" },
  ...AREA_PICKER_SECTIONS,
];

function rowToDashboardAoi(row: AreaPickerRow) {
  return {
    source: row.source,
    src_id: row.src_id,
    subtype: row.subtype,
    name: row.name,
  };
}

export function NewDashboardScreen() {
  const router = useRouter();
  const [activeCategory, setActiveCategory] = useState<
    AreaPickerSectionId | "all"
  >("all");
  const [search, setSearch] = useState("");
  const [creatingRowKey, setCreatingRowKey] = useState<string | null>(null);
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const uploadInputRef = useRef<HTMLInputElement>(null);

  const { rows, isLoading, hasNextPage, isFetchingNextPage, fetchNextPage } =
    useAreaPickerRows(activeCategory, search);
  const { createDashboardAsync } = useCreateDashboard();
  const { createAreaAsync, isCreating: isUploading } = useCustomAreasCreate();
  const { renameAreaAsync, isRenaming } = useCustomAreasUpdate();
  const { deleteAreaAsync, isDeleting } = useCustomAreasDelete();

  const rowKey = (row: AreaPickerRow) => `${row.source}:${row.src_id}`;

  const handleRowClick = async (row: AreaPickerRow) => {
    if (creatingRowKey) return;
    setCreatingRowKey(rowKey(row));
    try {
      const dashboard = await createDashboardAsync({
        aois: [rowToDashboardAoi(row)],
      });
      toaster.create({
        title: "Dashboard created",
        description: `"${dashboard.name}" is ready.`,
        type: "success",
        duration: 3000,
      });
      router.push(`/dashboards/${dashboard.id}?ff=dashboard`);
    } catch (err) {
      toaster.create({
        title: "Could not create dashboard",
        description: (err as Error).message,
        type: "error",
        duration: 5000,
      });
    } finally {
      setCreatingRowKey(null);
    }
  };

  const handleUploadFile = async (file: File) => {
    const validation = await validateAreaUploadFile(file);
    if (!validation.ok || !validation.polygons) {
      toaster.create({
        title: "Upload failed",
        description: validation.errorMessage,
        type: "error",
        duration: 4000,
      });
      return;
    }
    try {
      const result = await createAreaAsync({
        name: generateRandomName(),
        geometries: validation.polygons,
      });
      toaster.create({
        title: "Area uploaded",
        description: `"${result.name}" is ready to use.`,
        type: "success",
        duration: 3000,
      });
    } catch (err) {
      toaster.create({
        title: "Upload failed",
        description:
          (err as Error).message || "Failed to upload area. Please try again.",
        type: "error",
        duration: 4000,
      });
    }
  };

  const handleRename = async (areaId: string) => {
    const trimmed = renameValue.trim();
    if (!trimmed) return;
    try {
      await renameAreaAsync({ areaId, name: trimmed });
      setRenamingId(null);
      toaster.create({
        title: "Area renamed",
        type: "success",
        duration: 2500,
      });
    } catch (err) {
      toaster.create({
        title: "Rename failed",
        description: (err as Error).message,
        type: "error",
        duration: 4000,
      });
    }
  };

  const handleDelete = async (areaId: string, name: string) => {
    if (!window.confirm(`Delete "${name}"? This cannot be undone.`)) return;
    try {
      await deleteAreaAsync(areaId);
      toaster.create({
        title: "Area deleted",
        type: "success",
        duration: 2500,
      });
    } catch (err) {
      toaster.create({
        title: "Delete failed",
        description: (err as Error).message,
        type: "error",
        duration: 4000,
      });
    }
  };

  return (
    <>
      <Flex gap={3} mb={4} flexWrap="wrap">
        <Box position="relative" flex="1" minW="240px">
          <Input
            h="40px"
            pl="16px"
            pr="40px"
            borderRadius="4px"
            borderWidth="1px"
            borderColor="#C2C7D0"
            bg="#FFFFFF"
            boxShadow="0px 1px 2px -1px rgba(0, 0, 0, 0.1), 0px 1px 3px 0px rgba(0, 0, 0, 0.1)"
            fontFamily="body"
            fontSize="16px"
            fontWeight="400"
            lineHeight="150%"
            _placeholder={{ color: "#9AA3B2" }}
            placeholder="Search areas by name..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <MagnifyingGlassIcon
            size={16}
            color="#9AA3B2"
            style={{
              position: "absolute",
              right: 16,
              top: "50%",
              transform: "translateY(-50%)",
              pointerEvents: "none",
            }}
          />
        </Box>
        <input
          ref={uploadInputRef}
          type="file"
          accept={ACCEPTED_FILE_TYPES.join(",")}
          hidden
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) void handleUploadFile(file);
            e.target.value = "";
          }}
        />
        <Button
          variant="outline"
          h="40px"
          gap="8px"
          color="#0049AA"
          fontFamily="body"
          fontSize="14px"
          fontWeight="500"
          lineHeight="24px"
          letterSpacing="0%"
          onClick={() => uploadInputRef.current?.click()}
          loading={isUploading}
        >
          <UploadSimpleIcon size={16} weight="bold" color="#0049AA" />
          Upload GeoJSON
        </Button>
      </Flex>
      <Flex gap={2} mb={6} flexWrap="wrap">
        {CATEGORY_PILLS.map((pill) => {
          const isActive = activeCategory === pill.id;
          return (
            <Button
              key={pill.id}
              variant={isActive ? "solid" : "outline"}
              onClick={() => setActiveCategory(pill.id)}
              h="24px"
              minH="24px"
              px="8px"
              py="4px"
              gap="4px"
              borderRadius="9999px"
              fontFamily="body"
              fontSize="12px"
              fontWeight="500"
              lineHeight="16px"
              letterSpacing="0%"
              bg={isActive ? "#0049AA" : undefined}
              color={isActive ? "#FFFFFF" : undefined}
              borderColor={isActive ? "#0049AA" : undefined}
            >
              {pill.label}
            </Button>
          );
        })}
      </Flex>

      <Box
        borderWidth="1px"
        borderColor="#E1E2E6"
        borderRadius="4px"
        overflow="hidden"
      >
        <Table.Root size="md" css={{ tableLayout: "fixed" }}>
          <Table.Header>
            <Table.Row>
              <Table.ColumnHeader {...columnHeaderStyle} w="56px" pr={0} />
              <Table.ColumnHeader {...columnHeaderStyle}>
                Area name
              </Table.ColumnHeader>
              <Table.ColumnHeader {...columnHeaderStyle} w="180px">
                Type
              </Table.ColumnHeader>
              <Table.ColumnHeader
                {...columnHeaderStyle}
                w="160px"
                textAlign="center"
              >
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
            {rows.map((row) => {
              const key = rowKey(row);
              const isCustom = row.source === "custom";
              const isCreatingThisRow = creatingRowKey === key;
              const isRenamingThisRow = isCustom && renamingId === row.src_id;

              return (
                <Table.Row
                  key={key}
                  tabIndex={creatingRowKey || isRenamingThisRow ? -1 : 0}
                  aria-label={
                    isRenamingThisRow
                      ? undefined
                      : `Create dashboard for ${row.name}`
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
                    if (!isRenamingThisRow) void handleRowClick(row);
                  }}
                  onKeyDown={(e) => {
                    if (isRenamingThisRow || creatingRowKey) return;
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      void handleRowClick(row);
                    }
                  }}
                >
                  <Table.Cell pr={0}>
                    <Flex
                      w="40px"
                      h="40px"
                      borderRadius="4px"
                      bg="rgba(45, 107, 228, 0.08)"
                      align="center"
                      justify="center"
                      flexShrink={0}
                    >
                      <PolygonIcon size={20} color={AREA_ICON_COLOR} />
                    </Flex>
                  </Table.Cell>
                  <Table.Cell overflow="hidden">
                    {isRenamingThisRow ? (
                      <Input
                        size="sm"
                        value={renameValue}
                        onChange={(e) => setRenameValue(e.target.value)}
                        onClick={(e) => e.stopPropagation()}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") void handleRename(row.src_id);
                          if (e.key === "Escape") setRenamingId(null);
                        }}
                        autoFocus
                      />
                    ) : (
                      <Box minW={0}>
                        <Text
                          fontWeight="medium"
                          whiteSpace="nowrap"
                          overflow="hidden"
                          textOverflow="ellipsis"
                        >
                          {row.name}
                        </Text>
                        {!isCustom && row.subtype && (
                          <Text
                            {...cellSubtextStyle}
                            whiteSpace="nowrap"
                            overflow="hidden"
                            textOverflow="ellipsis"
                          >
                            {row.subtype}
                          </Text>
                        )}
                      </Box>
                    )}
                  </Table.Cell>
                  <Table.Cell>
                    <Text {...cellTextStyle}>{row.typeLabel}</Text>
                  </Table.Cell>
                  <Table.Cell textAlign="center">
                    <Text {...cellTextStyle}>{row.previousAnalyses}</Text>
                  </Table.Cell>
                  <Table.Cell>
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
                            letterSpacing="0%"
                            textAlign="center"
                            color="#0049AA"
                            whiteSpace="nowrap"
                          >
                            New dashboard
                          </Text>
                          <CaretRightIcon size={14} color="#0049AA" />
                        </Flex>
                      )}
                      {isCustom && (
                        <Menu.Root>
                          <Menu.Trigger asChild>
                            <IconButton
                              aria-label="Area actions"
                              variant="ghost"
                              size="xs"
                              disabled={isDeleting}
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
                                    setRenamingId(row.src_id);
                                    setRenameValue(row.name);
                                  }}
                                >
                                  Rename
                                </Menu.Item>
                                <Menu.Item
                                  value="delete"
                                  color="fg.error"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    void handleDelete(row.src_id, row.name);
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
                </Table.Row>
              );
            })}
          </Table.Body>
        </Table.Root>

        {isLoading && (
          <Flex justify="center" py={8}>
            <Spinner />
          </Flex>
        )}

        {!isLoading && rows.length === 0 && (
          <Box py={8} textAlign="center">
            <Text color="fg.muted">
              {search
                ? "No areas match your search."
                : "No areas found in this category."}
            </Text>
          </Box>
        )}

        {hasNextPage && (
          <Flex justify="center" py={4}>
            <Button
              size="sm"
              variant="outline"
              onClick={() => fetchNextPage()}
              loading={isFetchingNextPage}
            >
              Load more
            </Button>
          </Flex>
        )}
      </Box>

      {isRenaming && (
        <Text fontSize="xs" color="fg.muted" mt={2}>
          Saving name…
        </Text>
      )}
    </>
  );
}

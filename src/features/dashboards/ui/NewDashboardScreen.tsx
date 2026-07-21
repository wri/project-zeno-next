"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Box, Button, Flex, Input, Text } from "@chakra-ui/react";
import { MagnifyingGlassIcon, UploadSimpleIcon } from "@phosphor-icons/react";

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
import { areaRowKey, buildAreaPickerTree } from "../model/area-tree";
import { AreaPickerTable } from "./AreaPickerTable";

const CATEGORY_PILLS: { id: AreaPickerSectionId | "all"; label: string }[] = [
  { id: "all", label: "All categories" },
  ...AREA_PICKER_SECTIONS,
];

const SEARCH_DEBOUNCE_MS = 300;
// Below this the term is too low-signal for the fuzzy AOI search — keep
// showing the unfiltered browse list instead of firing requests.
const MIN_SEARCH_CHARS = 3;

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
  // Debounced so each keystroke doesn't fire a server-side AOI search.
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [creatingRowKey, setCreatingRowKey] = useState<string | null>(null);
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const uploadInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const timer = setTimeout(
      () => setDebouncedSearch(search),
      SEARCH_DEBOUNCE_MS
    );
    return () => clearTimeout(timer);
  }, [search]);

  // Search kicks in as the user types (no Enter needed) once the term reaches
  // MIN_SEARCH_CHARS; shorter terms fall back to the unfiltered browse list.
  const effectiveSearch =
    debouncedSearch.trim().length >= MIN_SEARCH_CHARS ? debouncedSearch : "";

  const {
    rows,
    isLoading,
    isSearching,
    hasNextPage,
    isFetchingNextPage,
    fetchNextPage,
  } = useAreaPickerRows(activeCategory, effectiveSearch);
  const { createDashboardAsync } = useCreateDashboard();
  const { createAreaAsync, isCreating: isUploading } = useCustomAreasCreate();
  const { renameAreaAsync, isRenaming } = useCustomAreasUpdate();
  const { deleteAreaAsync, isDeleting } = useCustomAreasDelete();

  // Admin areas nest under matched ancestors (Panama › Panamá › Panama City);
  // other sources stay flat.
  const tree = useMemo(() => buildAreaPickerTree(rows), [rows]);
  const hasNestedAreas = tree.some((node) => node.children.length > 0);
  const trimmedSearch = effectiveSearch.trim();
  const typedSearch = search.trim();
  const showMinSearchHint =
    typedSearch.length > 0 && typedSearch.length < MIN_SEARCH_CHARS;
  // One flag for both load flavours: the initial fetch and an in-flight
  // search whose stale keepPreviousData rows shouldn't be shown as results.
  const showSkeletons = isLoading || isSearching;

  const handleRowSelect = async (row: AreaPickerRow) => {
    if (creatingRowKey) return;
    setCreatingRowKey(areaRowKey(row));
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

  const handleDelete = async (row: AreaPickerRow) => {
    if (!window.confirm(`Delete "${row.name}"? This cannot be undone.`)) return;
    try {
      await deleteAreaAsync(row.src_id);
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
          Upload shapefile
        </Button>
      </Flex>
      {showMinSearchHint && (
        <Text fontSize="xs" color="fg.muted" mt={-2} mb={4}>
          Type at least {MIN_SEARCH_CHARS} characters to search.
        </Text>
      )}
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
        <AreaPickerTable
          nodes={tree}
          isLoading={showSkeletons}
          searchTerm={effectiveSearch}
          creatingRowKey={creatingRowKey}
          renamingId={renamingId}
          renameValue={renameValue}
          isDeleting={isDeleting}
          onSelect={(row) => void handleRowSelect(row)}
          onRenameStart={(row) => {
            setRenamingId(row.src_id);
            setRenameValue(row.name);
          }}
          onRenameChange={setRenameValue}
          onRenameSubmit={(areaId) => void handleRename(areaId)}
          onRenameCancel={() => setRenamingId(null)}
          onDelete={(row) => void handleDelete(row)}
        />

        {!showSkeletons && rows.length === 0 && (
          <Box py={8} textAlign="center">
            <Text color="fg.muted">
              {trimmedSearch
                ? "No areas match your search."
                : "No areas found in this category."}
            </Text>
          </Box>
        )}

        {!showSkeletons && hasNextPage && (
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

      {trimmedSearch && !showSkeletons && rows.length > 0 && (
        <Text
          mt="10px"
          fontFamily="mono"
          fontSize="11px"
          letterSpacing="0.4px"
          color="#9AA3B2"
          textTransform="uppercase"
        >
          Showing
          {hasNextPage ? "+" : ""} {rows.length === 1 ? "area" : "areas"}{" "}
          matching &ldquo;{trimmedSearch}&rdquo;
          {hasNestedAreas ? " · expand or select any level" : ""}
        </Text>
      )}

      {isRenaming && (
        <Text fontSize="xs" color="fg.muted" mt={2}>
          Saving name…
        </Text>
      )}
    </>
  );
}

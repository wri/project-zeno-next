"use client";

import { useCallback, useMemo, useRef, useState } from "react";
import {
  Box,
  Button,
  Flex,
  Input,
  Spinner,
  Tag,
  Text,
  VStack,
} from "@chakra-ui/react";
import {
  CaretDownIcon,
  CaretRightIcon,
  GlobeIcon,
  MagnifyingGlassIcon,
} from "@phosphor-icons/react";

import {
  GADM_COUNTRIES,
  GADM_CODE_TO_NAME,
  type GadmCountry,
} from "../constants/gadmCountries";
import { AREA_CHILDREN_FIXTURES } from "../constants/areaFixtures";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** A selected area with its display name and wire-format ID. */
export interface SelectedArea {
  /** Wire-format ID sent to the backend, e.g. "gadm:BRA" or "gadm:BRA.1". */
  areaId: string;
  /** Human-readable label, e.g. "Brazil" or "Acre". */
  label: string;
  /** Parent country code if this is a sub-region, e.g. "BRA". */
  parentCode?: string;
}

/** Child area returned by the hierarchy API. */
interface ChildArea {
  code: string;
  name: string;
  subtype: string;
}

/** Cached result for a country's children. */
interface ChildrenCache {
  children: ChildArea[];
  loading: boolean;
  error: string | null;
}

interface AreaPickerProps {
  value: SelectedArea[];
  onChange: (areas: SelectedArea[]) => void;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function AreaPicker({ value, onChange }: AreaPickerProps) {
  const [query, setQuery] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Track which countries have their sub-regions expanded
  const [expandedCountries, setExpandedCountries] = useState<Set<string>>(
    new Set(),
  );

  // Cache children data per country code
  const [childrenCache, setChildrenCache] = useState<
    Map<string, ChildrenCache>
  >(new Map());

  // Filtered suggestions based on search query
  const suggestions = useMemo(() => {
    if (!query.trim()) return [];
    const q = query.toLowerCase();
    const selectedCodes = new Set(value.map((v) => v.areaId));
    return GADM_COUNTRIES.filter(
      (c) =>
        !selectedCodes.has(`gadm:${c.code}`) &&
        (c.name.toLowerCase().includes(q) || c.code.toLowerCase().includes(q)),
    ).slice(0, 12);
  }, [query, value]);

  // Get the country-level selections (not sub-regions)
  const selectedCountries = useMemo(
    () => value.filter((v) => !v.parentCode),
    [value],
  );

  const addArea = useCallback(
    (country: GadmCountry) => {
      const area: SelectedArea = {
        areaId: `gadm:${country.code}`,
        label: country.name,
      };
      if (value.some((v) => v.areaId === area.areaId)) return;
      onChange([...value, area]);
      setQuery("");
      setIsOpen(false);
      inputRef.current?.focus();
    },
    [value, onChange],
  );

  const removeArea = useCallback(
    (areaId: string) => {
      // When removing a country, also remove all its sub-regions
      const area = value.find((v) => v.areaId === areaId);
      if (area && !area.parentCode) {
        // This is a country — extract its code
        const code = areaId.replace("gadm:", "");
        onChange(
          value.filter((v) => v.areaId !== areaId && v.parentCode !== code),
        );
        // Collapse expanded sub-regions
        setExpandedCountries((prev) => {
          const next = new Set(prev);
          next.delete(code);
          return next;
        });
      } else {
        onChange(value.filter((v) => v.areaId !== areaId));
      }
    },
    [value, onChange],
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === "Backspace" && !query && value.length > 0) {
        removeArea(value[value.length - 1].areaId);
        return;
      }
      if (e.key === "Enter" && suggestions.length > 0) {
        e.preventDefault();
        addArea(suggestions[0]);
        return;
      }
      if (e.key === "Escape") {
        setIsOpen(false);
        setQuery("");
      }
    },
    [query, value, suggestions, addArea, removeArea],
  );

  const handleBlur = useCallback((e: React.FocusEvent) => {
    if (
      containerRef.current &&
      !containerRef.current.contains(e.relatedTarget as Node)
    ) {
      setTimeout(() => setIsOpen(false), 150);
    }
  }, []);

  // ------------------------------------------
  // Load children for a country from fixtures
  // ------------------------------------------
  const fetchChildren = useCallback((countryCode: string) => {
    const fixture = AREA_CHILDREN_FIXTURES[countryCode];
    if (fixture) {
      setChildrenCache((prev) => {
        const next = new Map(prev);
        next.set(countryCode, {
          children: fixture.children,
          loading: false,
          error: null,
        });
        return next;
      });
    } else {
      setChildrenCache((prev) => {
        const next = new Map(prev);
        next.set(countryCode, {
          children: [],
          loading: false,
          error: "Sub-regions not available for this country in demo mode.",
        });
        return next;
      });
    }
  }, []);

  // ------------------------------------------
  // Toggle sub-region expansion for a country
  // ------------------------------------------
  const toggleExpand = useCallback(
    (countryCode: string) => {
      setExpandedCountries((prev) => {
        const next = new Set(prev);
        if (next.has(countryCode)) {
          next.delete(countryCode);
        } else {
          next.add(countryCode);
          // Fetch children if not cached
          if (!childrenCache.has(countryCode)) {
            fetchChildren(countryCode);
          }
        }
        return next;
      });
    },
    [childrenCache, fetchChildren],
  );

  // ------------------------------------------
  // Toggle a sub-region selection
  // ------------------------------------------
  const toggleSubRegion = useCallback(
    (child: ChildArea, parentCode: string) => {
      const areaId = `gadm:${child.code}`;
      const existing = value.find((v) => v.areaId === areaId);
      if (existing) {
        onChange(value.filter((v) => v.areaId !== areaId));
      } else {
        onChange([
          ...value,
          {
            areaId,
            label: child.name,
            parentCode,
          },
        ]);
      }
    },
    [value, onChange],
  );

  // Select/deselect all sub-regions for a country
  const toggleAllSubRegions = useCallback(
    (countryCode: string, children: ChildArea[]) => {
      const childAreaIds = new Set(children.map((c) => `gadm:${c.code}`));
      const allSelected = children.every((c) =>
        value.some((v) => v.areaId === `gadm:${c.code}`),
      );

      if (allSelected) {
        // Deselect all
        onChange(value.filter((v) => !childAreaIds.has(v.areaId)));
      } else {
        // Select all missing
        const existing = new Set(value.map((v) => v.areaId));
        const toAdd: SelectedArea[] = children
          .filter((c) => !existing.has(`gadm:${c.code}`))
          .map((c) => ({
            areaId: `gadm:${c.code}`,
            label: c.name,
            parentCode: countryCode,
          }));
        onChange([...value, ...toAdd]);
      }
    },
    [value, onChange],
  );

  return (
    <VStack align="stretch" gap={1} ref={containerRef} position="relative">
      {/* Input area with tags */}
      <Box
        border="1px solid"
        borderColor={isOpen ? "primary.300" : "border"}
        rounded="md"
        px={2}
        py={1.5}
        bg="bg"
        cursor="text"
        transition="border-color 0.15s"
        _hover={{ borderColor: isOpen ? "primary.300" : "border.emphasized" }}
        onClick={() => inputRef.current?.focus()}
      >
        <Flex flexWrap="wrap" gap={1.5} align="center">
          {/* Selected area tags (country-level only) */}
          {selectedCountries.map((area) => {
            const code = area.areaId.replace("gadm:", "");
            const subCount = value.filter((v) => v.parentCode === code).length;
            return (
              <Tag.Root
                key={area.areaId}
                size="sm"
                variant="subtle"
                colorPalette="primary"
              >
                <Tag.StartElement>
                  <GlobeIcon size={12} />
                </Tag.StartElement>
                <Tag.Label>
                  {area.label}
                  {subCount > 0 && (
                    <Text as="span" fontSize="xs" color="primary.fg" ml={1}>
                      +{subCount} region{subCount !== 1 ? "s" : ""}
                    </Text>
                  )}
                </Tag.Label>
                <Tag.EndElement>
                  <Tag.CloseTrigger
                    onClick={(e) => {
                      e.stopPropagation();
                      removeArea(area.areaId);
                    }}
                    cursor="pointer"
                    borderRadius="sm"
                    _hover={{ bg: "primary.muted" }}
                  />
                </Tag.EndElement>
              </Tag.Root>
            );
          })}

          {/* Search input */}
          <Input
            ref={inputRef}
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setIsOpen(true);
            }}
            onFocus={() => {
              if (query.trim()) setIsOpen(true);
            }}
            onBlur={handleBlur}
            onKeyDown={handleKeyDown}
            placeholder={
              value.length === 0 ? "Search countries…" : "Add another…"
            }
            variant="flushed"
            size="sm"
            flex={1}
            minW="120px"
            h="auto"
            py={0.5}
            borderBottom="none"
            _focus={{ borderBottom: "none", boxShadow: "none" }}
          />
        </Flex>
      </Box>

      {/* Suggestions dropdown */}
      {isOpen && suggestions.length > 0 && (
        <Box
          position="absolute"
          top="100%"
          left={0}
          right={0}
          mt={1}
          bg="bg.panel"
          border="1px solid"
          borderColor="border"
          rounded="md"
          shadow="md"
          zIndex={10}
          maxH="240px"
          overflowY="auto"
        >
          {suggestions.map((country) => (
            <Flex
              key={country.code}
              px={3}
              py={2}
              align="center"
              gap={2}
              cursor="pointer"
              _hover={{ bg: "bg.subtle" }}
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => addArea(country)}
            >
              <MagnifyingGlassIcon
                size={14}
                color="var(--chakra-colors-fg-subtle)"
              />
              <Text fontSize="sm" flex={1}>
                {highlightMatch(country.name, query)}
              </Text>
              <Text fontSize="xs" fontFamily="mono" color="fg.subtle">
                {country.code}
              </Text>
            </Flex>
          ))}
        </Box>
      )}

      {/* No results */}
      {isOpen && query.trim() && suggestions.length === 0 && (
        <Box
          position="absolute"
          top="100%"
          left={0}
          right={0}
          mt={1}
          bg="bg.panel"
          border="1px solid"
          borderColor="border"
          rounded="md"
          shadow="md"
          zIndex={10}
          px={3}
          py={2}
        >
          <Text fontSize="sm" color="fg.muted">
            No countries match &ldquo;{query}&rdquo;
          </Text>
        </Box>
      )}

      {/* ---- Sub-region panels for selected countries ---- */}
      {selectedCountries.length > 0 && (
        <VStack gap={0} align="stretch" mt={2}>
          {selectedCountries.map((area) => {
            const code = area.areaId.replace("gadm:", "");
            const isExpanded = expandedCountries.has(code);
            const cached = childrenCache.get(code);

            return (
              <Box
                key={code}
                border="1px solid"
                borderColor="border.muted"
                rounded="md"
                overflow="hidden"
                mb={2}
              >
                {/* Country header with expand toggle */}
                <Flex
                  as="button"
                  w="full"
                  px={3}
                  py={2}
                  align="center"
                  gap={2}
                  bg="bg.subtle"
                  cursor="pointer"
                  _hover={{ bg: "bg.muted" }}
                  transition="background 0.1s"
                  onClick={() => toggleExpand(code)}
                >
                  {isExpanded ? (
                    <CaretDownIcon size={14} />
                  ) : (
                    <CaretRightIcon size={14} />
                  )}
                  <GlobeIcon size={14} />
                  <Text
                    fontSize="sm"
                    fontWeight="medium"
                    flex={1}
                    textAlign="left"
                  >
                    {area.label}
                  </Text>
                  <Text fontSize="xs" color="fg.muted">
                    {isExpanded ? "Hide regions" : "Select states/regions"}
                  </Text>
                </Flex>

                {/* Expanded children list */}
                {isExpanded && (
                  <Box
                    px={3}
                    py={2}
                    borderTop="1px solid"
                    borderColor="border.muted"
                  >
                    {/* Loading */}
                    {cached?.loading && (
                      <Flex align="center" gap={2} py={2}>
                        <Spinner size="xs" />
                        <Text fontSize="xs" color="fg.muted">
                          Loading regions for {area.label}…
                        </Text>
                      </Flex>
                    )}

                    {/* Error */}
                    {cached?.error && (
                      <VStack gap={2} align="stretch" py={1}>
                        <Text fontSize="xs" color="fg.error">
                          {cached.error}
                        </Text>
                        <Button
                          size="xs"
                          variant="outline"
                          onClick={(e) => {
                            e.stopPropagation();
                            fetchChildren(code);
                          }}
                        >
                          Retry
                        </Button>
                      </VStack>
                    )}

                    {/* Children loaded */}
                    {cached && !cached.loading && !cached.error && (
                      <>
                        {cached.children.length === 0 ? (
                          <Text fontSize="xs" color="fg.muted" py={1}>
                            No sub-regions available for {area.label}.
                          </Text>
                        ) : (
                          <VStack gap={0} align="stretch">
                            {/* Select all toggle */}
                            <Flex
                              align="center"
                              gap={2}
                              py={1.5}
                              borderBottom="1px solid"
                              borderColor="border.muted"
                              mb={1}
                            >
                              <Button
                                size="xs"
                                variant="ghost"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  toggleAllSubRegions(code, cached.children);
                                }}
                              >
                                {cached.children.every((c) =>
                                  value.some(
                                    (v) => v.areaId === `gadm:${c.code}`,
                                  ),
                                )
                                  ? "Deselect all"
                                  : "Select all"}
                              </Button>
                              <Text fontSize="xs" color="fg.muted" ml="auto">
                                {cached.children.length} region
                                {cached.children.length !== 1 ? "s" : ""}
                                {" · "}
                                {
                                  value.filter((v) => v.parentCode === code)
                                    .length
                                }{" "}
                                selected
                              </Text>
                            </Flex>

                            {/* Children checkboxes */}
                            <Box
                              maxH="200px"
                              overflowY="auto"
                              display="grid"
                              gridTemplateColumns={{
                                base: "1fr",
                                md: "1fr 1fr",
                              }}
                              gap={0}
                            >
                              {cached.children.map((child) => {
                                const isSelected = value.some(
                                  (v) => v.areaId === `gadm:${child.code}`,
                                );
                                return (
                                  <Flex
                                    key={child.code}
                                    as="label"
                                    px={2}
                                    py={1}
                                    align="center"
                                    gap={2}
                                    cursor="pointer"
                                    rounded="sm"
                                    _hover={{ bg: "bg.subtle" }}
                                    transition="background 0.1s"
                                  >
                                    <input
                                      type="checkbox"
                                      checked={isSelected}
                                      onChange={() =>
                                        toggleSubRegion(child, code)
                                      }
                                      style={{
                                        accentColor:
                                          "var(--chakra-colors-primary-500)",
                                      }}
                                    />
                                    <Text fontSize="xs" lineClamp={1} flex={1}>
                                      {child.name}
                                    </Text>
                                    <Text
                                      fontSize="xs"
                                      fontFamily="mono"
                                      color="fg.subtle"
                                    >
                                      {child.code}
                                    </Text>
                                  </Flex>
                                );
                              })}
                            </Box>
                          </VStack>
                        )}
                      </>
                    )}
                  </Box>
                )}
              </Box>
            );
          })}
        </VStack>
      )}
    </VStack>
  );
}

// ---------------------------------------------------------------------------
// Highlight matching portion of text
// ---------------------------------------------------------------------------

function highlightMatch(text: string, query: string): React.ReactNode {
  if (!query.trim()) return text;
  const idx = text.toLowerCase().indexOf(query.toLowerCase());
  if (idx === -1) return text;
  const before = text.slice(0, idx);
  const match = text.slice(idx, idx + query.length);
  const after = text.slice(idx + query.length);
  return (
    <>
      {before}
      <Text as="span" fontWeight="semibold" color="primary.fg">
        {match}
      </Text>
      {after}
    </>
  );
}

// ---------------------------------------------------------------------------
// Utility: parse legacy "gadm:BRA" strings back to SelectedArea
// ---------------------------------------------------------------------------

export function areaIdToSelectedArea(areaId: string): SelectedArea {
  const [source, code] = areaId.split(":");
  if (source === "gadm" && code) {
    const name = GADM_CODE_TO_NAME[code];
    return { areaId, label: name ?? code };
  }
  return { areaId, label: areaId };
}

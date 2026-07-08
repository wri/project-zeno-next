"use client";
import { useMemo, useState } from "react";
import { Box, Button, Flex, Input, Text } from "@chakra-ui/react";
import {
  CaretDownIcon,
  CheckIcon,
  MagnifyingGlassIcon,
  TranslateIcon,
  XCircleIcon,
} from "@phosphor-icons/react";
import {
  VOICE_LANGUAGE_FAMILIES,
  type VoiceLanguageFamily,
} from "@/app/utils/speechLang";

const TOTAL_COUNT = VOICE_LANGUAGE_FAMILIES.reduce(
  (n, f) => n + (f.variants ? f.variants.length : 1),
  0
);

const COMMON_FAMILIES = VOICE_LANGUAGE_FAMILIES.filter((f) => f.common);
const SORTED_FAMILIES = [...VOICE_LANGUAGE_FAMILIES].sort((a, b) =>
  a.base.localeCompare(b.base)
);

function familyMatches(f: VoiceLanguageFamily, q: string): boolean {
  const haystack = [
    f.base,
    f.native,
    ...(f.variants?.flatMap((v) => [v.name, v.tag]) ?? []),
  ];
  return haystack.some((s) => s.toLowerCase().includes(q));
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <Text
      fontFamily="mono"
      fontSize="9.5px"
      letterSpacing="0.5px"
      textTransform="uppercase"
      color="gray.500"
      px="2.5"
      pt="1.5"
      pb="1"
    >
      {children}
    </Text>
  );
}

function LanguageIcon({ children }: { children: React.ReactNode }) {
  return (
    <Box as="span" display="inline-flex" color="gray.500">
      {children}
    </Box>
  );
}

/**
 * Searchable language picker: a "Common" shortlist (with regional variant
 * chips) shown first, an expander to the full alphabetical list, live search,
 * and an empty state. Selecting a language calls `onChange` with its BCP-47 tag.
 */
export default function ShortlistLanguagePicker({
  value,
  onChange,
}: {
  value: string;
  onChange: (code: string) => void;
}) {
  const [query, setQuery] = useState("");
  const [expanded, setExpanded] = useState(false);
  const q = query.trim().toLowerCase();
  const hasQuery = q.length > 0;
  const showCommon = !hasQuery && !expanded;

  const filtered = useMemo(
    () =>
      hasQuery
        ? SORTED_FAMILIES.filter((f) => familyMatches(f, q))
        : SORTED_FAMILIES,
    [hasQuery, q]
  );

  const renderFamily = (f: VoiceLanguageFamily) => {
    if (f.variants) {
      const anyActive = f.variants.some((v) => v.code === value);
      return (
        <Flex key={f.base} flexDir="column" gap="1.5" px="2.5" py="1.5">
          <Button
            type="button"
            variant="plain"
            h="auto"
            p="0"
            justifyContent="space-between"
            gap="2"
            onClick={() => onChange(f.variants![0].code)}
          >
            <Text as="span" fontSize="12.5px" color="fg" whiteSpace="nowrap">
              {f.base}
            </Text>
            <Flex align="center" gap="1.5">
              <Text
                as="span"
                fontSize="11.5px"
                color="gray.500"
                whiteSpace="nowrap"
              >
                {f.native}
              </Text>
              {anyActive && (
                <Box as="span" color="primary.solid" display="inline-flex">
                  <CheckIcon size={13} weight="bold" />
                </Box>
              )}
            </Flex>
          </Button>
          <Flex wrap="wrap" gap="1.5">
            {f.variants.map((v) => {
              const on = v.code === value;
              return (
                <Button
                  key={v.code}
                  type="button"
                  variant="plain"
                  h="auto"
                  px="2"
                  py="0.5"
                  borderRadius="full"
                  borderWidth="1px"
                  borderColor={on ? "primary.solid" : "border.emphasized"}
                  bg={on ? "primary.solid" : "white"}
                  color={on ? "white" : "fg.muted"}
                  fontSize="11px"
                  fontWeight="normal"
                  onClick={() => onChange(v.code)}
                >
                  {v.tag}
                </Button>
              );
            })}
          </Flex>
        </Flex>
      );
    }

    const on = f.code === value;
    return (
      <Button
        key={f.base}
        type="button"
        variant="plain"
        w="full"
        h="auto"
        justifyContent="space-between"
        gap="2"
        px="2.5"
        py="1.5"
        borderRadius="md"
        bg={on ? "primary.25" : "transparent"}
        _hover={{ bg: "gray.100" }}
        onClick={() => onChange(f.code as string)}
      >
        <Text as="span" fontSize="12.5px" color="fg" whiteSpace="nowrap">
          {f.base}
        </Text>
        <Flex align="center" gap="1.5">
          <Text
            as="span"
            fontSize="11.5px"
            color="gray.500"
            whiteSpace="nowrap"
          >
            {f.native}
          </Text>
          {on && (
            <Box as="span" color="primary.solid" display="inline-flex">
              <CheckIcon size={13} weight="bold" />
            </Box>
          )}
        </Flex>
      </Button>
    );
  };

  return (
    <Box w="262px" maxW="100%">
      {/* Search */}
      <Box p="1.5" borderBottomWidth="1px" borderColor="gray.100">
        <Flex
          align="center"
          gap="1.5"
          px="2"
          py="1.5"
          bg="gray.50"
          borderWidth="1px"
          borderColor="gray.100"
          borderRadius="md"
        >
          <LanguageIcon>
            <MagnifyingGlassIcon size={13} />
          </LanguageIcon>
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={`Search ${TOTAL_COUNT} languages`}
            aria-label="Search languages"
            autoFocus
            flex="1"
            minW="0"
            border="none"
            bg="transparent"
            h="auto"
            p="0"
            fontSize="12.5px"
            _focus={{ outline: "none", boxShadow: "none" }}
            _focusVisible={{ outline: "none", boxShadow: "none" }}
          />
          {hasQuery && (
            <Button
              type="button"
              variant="plain"
              p="0"
              h="auto"
              minW="0"
              color="gray.500"
              aria-label="Clear search"
              onClick={() => setQuery("")}
            >
              <XCircleIcon size={14} />
            </Button>
          )}
        </Flex>
      </Box>

      {/* List */}
      <Box maxH="280px" overflowY="auto" p="1">
        {showCommon ? (
          <>
            <SectionLabel>Common</SectionLabel>
            {COMMON_FAMILIES.map(renderFamily)}
            <Button
              type="button"
              variant="plain"
              w="full"
              h="auto"
              justifyContent="space-between"
              gap="2"
              mt="0.5"
              px="2.5"
              py="1.5"
              borderTopWidth="1px"
              borderColor="gray.100"
              borderRadius="0"
              onClick={() => setExpanded(true)}
            >
              <Text
                as="span"
                fontSize="12px"
                fontWeight="medium"
                color="primary.solid"
              >
                Show all {TOTAL_COUNT} languages
              </Text>
              <Box as="span" color="primary.solid" display="inline-flex">
                <CaretDownIcon size={12} />
              </Box>
            </Button>
          </>
        ) : filtered.length > 0 ? (
          <>
            <SectionLabel>
              {hasQuery
                ? `${filtered.length} result${filtered.length === 1 ? "" : "s"}`
                : "All languages"}
            </SectionLabel>
            {filtered.map(renderFamily)}
          </>
        ) : (
          <Flex flexDir="column" align="center" py="5" px="3">
            <Box as="span" color="gray.400">
              <TranslateIcon size={18} />
            </Box>
            <Text fontSize="12px" color="fg.muted" mt="1.5" textAlign="center">
              No languages match “{query}”
            </Text>
          </Flex>
        )}
      </Box>
    </Box>
  );
}

"use client";

import { useMemo, useState } from "react";
import {
  Box,
  Flex,
  Text,
  Input,
  InputGroup,
  IconButton,
} from "@chakra-ui/react";
import {
  StackIcon,
  MagnifyingGlassIcon,
  XIcon,
  DatabaseIcon,
} from "@phosphor-icons/react";
import { chatPanelCardStyle } from "@/app/chatPanelShared";
import { toaster } from "@/app/components/ui/toaster";
import { DATASET_CARDS } from "@/app/constants/datasets";

// Data Catalogue side panel: a browsable list of datasets, mirroring the Areas
// panel's chrome. Selecting a dataset is a prototype stub (no widget kind for
// raw datasets yet) — it surfaces a toast so the flow reads end-to-end.

function Thumb() {
  return (
    <Flex
      w="64px"
      flexShrink={0}
      align="center"
      justify="center"
      alignSelf="stretch"
      bgGradient="to-br"
      gradientFrom="blue.100"
      gradientTo="green.100"
      color="fg.link"
      borderRightWidth="1px"
      borderColor="rgba(19,22,25,0.1)"
    >
      <DatabaseIcon size={24} />
    </Flex>
  );
}

export default function DashboardCataloguePanel({
  onClose,
}: {
  onClose: () => void;
}) {
  const [query, setQuery] = useState("");

  const datasets = useMemo(() => {
    const q = query.trim().toLowerCase();
    return q
      ? DATASET_CARDS.filter((d) => d.dataset_name.toLowerCase().includes(q))
      : DATASET_CARDS;
  }, [query]);

  const select = (name: string) =>
    toaster.create({
      title: "Dataset selected — prototype",
      description: name,
      type: "info",
      duration: 2000,
    });

  return (
    <Flex
      flexDir="column"
      h="100%"
      w="100%"
      {...chatPanelCardStyle}
      borderRadius={0}
      borderWidth={0}
      bg="bg"
    >
      {/* Header */}
      <Flex
        h="40px"
        px={3}
        align="center"
        justify="space-between"
        borderBottomWidth="1px"
        borderColor="border"
        flexShrink={0}
      >
        <Flex align="center" gap={2} color="neutral.500">
          <StackIcon size={16} />
          <Text
            fontFamily="mono"
            fontSize="10px"
            letterSpacing="0.3px"
            textTransform="uppercase"
          >
            Data Catalogue
          </Text>
        </Flex>
        <IconButton
          aria-label="Close data catalogue"
          size="xs"
          variant="ghost"
          color="neutral.500"
          onClick={onClose}
        >
          <XIcon size={16} />
        </IconButton>
      </Flex>

      {/* Body */}
      <Box flex="1 1 auto" overflowY="auto" px={4} py={3}>
        <Text fontSize="sm" color="fg" mb={3}>
          Browse datasets to explore on this dashboard.
        </Text>

        <InputGroup mb={3} endElement={<MagnifyingGlassIcon size={16} />}>
          <Input
            size="sm"
            bg="bg"
            placeholder="Find a dataset"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </InputGroup>

        {datasets.length === 0 ? (
          <Text fontSize="sm" color="fg.muted" py={6} textAlign="center">
            No datasets match your search.
          </Text>
        ) : (
          <Flex flexDir="column" gap={2}>
            {datasets.map((d) => (
              <Box
                key={d.dataset_id}
                as="button"
                onClick={() => select(d.dataset_name)}
                textAlign="left"
                w="full"
                borderWidth="1px"
                borderColor="#DDE2F5"
                bg="#FFFFFF"
                rounded="4px"
                overflow="hidden"
                cursor="pointer"
                transition="border-color 0.15s ease, background 0.15s ease"
                _hover={{ bg: "#F0F4FF", borderColor: "#0049AA" }}
              >
                <Flex align="stretch">
                  <Thumb />
                  <Flex
                    flex="1 1 auto"
                    minW={0}
                    direction="column"
                    px={4}
                    py={3}
                    gap={1}
                  >
                    <Text
                      fontWeight="medium"
                      fontSize="12px"
                      lineHeight="1.5"
                      color="#3A4048"
                      lineClamp={2}
                    >
                      {d.dataset_name}
                    </Text>
                    {d.description && (
                      <Text
                        fontFamily="mono"
                        fontSize="10px"
                        color="#656E7B"
                        lineClamp={2}
                      >
                        {d.description}
                      </Text>
                    )}
                  </Flex>
                </Flex>
              </Box>
            ))}
          </Flex>
        )}
      </Box>
    </Flex>
  );
}

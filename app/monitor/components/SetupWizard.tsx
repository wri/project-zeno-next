"use client";

import { useState } from "react";
import {
  Badge,
  Box,
  Button,
  Field,
  Flex,
  Heading,
  HStack,
  Separator,
  Text,
  VStack,
} from "@chakra-ui/react";
import {
  ArrowLeftIcon,
  ArrowRightIcon,
  GlobeIcon,
  ListChecksIcon,
  RocketLaunchIcon,
} from "@phosphor-icons/react";

import { DATASETS, DATASET_TOPICS } from "../constants/datasets";
import type { MultiDatasetFormValues } from "../types/stream";
import { getDateRangeForDataset } from "../utils/dateRange";
import AreaPicker, {
  areaIdToSelectedArea,
  type SelectedArea,
} from "./AreaPicker";

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface SetupWizardProps {
  onSubmit: (values: MultiDatasetFormValues) => void;
}

// ---------------------------------------------------------------------------
// Step configuration (2 steps — date range is auto-determined)
// ---------------------------------------------------------------------------

const STEPS = [
  { id: 1, label: "Areas", icon: GlobeIcon, description: "Select countries and regions" },
  { id: 2, label: "Datasets", icon: ListChecksIcon, description: "Choose datasets to analyze" },
] as const;

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function SetupWizard({ onSubmit }: SetupWizardProps) {
  const [step, setStep] = useState(1);
  const [selectedAreas, setSelectedAreas] = useState<SelectedArea[]>([
    areaIdToSelectedArea("gadm:BRA"),
  ]);
  const [selectedDatasets, setSelectedDatasets] = useState<Set<number>>(
    new Set([4]),
  );

  const canAdvance = () => {
    switch (step) {
      case 1: return selectedAreas.length > 0;
      case 2: return selectedDatasets.size > 0;
      default: return false;
    }
  };

  const handleNext = () => {
    if (step < 2) {
      setStep(step + 1);
    } else {
      // Final step — submit with auto-determined date ranges
      // Use the widest range across all selected datasets
      const datasetIds = [...selectedDatasets].sort((a, b) => a - b);
      let earliestStart = "9999-12-31";
      let latestEnd = "0000-01-01";
      for (const id of datasetIds) {
        const { startDate, endDate } = getDateRangeForDataset(id);
        if (startDate < earliestStart) earliestStart = startDate;
        if (endDate > latestEnd) latestEnd = endDate;
      }

      onSubmit({
        datasetIds,
        areaIds: selectedAreas.map((a) => a.areaId),
        startDate: earliestStart,
        endDate: latestEnd,
        prompt: "",
      });
    }
  };

  const handleBack = () => {
    if (step > 1) setStep(step - 1);
  };

  const toggleDataset = (id: number) => {
    setSelectedDatasets((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  return (
    <Box>
      {/* Step indicator */}
      <HStack gap={0} mb={8} justify="center">
        {STEPS.map((s, i) => {
          const isActive = s.id === step;
          const isDone = s.id < step;
          const Icon = s.icon;
          return (
            <HStack key={s.id} gap={0}>
              {i > 0 && (
                <Box
                  w={12}
                  h="2px"
                  bg={isDone ? "primary.solid" : "border.muted"}
                  transition="background 0.2s"
                />
              )}
              <Flex
                align="center"
                gap={2}
                px={4}
                py={2}
                rounded="full"
                bg={isActive ? "primary.subtle" : isDone ? "primary.muted" : "bg.subtle"}
                border="2px solid"
                borderColor={isActive ? "primary.solid" : isDone ? "primary.muted" : "border.muted"}
                cursor={isDone ? "pointer" : "default"}
                onClick={() => { if (isDone) setStep(s.id); }}
                transition="all 0.2s"
              >
                <Icon size={16} weight={isActive ? "bold" : "regular"} />
                <Text
                  fontSize="sm"
                  fontWeight={isActive ? "semibold" : "normal"}
                  color={isActive ? "primary.fg" : isDone ? "fg" : "fg.muted"}
                >
                  {s.label}
                </Text>
                {isDone && (
                  <Badge size="xs" colorPalette="green" variant="subtle">✓</Badge>
                )}
              </Flex>
            </HStack>
          );
        })}
      </HStack>

      {/* Step content */}
      <Box minH="300px">
        {/* Step 1: Area Selection */}
        {step === 1 && (
          <VStack gap={6} align="stretch">
            <Box>
              <Heading size="md" mb={1}>Select Areas of Interest</Heading>
              <Text color="fg.muted" fontSize="sm">
                Search and select the countries you want to analyze. Sub-region selection
                will be available in a future update.
              </Text>
            </Box>

            <Field.Root>
              <Field.Label>Countries &amp; Regions</Field.Label>
              <AreaPicker value={selectedAreas} onChange={setSelectedAreas} />
              <Field.HelperText>
                {(() => {
                  const countries = selectedAreas.filter(a => !a.parentCode).length;
                  const regions = selectedAreas.filter(a => a.parentCode).length;
                  const parts: string[] = [];
                  if (countries > 0) parts.push(`${countries} countr${countries !== 1 ? "ies" : "y"}`);
                  if (regions > 0) parts.push(`${regions} sub-region${regions !== 1 ? "s" : ""}`);
                  return parts.length > 0 ? `${parts.join(", ")} selected` : "No areas selected";
                })()}
                . Click &quot;Select states/regions&quot; under a country to add sub-regions.
              </Field.HelperText>
            </Field.Root>
          </VStack>
        )}

        {/* Step 2: Dataset Selection (grouped by topic) */}
        {step === 2 && (
          <VStack gap={6} align="stretch">
            <Box>
              <Heading size="md" mb={1}>Select Datasets</Heading>
              <Text color="fg.muted" fontSize="sm">
                Choose a topic to auto-select all its datasets, or pick individual datasets.
                Each will be reviewed one-by-one after analysis. Date ranges are determined automatically per dataset.
              </Text>
            </Box>

            {/* Topic quick-select buttons */}
            <Flex gap={2} flexWrap="wrap">
              {DATASET_TOPICS.map((topic) => {
                const allSelected = topic.datasetIds.every((id) => selectedDatasets.has(id));
                const someSelected = !allSelected && topic.datasetIds.some((id) => selectedDatasets.has(id));
                return (
                  <Button
                    key={topic.label}
                    size="sm"
                    variant={allSelected ? "solid" : "outline"}
                    colorPalette={allSelected ? "primary" : someSelected ? "primary" : "gray"}
                    onClick={() => {
                      setSelectedDatasets((prev) => {
                        const next = new Set(prev);
                        if (allSelected) {
                          for (const id of topic.datasetIds) next.delete(id);
                        } else {
                          for (const id of topic.datasetIds) next.add(id);
                        }
                        return next;
                      });
                    }}
                  >
                    {topic.label}
                    {allSelected && <Badge size="xs" colorPalette="green" variant="subtle" ml={1}>✓</Badge>}
                    {someSelected && <Badge size="xs" variant="subtle" ml={1}>{topic.datasetIds.filter((id) => selectedDatasets.has(id)).length}/{topic.datasetIds.length}</Badge>}
                  </Button>
                );
              })}
            </Flex>

            {/* Datasets grouped by topic */}
            <VStack gap={4} align="stretch">
              {DATASET_TOPICS.map((topic) => {
                const topicAllSelected = topic.datasetIds.every((id) => selectedDatasets.has(id));
                return (
                  <Box
                    key={topic.label}
                    rounded="md"
                    border="1px solid"
                    borderColor={topicAllSelected ? "primary.muted" : "border.muted"}
                    overflow="hidden"
                  >
                    <Flex
                      as="label"
                      px={4}
                      py={2.5}
                      bg={topicAllSelected ? "primary.subtle" : "bg.subtle"}
                      cursor="pointer"
                      align="center"
                      gap={3}
                      _hover={{ bg: topicAllSelected ? "primary.subtle" : "bg.muted" }}
                      transition="background 0.15s"
                    >
                      <input
                        type="checkbox"
                        checked={topicAllSelected}
                        onChange={() => {
                          setSelectedDatasets((prev) => {
                            const next = new Set(prev);
                            if (topicAllSelected) {
                              for (const id of topic.datasetIds) next.delete(id);
                            } else {
                              for (const id of topic.datasetIds) next.add(id);
                            }
                            return next;
                          });
                        }}
                        style={{ accentColor: "var(--chakra-colors-primary-500)" }}
                      />
                      <Box flex={1}>
                        <Text fontSize="sm" fontWeight="semibold">{topic.label}</Text>
                        <Text fontSize="xs" color="fg.muted">{topic.description}</Text>
                      </Box>
                      <Badge size="xs" variant="outline">
                        {topic.datasetIds.filter((id) => selectedDatasets.has(id)).length}/{topic.datasetIds.length}
                      </Badge>
                    </Flex>

                    <VStack gap={0} align="stretch">
                      {topic.datasetIds.map((id) => {
                        const isSelected = selectedDatasets.has(id);
                        return (
                          <Flex
                            key={id}
                            as="label"
                            px={4}
                            py={2}
                            pl={10}
                            cursor="pointer"
                            borderTop="1px solid"
                            borderColor="border.muted"
                            bg={isSelected ? "primary.subtle" : "transparent"}
                            _hover={{
                              bg: isSelected ? "primary.subtle" : "bg.muted",
                            }}
                            transition="background 0.15s"
                            gap={2}
                            align="center"
                          >
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => toggleDataset(id)}
                              style={{ accentColor: "var(--chakra-colors-primary-500)" }}
                            />
                            <Text fontSize="sm">
                              {DATASETS[id]}
                            </Text>
                          </Flex>
                        );
                      })}
                    </VStack>
                  </Box>
                );
              })}
            </VStack>

            <HStack gap={2}>
              <Button
                size="xs"
                variant="ghost"
                onClick={() => setSelectedDatasets(new Set(Object.keys(DATASETS).map(Number)))}
              >
                Select all
              </Button>
              <Button
                size="xs"
                variant="ghost"
                onClick={() => setSelectedDatasets(new Set())}
              >
                Clear all
              </Button>
              <Text fontSize="xs" color="fg.muted" ml="auto">
                {selectedDatasets.size} dataset{selectedDatasets.size !== 1 ? "s" : ""} selected
              </Text>
            </HStack>

            {/* Review summary */}
            <Separator />
            <Box>
              <Heading size="xs" color="fg.muted" mb={3}>Review your selections</Heading>
              <VStack gap={2} align="stretch" fontSize="sm">
                <HStack gap={2} align="flex-start">
                  <Box pt={0.5}><GlobeIcon size={16} /></Box>
                  <Text fontWeight="medium" flexShrink={0}>Areas:</Text>
                  <Text color="fg.muted">
                    {selectedAreas.filter(a => !a.parentCode).map(country => {
                      const code = country.areaId.replace("gadm:", "");
                      const subRegions = selectedAreas.filter(a => a.parentCode === code);
                      if (subRegions.length > 0) {
                        return `${country.label} (+ ${subRegions.length} region${subRegions.length !== 1 ? "s" : ""})`;
                      }
                      return country.label;
                    }).join(", ")}
                  </Text>
                </HStack>
                <HStack gap={2}>
                  <ListChecksIcon size={16} />
                  <Text fontWeight="medium">Datasets:</Text>
                  <Text color="fg.muted">
                    {selectedDatasets.size} selected
                  </Text>
                </HStack>
              </VStack>
            </Box>
          </VStack>
        )}
      </Box>

      {/* Navigation buttons */}
      <Separator my={6} />
      <Flex justify="space-between">
        <Button
          variant="outline"
          size="sm"
          onClick={handleBack}
          disabled={step === 1}
        >
          <ArrowLeftIcon />
          Back
        </Button>
        <Button
          colorPalette="primary"
          size="sm"
          onClick={handleNext}
          disabled={!canAdvance()}
        >
          {step === 2 ? (
            <>
              <RocketLaunchIcon />
              Start Analysis ({selectedDatasets.size} dataset{selectedDatasets.size !== 1 ? "s" : ""})
            </>
          ) : (
            <>
              Next
              <ArrowRightIcon />
            </>
          )}
        </Button>
      </Flex>
    </Box>
  );
}

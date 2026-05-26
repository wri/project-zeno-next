"use client";

import { useMemo } from "react";
import { Box, Flex, Text, VStack } from "@chakra-ui/react";
import { PlusIcon } from "@phosphor-icons/react";
import ChartIcon from "./ChartIcon";
import {
  INSIGHT_TEMPLATES,
  INSIGHT_TOPIC_ORDER,
  type InsightTemplate,
  type InsightTopic,
} from "@/app/lib/portfolio/insightTemplates";

type Props = {
  onPick: (template: InsightTemplate) => void;
};

// Side pane modelled on the report-detail "Pinned Insights" sidebar. Renders
// the templated-insight catalogue grouped by topic — clicking a card hands
// the template back to the parent, which is responsible for materialising
// it as a PinnedInsight and appending a block to the dashboard.
export default function TemplateLibraryPane({ onPick }: Props) {
  const grouped = useMemo(() => {
    const map = new Map<InsightTopic, InsightTemplate[]>();
    for (const topic of INSIGHT_TOPIC_ORDER) map.set(topic, []);
    for (const template of INSIGHT_TEMPLATES) {
      map.get(template.topic)?.push(template);
    }
    return map;
  }, []);

  return (
    <Box p={3}>
      <Flex justify="space-between" align="center" mb={2}>
        <Text fontSize="sm" fontWeight="semibold">
          Templates
        </Text>
        <Text fontSize="xs" color="fg.muted">
          {INSIGHT_TEMPLATES.length} available
        </Text>
      </Flex>
      <Text fontSize="xs" color="fg.muted" mb={3} lineHeight="short">
        Click a template to add it to this dashboard. Each insight is scoped
        to the dashboard&apos;s AOI.
      </Text>

      <VStack align="stretch" gap={4}>
        {INSIGHT_TOPIC_ORDER.map((topic) => {
          const templates = grouped.get(topic) ?? [];
          if (templates.length === 0) return null;
          return (
            <Box key={topic}>
              <Text
                fontSize="2xs"
                fontFamily="mono"
                fontWeight="semibold"
                color="fg.muted"
                textTransform="uppercase"
                letterSpacing="wider"
                mb={1.5}
              >
                {topic}
              </Text>
              <VStack align="stretch" gap={1.5}>
                {templates.map((template) => (
                  <TemplateCard
                    key={template.id}
                    template={template}
                    onClick={() => onPick(template)}
                  />
                ))}
              </VStack>
            </Box>
          );
        })}
      </VStack>
    </Box>
  );
}

function TemplateCard({
  template,
  onClick,
}: {
  template: InsightTemplate;
  onClick: () => void;
}) {
  return (
    <Box
      as="button"
      onClick={onClick}
      bg="bg"
      border="1px solid"
      borderColor="border"
      rounded="md"
      px={3}
      py={2}
      cursor="pointer"
      textAlign="left"
      transition="border-color 0.12s, background 0.12s"
      _hover={{ borderColor: "primary.solid", bg: "bg.muted" }}
      role="group"
    >
      <Flex align="flex-start" gap={2}>
        <Box color="primary.fg" mt={0.5} flexShrink={0}>
          <ChartIcon type={template.chartType} size={18} color="currentColor" />
        </Box>
        <Box flex="1" minW={0}>
          <Text fontSize="xs" fontWeight="semibold" lineHeight="short" mb={0.5}>
            {template.title}
          </Text>
          <Text fontSize="2xs" color="fg.muted" lineHeight="short" truncate>
            {template.datasetName}
          </Text>
        </Box>
        <Box
          color="fg.muted"
          opacity={0}
          _groupHover={{ opacity: 1 }}
          transition="opacity 0.12s"
          flexShrink={0}
          mt={0.5}
        >
          <PlusIcon size={14} />
        </Box>
      </Flex>
    </Box>
  );
}

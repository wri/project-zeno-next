"use client";

import { Button, Checkbox, Flex, Popover } from "@chakra-ui/react";
import { GearIcon } from "@phosphor-icons/react";

/**
 * The insight module's "Customize" dropdown: checkbox rows for the AI
 * summary and every chart of the insight (shown and hidden alike, in
 * position order, labelled by kind). A popover of plain checkboxes rather
 * than Menu.CheckboxItem so the panel stays open while several pieces are
 * toggled in one visit; each toggle reports the row's next visibility and
 * the caller persists it to the widget config.
 */
export default function DashboardModuleCustomizeMenu({
  summaryAvailable,
  summaryShown,
  charts,
  onToggleSummary,
  onToggleChart,
}: {
  /** False when the insight has no narrative — the summary row is omitted. */
  summaryAvailable: boolean;
  summaryShown: boolean;
  charts: { id: string; title: string; shown: boolean }[];
  onToggleSummary: (shown: boolean) => void;
  onToggleChart: (chartId: string, shown: boolean) => void;
}) {
  return (
    <Popover.Root positioning={{ placement: "bottom-end" }} lazyMount>
      <Popover.Trigger asChild>
        <Button
          variant="outline"
          size="2xs"
          color="fg.muted"
          fontWeight="normal"
        >
          <GearIcon size={16} />
          Customize
        </Button>
      </Popover.Trigger>
      <Popover.Positioner>
        <Popover.Content width="auto" minW="220px" maxW="320px">
          <Popover.Body p="2">
            <Flex
              direction="column"
              gap="1"
              role="group"
              aria-label="Customize analysis"
            >
              {summaryAvailable && (
                <CustomizeRow
                  label="AI generated summary"
                  checked={summaryShown}
                  onToggle={() => onToggleSummary(!summaryShown)}
                />
              )}
              {charts.map((chart) => (
                <CustomizeRow
                  key={chart.id}
                  label={`Chart · ${chart.title}`}
                  checked={chart.shown}
                  onToggle={() => onToggleChart(chart.id, !chart.shown)}
                />
              ))}
            </Flex>
          </Popover.Body>
        </Popover.Content>
      </Popover.Positioner>
    </Popover.Root>
  );
}

function CustomizeRow({
  label,
  checked,
  onToggle,
}: {
  label: string;
  checked: boolean;
  onToggle: () => void;
}) {
  return (
    <Checkbox.Root
      size="sm"
      checked={checked}
      onCheckedChange={onToggle}
      px="2"
      py="1"
      borderRadius="sm"
      cursor="pointer"
      _hover={{ bg: "bg.muted" }}
    >
      <Checkbox.HiddenInput />
      <Checkbox.Control />
      <Checkbox.Label fontWeight="normal">{label}</Checkbox.Label>
    </Checkbox.Root>
  );
}

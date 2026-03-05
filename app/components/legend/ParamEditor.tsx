import { useEffect, useState } from "react";
import {
  Box,
  Button,
  Flex,
  Popover,
  SegmentGroup,
  Slider,
  Text,
} from "@chakra-ui/react";
import { ArrowCounterClockwiseIcon } from "@phosphor-icons/react";
import type { ParamSpec } from "@/app/constants/datasets";

interface ParamEditorProps {
  params?: Record<string, number | string>;
  paramSpecs?: Record<string, ParamSpec>;
  onParamsChange?: (params: Record<string, number | string>) => void;
  opacity: number;
  onOpacityChange: (value: number) => void;
  children: React.ReactNode;
}

/**
 * Popover control for editing layer parameters (year range, categorical, etc.).
 * Renders range sliders for grouped params, single sliders for numeric, and
 * segmented toggles for categorical params. Commits on release to avoid tile floods.
 */
export function ParamEditor(props: ParamEditorProps) {
  const { params, paramSpecs, onParamsChange, opacity, onOpacityChange, children } = props;

  // Initialise draft with spec defaults so controlled components (e.g.
  // SegmentGroup) have a value on first render, before any user interaction.
  const initDraft = (): Record<string, number | string> => {
    const defaults: Record<string, number | string> = {};
    if (paramSpecs) {
      for (const [key, spec] of Object.entries(paramSpecs)) {
        defaults[key] = spec.default;
      }
    }
    return { ...defaults, ...(params ?? {}) };
  };

  const [draft, setDraft] = useState<Record<string, number | string>>(initDraft);
  const [draftOpacity, setDraftOpacity] = useState(opacity);

  useEffect(() => {
    setDraft(initDraft());
  }, [params]);

  useEffect(() => {
    setDraftOpacity(opacity);
  }, [opacity]);

  const commitDraft = (next: Record<string, number | string>) => {
    setDraft(next);
    onParamsChange?.(next);
  };

  const handleReset = () => {
    if (!paramSpecs) return;
    const defaults: Record<string, number | string> = {};
    for (const [key, spec] of Object.entries(paramSpecs)) {
      defaults[key] = spec.default;
    }
    commitDraft(defaults);
  };

  const isDefault = !paramSpecs || Object.entries(paramSpecs).every(
    ([key, spec]) => draft[key] === spec.default
  );

  // Group params: range groups, standalone numeric, categorical
  const rangeGroups = new Map<string, [string, ParamSpec][]>();
  const standaloneNumeric: [string, ParamSpec][] = [];
  const categoricals: [string, ParamSpec][] = [];

  for (const [key, spec] of Object.entries(paramSpecs ?? {})) {
    if (spec.type === "categorical") {
      categoricals.push([key, spec]);
    } else if (spec.range_group) {
      const group = rangeGroups.get(spec.range_group) ?? [];
      group.push([key, spec]);
      rangeGroups.set(spec.range_group, group);
    } else {
      standaloneNumeric.push([key, spec]);
    }
  }

  return (
    <Popover.Root
      positioning={{
        placement: "top",
        strategy: "fixed",
        hideWhenDetached: true,
      }}
    >
      <Popover.Trigger asChild>{children}</Popover.Trigger>
      <Popover.Positioner>
        <Popover.Content w="16rem">
          <Popover.Arrow>
            <Popover.ArrowTip />
          </Popover.Arrow>
          <Popover.Body>
            <Text fontWeight="medium" fontSize="xs" mb={3}>
              Layer settings
            </Text>
            <Flex direction="column" gap={4}>
              {/* Opacity slider */}
              <Box>
                <Flex justifyContent="space-between" mb={1}>
                  <Text fontSize="xs" color="fg.muted">
                    Opacity
                  </Text>
                  <Text fontSize="xs" fontWeight="medium">
                    {Math.round(draftOpacity)}%
                  </Text>
                </Flex>
                <Slider.Root
                  value={[draftOpacity]}
                  min={0}
                  max={100}
                  step={1}
                  onValueChange={(v) => setDraftOpacity(v.value[0])}
                  onValueChangeEnd={(v) => onOpacityChange(v.value[0])}
                  size="sm"
                >
                  <Slider.Control>
                    <Slider.Track>
                      <Slider.Range />
                    </Slider.Track>
                    <Slider.Thumb index={0} />
                    <Slider.Marks
                      marks={[
                        { value: 0, label: "0%" },
                        { value: 50, label: "50%" },
                        { value: 100, label: "100%" },
                      ]}
                    />
                  </Slider.Control>
                </Slider.Root>
              </Box>
              {/* Range sliders (dual-handle) */}
              {[...rangeGroups.entries()].map(([groupKey, entries]) => (
                <RangeParamSlider
                  key={groupKey}
                  entries={entries}
                  draft={draft}
                  onChange={(updates) =>
                    setDraft((d) => ({ ...d, ...updates }))
                  }
                  onCommit={(updates) =>
                    commitDraft({ ...draft, ...updates })
                  }
                />
              ))}
              {/* Single sliders */}
              {standaloneNumeric.map(([key, spec]) => (
                <ParamSlider
                  key={key}
                  spec={spec}
                  value={(draft[key] as number) ?? (spec.default as number)}
                  onChange={(v) => setDraft((d) => ({ ...d, [key]: v }))}
                  onCommit={(v) => commitDraft({ ...draft, [key]: v })}
                />
              ))}
              {/* Categorical toggles */}
              {categoricals.map(([key, spec]) => (
                <CategoricalToggle
                  key={key}
                  spec={spec}
                  value={(draft[key] as string) ?? (spec.default as string)}
                  onChange={(v) => commitDraft({ ...draft, [key]: v })}
                />
              ))}
            </Flex>
            {!isDefault && (
              <Button
                variant="ghost"
                size="xs"
                mt={3}
                w="full"
                onClick={handleReset}
              >
                <ArrowCounterClockwiseIcon />
                Reset to defaults
              </Button>
            )}
          </Popover.Body>
        </Popover.Content>
      </Popover.Positioner>
    </Popover.Root>
  );
}

// ---------------------------------------------------------------------------
// Single-value slider (single year)
// ---------------------------------------------------------------------------

function ParamSlider(props: {
  spec: ParamSpec;
  value: number;
  onChange: (v: number) => void;
  onCommit: (v: number) => void;
}) {
  const { spec, value, onChange, onCommit } = props;

  const step = 1;
  const formatValue = (v: number) => String(v);

  return (
    <Box>
      <Flex justifyContent="space-between" mb={1}>
        <Text fontSize="xs" color="fg.muted">
          {spec.label}
        </Text>
        <Text fontSize="xs" fontWeight="medium">
          {formatValue(value)}
        </Text>
      </Flex>
      <Slider.Root
        value={[value]}
        min={spec.min}
        max={spec.max}
        step={step}
        onValueChange={(v) => onChange(v.value[0])}
        onValueChangeEnd={(v) => onCommit(v.value[0])}
        size="sm"
      >
        <Slider.Control>
          <Slider.Track>
            <Slider.Range css={{ bg: "transparent" }} />
          </Slider.Track>
          <Slider.Thumb index={0} />
          <Slider.Marks
            marks={[
              { value: spec.min!, label: formatValue(spec.min!) },
              { value: spec.max!, label: formatValue(spec.max!) },
            ]}
          />
        </Slider.Control>
      </Slider.Root>
    </Box>
  );
}

// ---------------------------------------------------------------------------
// Dual-handle range slider (start/end year, start/end date)
// ---------------------------------------------------------------------------

function RangeParamSlider(props: {
  entries: [string, ParamSpec][];
  draft: Record<string, number | string>;
  onChange: (updates: Record<string, number>) => void;
  onCommit: (updates: Record<string, number>) => void;
}) {
  const { entries, draft, onChange, onCommit } = props;

  // Sort so the "start" param comes first (lower default)
  const sorted = [...entries].sort(
    (a, b) => (a[1].default as number) - (b[1].default as number)
  );
  const [startKey, startSpec] = sorted[0];
  const [endKey, endSpec] = sorted[1];

  const min = startSpec.min!;
  const max = endSpec.max!;
  const startVal = (draft[startKey] as number) ?? (startSpec.default as number);
  const endVal = (draft[endKey] as number) ?? (endSpec.default as number);
  const step = startSpec.type === "year" ? 1 : 1;

  const isDate = startSpec.type === "date";
  const label = isDate ? "Date range" : "Year range";

  const formatValue = (v: number) => {
    if (isDate) {
      // Convert ordinal day or year to display — for year-based just show year
      return String(v);
    }
    return String(v);
  };

  return (
    <Box>
      <Flex justifyContent="space-between" mb={1}>
        <Text fontSize="xs" color="fg.muted">
          {label}
        </Text>
        <Text fontSize="xs" fontWeight="medium">
          {formatValue(startVal)} – {formatValue(endVal)}
        </Text>
      </Flex>
      <Slider.Root
        value={[startVal, endVal]}
        min={min}
        max={max}
        step={step}
        minStepsBetweenThumbs={1}
        onValueChange={(v) =>
          onChange({ [startKey]: v.value[0], [endKey]: v.value[1] })
        }
        onValueChangeEnd={(v) =>
          onCommit({ [startKey]: v.value[0], [endKey]: v.value[1] })
        }
        size="sm"
      >
        <Slider.Control>
          <Slider.Track>
            <Slider.Range />
          </Slider.Track>
          <Slider.Thumb index={0} />
          <Slider.Thumb index={1} />
          <Slider.Marks
            marks={[
              { value: min, label: formatValue(min) },
              { value: max, label: formatValue(max) },
            ]}
          />
        </Slider.Control>
      </Slider.Root>
    </Box>
  );
}

// ---------------------------------------------------------------------------
// Categorical segmented toggle
// ---------------------------------------------------------------------------

function CategoricalToggle(props: {
  spec: ParamSpec;
  value: string;
  onChange: (v: string) => void;
}) {
  const { spec, value, onChange } = props;
  const options = spec.options ?? [];

  return (
    <Box>
      <Text fontSize="xs" color="fg.muted" mb={1}>
        {spec.label}
      </Text>
      <SegmentGroup.Root
        value={value}
        onValueChange={(e) => { if (e.value) onChange(e.value); }}
        size="xs"
        w="full"
        bg="bg.muted"
        rounded="md"
      >
        <SegmentGroup.Indicator bg="bg" shadow="xs" rounded="sm" />
        {options.map((opt) => (
          <SegmentGroup.Item key={opt.value} value={opt.value} flex="1">
            <SegmentGroup.ItemText fontWeight="normal">{opt.label}</SegmentGroup.ItemText>
            <SegmentGroup.ItemHiddenInput />
          </SegmentGroup.Item>
        ))}
      </SegmentGroup.Root>
    </Box>
  );
}

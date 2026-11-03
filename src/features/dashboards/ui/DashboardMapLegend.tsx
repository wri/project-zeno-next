import { useState } from "react";
import {
  Box,
  Button,
  Flex,
  Grid,
  IconButton,
  Popover,
  Portal,
  Text,
} from "@chakra-ui/react";
import {
  CaretDownIcon,
  CaretUpIcon,
  CircleHalfIcon,
  InfoIcon,
} from "@phosphor-icons/react";

import { LegendDivergent } from "@/app/components/legend/LegendDivergent";
import { LegendSequential } from "@/app/components/legend/LegendSequential";
import { OpacityControl } from "@/app/components/legend/OpacityControl";
import { makeColorRamp } from "@/app/components/legend/makeColorRamp";
import {
  mapLegendFor,
  type MapLegend,
  type MapLegendClass,
  type MapLegendContext,
  type MapLegendScale,
} from "../lib/mapLegend";
import type { MapWidgetLayer } from "../lib/mapWidgets";

/** Per-sub-layer legend opacity, 0–100 (main dataset · context sub-layer). */
export interface MapWidgetOpacity {
  main: number;
  context: number;
}

type OpacityHandler = (target: keyof MapWidgetOpacity, value: number) => void;

/** Classes on the collapsed line; the rest show when the legend opens. */
const COLLAPSED_CLASSES = 3;

/**
 * A dashboard map's legend, under the map so that nothing covers it.
 * Collapsed, it is one line: the first classes (or the colour scale), the
 * context layer and the layer's settings. Open, it shows every class and the
 * dataset note. Paper cannot expand it, so the export prints it open, without
 * buttons. Dataset widgets only: imagery has no DATASET_CARDS entry.
 */
export default function DashboardMapLegend({
  layer,
  opacity,
  onOpacityChange,
  print = false,
}: {
  layer: MapWidgetLayer;
  opacity: MapWidgetOpacity;
  onOpacityChange: OpacityHandler;
  print?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const legend = mapLegendFor(layer);
  if (!legend) return null;

  return print || open ? (
    <OpenLegend
      legend={legend}
      opacity={opacity}
      onOpacityChange={onOpacityChange}
      onCollapse={print ? undefined : () => setOpen(false)}
    />
  ) : (
    <CollapsedLegend
      legend={legend}
      opacity={opacity}
      onOpacityChange={onOpacityChange}
      onExpand={() => setOpen(true)}
    />
  );
}

function CollapsedLegend({
  legend,
  opacity,
  onOpacityChange,
  onExpand,
}: {
  legend: MapLegend;
  opacity: MapWidgetOpacity;
  onOpacityChange: OpacityHandler;
  onExpand: () => void;
}) {
  const { classes, scale, context, params } = legend;
  const hidden = classes.length - COLLAPSED_CLASSES;

  return (
    <Flex align="center" gap="12px" pt="8px" minH="32px" fontSize="xs">
      <Flex
        flex="1"
        minW={0}
        align="center"
        gap="12px"
        overflow="hidden"
        whiteSpace="nowrap"
      >
        {scale ? (
          <InlineScale scale={scale} />
        ) : (
          <ClassList
            classes={classes.slice(0, COLLAPSED_CLASSES)}
            ring={context?.color}
          />
        )}
        {context && <Within context={context} />}
      </Flex>
      {hidden > 0 && (
        <Button
          variant="plain"
          size="xs"
          h="auto"
          p={0}
          color="primary.solid"
          flexShrink={0}
          onClick={onExpand}
        >
          +{hidden} more
        </Button>
      )}
      {params && (
        <Params text={params} display={{ base: "none", md: "block" }} />
      )}
      <Flex flexShrink={0}>
        <InfoButton title={legend.title} info={legend.info} />
        <OpacityButton
          label="Layer opacity"
          value={opacity.main}
          onChange={(value) => onOpacityChange("main", value)}
        />
        <IconButton
          aria-label="Show full legend"
          aria-expanded={false}
          variant="ghost"
          size="2xs"
          color="fg.muted"
          onClick={onExpand}
        >
          <CaretDownIcon />
        </IconButton>
      </Flex>
    </Flex>
  );
}

function OpenLegend({
  legend,
  opacity,
  onOpacityChange,
  onCollapse,
}: {
  legend: MapLegend;
  opacity: MapWidgetOpacity;
  onOpacityChange: OpacityHandler;
  /** Absent on paper, which gets no buttons. */
  onCollapse: (() => void) | undefined;
}) {
  const { title, info, note, classes, scale, params, context } = legend;

  return (
    <Flex direction="column" gap="8px" pt="8px" fontSize="xs">
      <Flex align="center" gap="12px" minH="24px">
        <Text flex="1" minW={0} fontWeight="semibold">
          {title}
        </Text>
        {params && <Params text={params} />}
        {onCollapse && (
          <Flex flexShrink={0}>
            <InfoButton title={title} info={info} />
            <OpacityButton
              label="Layer opacity"
              value={opacity.main}
              onChange={(value) => onOpacityChange("main", value)}
            />
            <IconButton
              aria-label="Show less"
              aria-expanded
              variant="ghost"
              size="2xs"
              color="fg.muted"
              onClick={onCollapse}
            >
              <CaretUpIcon />
            </IconButton>
          </Flex>
        )}
      </Flex>
      {scale ? (
        <Box maxW="320px">
          {scale.kind === "divergent" ? (
            <LegendDivergent
              unit={scale.unit ?? ""}
              minLabel={scale.minLabel}
              maxLabel={scale.maxLabel}
              color={scale.colors}
            />
          ) : (
            <LegendSequential
              unit={scale.unit}
              minLabel={scale.minLabel}
              maxLabel={scale.maxLabel}
              color={scale.colors}
            />
          )}
        </Box>
      ) : (
        <Grid
          as="ul"
          listStyleType="none"
          m={0}
          p={0}
          gridTemplateColumns="repeat(auto-fill, minmax(150px, 1fr))"
          columnGap="12px"
          rowGap="4px"
        >
          {classes.map((c, i) => (
            <ClassItem key={i} item={c} ring={context?.color} />
          ))}
        </Grid>
      )}
      {context && (
        <Flex align="center" gap="4px">
          <Within context={context} />
          {onCollapse && context.info ? (
            <InfoButton title={context.title} info={context.info} />
          ) : null}
          {onCollapse && (
            <OpacityButton
              label={`${context.title} opacity`}
              value={opacity.context}
              onChange={(value) => onOpacityChange("context", value)}
            />
          )}
        </Flex>
      )}
      <Text color="fg.muted">{note}</Text>
    </Flex>
  );
}

/**
 * A class colour. Inside a context layer it sits on a ring of the context
 * colour, as the data's pixels sit on the context layer on the map.
 */
function Swatch({ color, ring }: { color: string; ring?: string }) {
  return (
    <Box
      aria-hidden
      w="10px"
      h="10px"
      flexShrink={0}
      borderRadius="2px"
      bg={color}
      boxShadow={
        ring ? `0 0 0 2px ${ring}` : "inset 0 0 0 1px rgba(19, 22, 25, 0.1)"
      }
    />
  );
}

function ClassItem({ item, ring }: { item: MapLegendClass; ring?: string }) {
  return (
    <Flex as="li" align="center" gap="6px" minW={0}>
      <Swatch color={item.color} ring={ring} />
      <Text as="span">{item.label}</Text>
    </Flex>
  );
}

function ClassList({
  classes,
  ring,
}: {
  classes: MapLegendClass[];
  ring?: string;
}) {
  return (
    <Flex as="ul" listStyleType="none" m={0} p={0} gap="12px" minW={0}>
      {classes.map((c, i) => (
        <ClassItem key={i} item={c} ring={ring} />
      ))}
    </Flex>
  );
}

function InlineScale({ scale }: { scale: MapLegendScale }) {
  return (
    <Flex align="center" gap="6px" flexShrink={0}>
      <Text as="span">{scale.minLabel}</Text>
      <Box
        aria-hidden
        w="96px"
        h="8px"
        borderRadius="2px"
        bg={makeColorRamp(scale.colors)}
      />
      <Text as="span">{scale.maxLabel}</Text>
    </Flex>
  );
}

function Within({ context }: { context: MapLegendContext }) {
  return (
    <Flex align="center" gap="6px" flexShrink={0} color="fg.muted">
      <Text as="span" fontStyle="italic">
        within
      </Text>
      <Swatch color={context.color} />
      <Text as="span">{context.title}</Text>
    </Flex>
  );
}

function Params({
  text,
  display,
}: {
  text: string;
  display?: { base: string; md: string };
}) {
  return (
    <Text
      flexShrink={0}
      display={display}
      fontFamily="mono"
      fontSize="10px"
      lineHeight="14px"
      letterSpacing="0.04em"
      textTransform="uppercase"
      color="fg.muted"
    >
      {text}
    </Text>
  );
}

function InfoButton({ title, info }: { title: string; info: string }) {
  return (
    <Popover.Root>
      <Popover.Trigger asChild>
        <IconButton
          aria-label={`About ${title}`}
          variant="ghost"
          size="2xs"
          color="fg.muted"
        >
          <InfoIcon />
        </IconButton>
      </Popover.Trigger>
      <Portal>
        <Popover.Positioner>
          <Popover.Content>
            <Popover.Arrow />
            <Popover.Body>
              <Popover.Title fontWeight="medium">
                Layer information
              </Popover.Title>
              <Text my="4">{info}</Text>
            </Popover.Body>
          </Popover.Content>
        </Popover.Positioner>
      </Portal>
    </Popover.Root>
  );
}

function OpacityButton({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number;
  onChange: (value: number) => void;
}) {
  return (
    <OpacityControl value={value} onValueChange={onChange}>
      <IconButton
        aria-label={label}
        variant="ghost"
        size="2xs"
        color="fg.muted"
      >
        <CircleHalfIcon />
      </IconButton>
    </OpacityControl>
  );
}

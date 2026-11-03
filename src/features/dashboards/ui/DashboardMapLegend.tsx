import { useState, type ReactNode } from "react";
import { Box, Button, Flex, Grid, IconButton, Text } from "@chakra-ui/react";
import {
  CaretDownIcon,
  CaretUpIcon,
  CircleHalfIcon,
  InfoIcon,
} from "@phosphor-icons/react";

import { ColorBar } from "@/app/components/legend/ColorBar";
import { LegendDivergent } from "@/app/components/legend/LegendDivergent";
import { LegendSequential } from "@/app/components/legend/LegendSequential";
import { OpacityControl } from "@/app/components/legend/OpacityControl";
import { makeColorRamp } from "@/app/components/legend/makeColorRamp";
import { LayerInfoPopover } from "@/src/shared/ui/LayerInfoPopover";
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

/** Classes on the collapsed line; the rest show when the legend opens. */
const COLLAPSED_CLASSES = 3;

const ICON_BUTTON_PROPS = {
  variant: "ghost",
  size: "2xs",
  color: "fg.muted",
} as const;

/**
 * A dashboard map's legend. Collapsed, it is one line: the first classes (or
 * the colour scale), the context layer and the layer's settings. Open, it
 * shows every class and the dataset note. Paper cannot expand it, so the
 * export prints it open, without buttons.
 */
export default function DashboardMapLegend({
  layer,
  opacity,
  onOpacityChange,
  print = false,
}: {
  layer: MapWidgetLayer;
  opacity: MapWidgetOpacity;
  onOpacityChange: (target: keyof MapWidgetOpacity, value: number) => void;
  print?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const legend = mapLegendFor(layer);
  if (!legend) return null;
  const { title, info, context } = legend;

  const controls = print ? null : (
    <Flex flexShrink={0}>
      <InfoButton title={title} info={info} />
      <OpacityButton
        label="Layer opacity"
        value={opacity.main}
        onChange={(value) => onOpacityChange("main", value)}
      />
      <IconButton
        aria-label={open ? "Show less" : "Show full legend"}
        aria-expanded={open}
        {...ICON_BUTTON_PROPS}
        onClick={() => setOpen(!open)}
      >
        {open ? <CaretUpIcon /> : <CaretDownIcon />}
      </IconButton>
    </Flex>
  );

  const contextControls =
    print || !context ? null : (
      <>
        {context.info && (
          <InfoButton title={context.title} info={context.info} />
        )}
        <OpacityButton
          label={`${context.title} opacity`}
          value={opacity.context}
          onChange={(value) => onOpacityChange("context", value)}
        />
      </>
    );

  return print || open ? (
    <OpenLegend
      legend={legend}
      controls={controls}
      contextControls={contextControls}
    />
  ) : (
    <CollapsedLegend
      legend={legend}
      controls={controls}
      onExpand={() => setOpen(true)}
    />
  );
}

function CollapsedLegend({
  legend,
  controls,
  onExpand,
}: {
  legend: MapLegend;
  controls: ReactNode;
  onExpand: () => void;
}) {
  const { symbology, context, params } = legend;
  const hidden =
    symbology.kind === "classes"
      ? symbology.classes.length - COLLAPSED_CLASSES
      : 0;

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
        {symbology.kind === "classes" ? (
          <ClassList
            classes={symbology.classes.slice(0, COLLAPSED_CLASSES)}
            ring={context?.color}
          />
        ) : (
          <InlineScale scale={symbology} />
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
      {controls}
    </Flex>
  );
}

function OpenLegend({
  legend,
  controls,
  contextControls,
}: {
  legend: MapLegend;
  controls: ReactNode;
  contextControls: ReactNode;
}) {
  const { title, note, symbology, params, context } = legend;

  return (
    <Flex direction="column" gap="8px" pt="8px" fontSize="xs">
      <Flex align="center" gap="12px" minH="24px">
        <Text flex="1" minW={0} fontWeight="semibold">
          {title}
        </Text>
        {params && <Params text={params} />}
        {controls}
      </Flex>
      {symbology.kind === "classes" ? (
        <Grid
          as="ul"
          listStyleType="none"
          m={0}
          p={0}
          gridTemplateColumns="repeat(auto-fill, minmax(150px, 1fr))"
          columnGap="12px"
          rowGap="4px"
        >
          {symbology.classes.map((c, i) => (
            <ClassItem key={i} item={c} ring={context?.color} />
          ))}
        </Grid>
      ) : (
        <Box maxW="320px">
          <ScaleLegend scale={symbology} />
        </Box>
      )}
      {context && (
        <Flex align="center" gap="4px">
          <Within context={context} />
          {contextControls}
        </Flex>
      )}
      <Text color="fg.muted">{note}</Text>
    </Flex>
  );
}

/**
 * A class colour. Inside a context layer it sits on a ring of the context
 * colour, as the data's pixels sit on the context layer on the map. The ring
 * is drawn inside the box: the collapsed line clips what is outside it.
 */
function Swatch({ color, ring }: { color: string; ring?: string }) {
  const size = ring ? "14px" : "10px";
  return (
    <Box
      aria-hidden
      w={size}
      h={size}
      flexShrink={0}
      borderRadius={ring ? "4px" : "2px"}
      bg={color}
      boxShadow={
        ring
          ? `inset 0 0 0 2px ${ring}`
          : "inset 0 0 0 1px rgba(19, 22, 25, 0.1)"
      }
    />
  );
}

/**
 * A class or context label. It wraps in the open legend; on the collapsed
 * line, which does not wrap, a long label ends in an ellipsis rather than
 * run over the next one.
 */
function Label({ text }: { text: string }) {
  return (
    <Text
      as="span"
      minW={0}
      overflow="hidden"
      textOverflow="ellipsis"
      title={text}
    >
      {text}
    </Text>
  );
}

function ClassItem({ item, ring }: { item: MapLegendClass; ring?: string }) {
  return (
    <Flex as="li" align="center" gap="6px" minW={0}>
      <Swatch color={item.color} ring={ring} />
      <Label text={item.label} />
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
  const ramp = makeColorRamp(scale.colors);
  return (
    <Flex align="center" gap="6px" flexShrink={0}>
      <Text as="span">{scale.minLabel}</Text>
      {ramp && (
        <Box w="96px">
          <ColorBar color={ramp} borderRadius="2px" />
        </Box>
      )}
      <Text as="span">{scale.maxLabel}</Text>
    </Flex>
  );
}

function ScaleLegend({ scale }: { scale: MapLegendScale }) {
  const Scale = scale.kind === "divergent" ? LegendDivergent : LegendSequential;
  return (
    <Scale
      unit={scale.unit}
      minLabel={scale.minLabel}
      maxLabel={scale.maxLabel}
      color={scale.colors}
    />
  );
}

function Within({ context }: { context: MapLegendContext }) {
  return (
    <Flex align="center" gap="6px" minW={0} color="fg.muted">
      <Text as="span" fontStyle="italic" flexShrink={0}>
        within
      </Text>
      <Swatch color={context.color} />
      <Label text={context.title} />
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
    <LayerInfoPopover info={info}>
      <IconButton aria-label={`About ${title}`} {...ICON_BUTTON_PROPS}>
        <InfoIcon />
      </IconButton>
    </LayerInfoPopover>
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
      <IconButton aria-label={label} {...ICON_BUTTON_PROPS}>
        <CircleHalfIcon />
      </IconButton>
    </OpacityControl>
  );
}

import { ReactNode, useCallback, useEffect, useState } from "react";
import {
  Box,
  BoxProps,
  ButtonGroup,
  chakra,
  ColorSwatch,
  Flex,
  Grid,
  GridItem,
  Heading,
  IconButton,
  Popover,
  Slider,
  Text,
  Tooltip,
  VisuallyHidden,
} from "@chakra-ui/react";
import {
  CircleHalfIcon,
  DotsSixVerticalIcon,
  EyeClosedIcon,
  EyeIcon,
  InfoIcon,
  XIcon,
} from "@phosphor-icons/react";
import { Reorder, useDragControls } from "motion/react";
import { extent, scaleLinear } from "d3";

const ChReorderGroup = chakra(Reorder.Group);
const ChReorderItem = chakra(Reorder.Item);

/**
 * // Legend types - examples
 *
 * // -- Renders a swatch style legend. Can be:
 * //   -- a solid color
 * //   -- a line
 * //   -- a dashed line
 * //   -- an icon
 * <LegendSwatches
 *   items={[
 *     {
 *       color: "#4CAF50",
 *       value: "Estimated Tree Cover Loss 4PSG 932 (hsa)",
 *     },
 *     {
 *       color: "#FFC107",
 *       value: "Estimated burn area",
 *     },
 *     {
 *       type: "line",
 *       color: "#FF5722",
 *       value: "Estimated deforestation",
 *     },
 *     {
 *       type: "dashed",
 *       color: "#22ffde",
 *       value: "Watershed",
 *     },
 *     {
 *       type: "icon",
 *       color: "#00d77d",
 *       value: "Recycling",
 *       icon: <LeafIcon size={16} />,
 *     },
 *   ]}
 * />
 *
 * // -- Renders a categorical legend with color blocks.
 * Labels are truncated and on hover a tooltip is shown.
 * <LegendCategorical
 *   items={[
 *     { color: "#4CAF50", value: "Forest" },
 *     { color: "#FFC107", value: "Grassland" },
 *     { color: "#2196F3", value: "Wetland" },
 *     { color: "#9E9E9E", value: "Barren" },
 *     { color: "#F44336", value: "Urban" },
 *     { color: "#0a986b", value: "Tundra" },
 *     { color: "#e4e0e0", value: "Snowy" },
 *   ]}
 * />
 *
 * // -- Renders a sequential legend with a gradient color scale.
 * When providing the colors as an array they're evenly distributed.
 * <LegendSequential
 *   min={10}
 *   max={100}
 *   color={["#4CAF50", "#FFC107", "#2196F3"]}
 * />
 *
 * When providing the colors as an array of objects, the colors' position is
 * mapped to their corresponding values.
 * <LegendSequential
 *   min={10}
 *   max={100}
 *   color={[
 *     { color: "#4CAF50", value: 10 },
 *     { color: "#FFC107", value: 80 },
 *     { color: "#2196F3", value: 95 },
 *   ]}
 * />
 *
 * // -- Renders a divergent legend with a gradient color scale.
 * The colors are mirrored around the center, so only the first part of the
 * divergent scale is needed.
 * <LegendDivergent
 *   min={-1}
 *   max={1}
 *   color={["#2196F3", "#b41919", "#ff00dd"]}
 * />
 */

export interface LegendLayer {
  id: string;
  title: string;
  visible: boolean;
  opacity: number;
  dateRange?: string;
  symbology: ReactNode;
  children?: ReactNode;
}

interface LegendProps {
  layers: LegendLayer[];
  onLayersChange: (layers: LegendLayer[]) => void;
}

/**
 * Legend component displaying a draggable, reorderable list of map layers with
 * legend details.
 */
export function Legend(props: LegendProps) {
  const { layers, onLayersChange } = props;

  const handleLayerAction: LayerActionHandler = useCallback(
    ({ action, payload }) => {
      switch (action) {
        case "remove":
          onLayersChange(layers.filter((layer) => layer.id !== payload.id));
          break;
        case "visibility":
          onLayersChange(
            layers.map((layer) =>
              layer.id === payload.id
                ? { ...layer, visible: payload.visible }
                : layer
            )
          );
          break;
        case "opacity":
          onLayersChange(
            layers.map((layer) =>
              layer.id === payload.id
                ? { ...layer, opacity: payload.opacity }
                : layer
            )
          );
          break;
      }
    },
    [layers, onLayersChange]
  );

  if (!layers.length) return null;

  return (
    <Flex
      position="absolute"
      right={4}
      bottom={4}
      zIndex={100}
      width={320}
      bg="bg"
      border="1px solid {colors.gray.400}"
      shadow="md"
    >
      <VisuallyHidden>
        <Heading>Map Legend</Heading>
      </VisuallyHidden>
      <ChReorderGroup
        axis="y"
        values={layers}
        onReorder={onLayersChange}
        listStyleType="none"
        fontSize="xs"
        p={0}
        m={0}
        w="100%"
      >
        {layers.map((item) => (
          <Item key={item.id} item={item} onLayerAction={handleLayerAction} />
        ))}
      </ChReorderGroup>
    </Flex>
  );
}

/**
 * Item component representing a single draggable/reorderable layer entry in the
 * legend.
 */
function Item(props: { item: LegendLayer; onLayerAction: LayerActionHandler }) {
  const { item, onLayerAction } = props;

  const dragControls = useDragControls();

  return (
    <ChReorderItem
      value={item}
      id={item}
      dragListener={false}
      dragControls={dragControls}
      p={2}
      pl={1}
      display="flex"
      gap={1}
      bg="bg"
    >
      <IconButton
        variant="ghost"
        size="xs"
        p={0}
        minW="18px"
        h="18px"
        mt="2px"
        cursor="grab"
        onPointerDown={(event) => dragControls.start(event)}
      >
        <DotsSixVerticalIcon />
      </IconButton>
      <LayerInfo {...item} onLayerAction={onLayerAction} />
    </ChReorderItem>
  );
}

type LayerActionArgs =
  | {
      action: "remove";
      payload: { id: string };
    }
  | {
      action: "visibility";
      payload: { id: string; visible: boolean };
    }
  | {
      action: "opacity";
      payload: { id: string; opacity: number };
    };

type LayerActionHandler = (args: LayerActionArgs) => void;

/**
 * LayerInfo component displaying details, controls, and legend swatches for a
 * map layer.
 */
function LayerInfo(props: LegendLayer & { onLayerAction: LayerActionHandler }) {
  const {
    id,
    title,
    dateRange,
    symbology,
    children,
    visible,
    opacity,
    onLayerAction,
  } = props;
  return (
    <Flex flexDir="column" gap={2} pr={4} w="100%">
      <Flex justifyContent="space-between" gap={2} alignItems="center" mr={-4}>
        <Flex gap={1} alignItems="center" fontSize="sm">
          <Heading as="h3" size="sm" m={0}>
            {title}{" "}
            {dateRange && (
              <Text as="span" fontWeight="normal">
                {dateRange}
              </Text>
            )}
          </Heading>
        </Flex>
        <ButtonGroup
          variant="ghost"
          size="xs"
          gap={0}
          css={{
            "& button": {
              h: 6,
              minW: 6,
            },
          }}
        >
          <IconButton>
            <InfoIcon />
          </IconButton>
          <LegendOpacityControl
            value={opacity}
            onValueChange={(value) =>
              onLayerAction({
                action: "opacity",
                payload: { id: id, opacity: value },
              })
            }
          />
          <IconButton
            onClick={() =>
              onLayerAction({
                action: "visibility",
                payload: { id: id, visible: !visible },
              })
            }
          >
            {visible ? <EyeIcon /> : <EyeClosedIcon />}
          </IconButton>
          <IconButton
            onClick={() =>
              onLayerAction({ action: "remove", payload: { id: id } })
            }
          >
            <XIcon />
          </IconButton>
        </ButtonGroup>
      </Flex>

      {symbology}
      {children}
    </Flex>
  );
}

function LegendOpacityControl(props: {
  value: number;
  onValueChange: (value: number) => void;
}) {
  const { value, onValueChange } = props;
  const [draftValue, setDraftValue] = useState(value);

  useEffect(() => {
    setDraftValue(value);
  }, [value]);

  return (
    <Popover.Root positioning={{ placement: "top" }} size="xs">
      <Popover.Trigger asChild>
        <IconButton>
          <CircleHalfIcon />
        </IconButton>
      </Popover.Trigger>
      <Popover.Positioner>
        <Popover.Content maxW="15rem">
          <Popover.Arrow>
            <Popover.ArrowTip />
          </Popover.Arrow>
          <Popover.Body>
            <Slider.Root
              value={[draftValue]}
              onValueChange={(v) => setDraftValue(v.value[0])}
              onValueChangeEnd={() => onValueChange(draftValue)}
              size="sm"
            >
              <Slider.Control>
                <Slider.Track>
                  <Slider.Range />
                </Slider.Track>
                <Slider.Thumb index={0}>
                  <Slider.DraggingIndicator
                    layerStyle="fill.solid"
                    top="6"
                    rounded="sm"
                    px="1.5"
                  >
                    <Slider.ValueText />
                  </Slider.DraggingIndicator>
                </Slider.Thumb>
                <Slider.Marks
                  marks={[
                    { value: 0, label: "0%" },
                    { value: 50, label: "50%" },
                    { value: 100, label: "100%" },
                  ]}
                />
              </Slider.Control>
            </Slider.Root>
          </Popover.Body>
        </Popover.Content>
      </Popover.Positioner>
    </Popover.Root>
  );
}

type ColorList = string[];
type ColorValueList<T = number | string> = { color: string; value: T }[];

type LegendSwatchItem = ColorValueList[number] &
  (
    | {
        type: "line" | "dashed";
        icon?: never;
      }
    | {
        type?: never;
        icon?: never;
      }
    | {
        type: "icon";
        icon: ReactNode;
      }
  );

/**
 * LegendSwatches component rendering a vertical list of color swatches with
 * labels.
 * @param props.items - Array of color/value pairs to display.
 */
export function LegendSwatches(props: { items: LegendSwatchItem[] }) {
  const { items } = props;

  return (
    <Flex
      as="ul"
      gap={2}
      m={0}
      p={0}
      w="100%"
      listStyle="none"
      flexDir="column"
    >
      {items.map((item) => (
        <Flex as="li" gap={2} alignItems="center" key={item.color}>
          {item.type === "line" ? (
            <Box width={4} mt="1px" borderBottom={`2px solid ${item.color}`} />
          ) : item.type === "dashed" ? (
            <Box width={4} mt="1px" borderBottom={`2px dashed ${item.color}`} />
          ) : item.type === "icon" ? (
            <Flex boxSize={4} alignItems="center" justifyContent="center">
              {item.icon}
            </Flex>
          ) : (
            <ColorSwatch size="xs" value={item.color} />
          )}{" "}
          {item.value}
        </Flex>
      ))}
    </Flex>
  );
}

/**
 * LegendCategorical component rendering a grid of categorical color blocks with
 * labels.
 * @param props.items - Array of color/value pairs to display.
 */
export function LegendCategorical(props: { items: ColorValueList }) {
  const { items } = props;

  return (
    <Grid
      as="ul"
      gap={1}
      m={0}
      p={0}
      w="100%"
      listStyle="none"
      gridAutoFlow="column"
      gridAutoColumns="minmax(0, 1fr)"
    >
      {items.map((item) => (
        <Tooltip.Root
          key={item.color}
          positioning={{ placement: "top" }}
          openDelay={50}
        >
          <Tooltip.Trigger>
            <GridItem as="li" flexDir="column" maxW="100%">
              <ColorBlock color={item.color} borderRadius="3px" />
              <Text textOverflow="ellipsis" wordWrap="normal" overflow="hidden">
                {item.value}
              </Text>
            </GridItem>
          </Tooltip.Trigger>
          <Tooltip.Positioner>
            <Tooltip.Content>
              <Tooltip.Arrow>
                <Tooltip.ArrowTip />
              </Tooltip.Arrow>
              {item.value}
            </Tooltip.Content>
          </Tooltip.Positioner>
        </Tooltip.Root>
      ))}
    </Grid>
  );
}

/**
 * LegendSequential component rendering a sequential color ramp with min/max
 * labels.
 * @param props.min - Minimum value label.
 * @param props.max - Maximum value label.
 * @param props.color - Array of colors or color/value stops for the ramp.
 */
export function LegendSequential(props: {
  min: number;
  max: number;
  color: ColorList | ColorValueList<number>;
}) {
  const { min, max, color } = props;

  const colorRamp = makeColorRamp(color);
  if (!colorRamp) return null;

  return (
    <Box w="100%">
      <ColorBlock color={colorRamp} />
      <Flex justifyContent="space-between" fontSize="xs">
        <VisuallyHidden>From</VisuallyHidden>
        <Text as="span">{min}</Text>
        <VisuallyHidden>to</VisuallyHidden>
        <Text as="span">{max}</Text>
      </Flex>
    </Box>
  );
}

/**
 * LegendDivergent component rendering a divergent color ramp with min/zero/max
 * labels.
 * @param props.min - Minimum value label.
 * @param props.max - Maximum value label.
 * @param props.color - Array of colors or color/value stops for the ramp.
 */
export function LegendDivergent(props: {
  min: number;
  max: number;
  color: ColorList | ColorValueList<number>;
}) {
  const { min, max, color } = props;

  const reversedColors = [...color].reverse().slice(1);
  const colorRamp = makeColorRamp(
    color.concat(reversedColors) as ColorList | ColorValueList<number>
  );
  if (!colorRamp) return null;

  return (
    <Box w="100%">
      <ColorBlock color={colorRamp} />
      <Flex justifyContent="space-between" fontSize="xs">
        <VisuallyHidden>From</VisuallyHidden>
        <Text as="span">{min}</Text>
        <Text as="span">0</Text>
        <VisuallyHidden>to</VisuallyHidden>
        <Text as="span">{max}</Text>
      </Flex>
    </Box>
  );
}

/**
 * ColorBlock component rendering a horizontal color bar (gradient or solid).
 * @param props.color - CSS color or gradient string.
 */
function ColorBlock(props: {
  color: string;
  borderRadius?: BoxProps["borderRadius"];
}) {
  const { color, borderRadius = "full" } = props;

  return (
    <Box
      aria-hidden
      height={2}
      width="100%"
      bg={color}
      borderRadius={borderRadius}
      boxShadow="inset 0 0 0 1px {colors.gray.100}"
      h={2}
    />
  );
}

/**
 * Utility to generate a CSS linear-gradient string from a color list or color/value stops.
 * @param colors - Array of color strings or color/value objects.
 * @returns CSS linear-gradient string.
 */
function makeColorRamp(colors: ColorValueList | ColorList) {
  if (typeof colors[0] === "string") {
    return `linear-gradient(to right, ${colors.join(", ")})`;
  }

  if (colors[0].color && typeof colors[0].value === "number") {
    // Create a linear scale.
    const c = colors as ColorValueList<number>;
    const e = extent(c, (d) => d.value) as [number, number];
    const scale = scaleLinear().domain(e).range([0, 100]);

    return `linear-gradient(to right, ${c
      .map((stop) => `${stop.color} ${scale(stop.value)}%`)
      .join(", ")})`;
  }
}

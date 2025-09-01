import { useState } from "react";
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
  Slider,
  Text,
  VisuallyHidden,
} from "@chakra-ui/react";
import {
  CircleHalfIcon,
  DotsSixVerticalIcon,
  EyeIcon,
  InfoIcon,
  XIcon,
} from "@phosphor-icons/react";
import { Reorder, useDragControls } from "motion/react";
import { extent, scaleLinear } from "d3";

const ChReorderGroup = chakra(Reorder.Group);
const ChReorderItem = chakra(Reorder.Item);

const marks = [
  { value: 0, label: "2010" },
  { value: 20, label: "2012" },
  { value: 40, label: "2014" },
  { value: 60, label: "2016" },
  { value: 80, label: "2018" },
  { value: 100, label: "2020" },
];

const layers = [
  {
    id: "l1",
  },
  {
    id: "l2",
  },
];

/**
 * Legend component displaying a draggable, reorderable list of map layers with
 * legend details.
 */
export function Legend() {
  const [items, setItems] = useState(layers);

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
        values={items}
        onReorder={setItems}
        listStyleType="none"
        fontSize="xs"
        p={0}
        m={0}
        w="100%"
      >
        {items.map((item) => (
          <Item key={item.id} item={item} />
        ))}
      </ChReorderGroup>
    </Flex>
  );
}

/**
 * Item component representing a single draggable/reorderable layer entry in the
 * legend.
 */
function Item(props) {
  const { item } = props;

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
        mt={1}
        cursor="grab"
        onPointerDown={(event) => dragControls.start(event)}
      >
        <DotsSixVerticalIcon />
      </IconButton>
      <LayerInfo />
    </ChReorderItem>
  );
}

/**
 * LayerInfo component displaying details, controls, and legend swatches for a
 * map layer.
 */
function LayerInfo(props) {
  return (
    <Flex flexDir="column" gap={2} pr={4}>
      <Flex justifyContent="space-between" gap={2} alignItems="center" mr={-4}>
        <Flex gap={1} alignItems="center" fontSize="sm">
          <Heading as="h3" size="sm" m={0}>
            Tree Cover loss
          </Heading>{" "}
          <Text>2022-2025</Text>
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
          <IconButton>
            <CircleHalfIcon />
          </IconButton>
          <IconButton>
            <EyeIcon />
          </IconButton>
          <IconButton>
            <XIcon />
          </IconButton>
        </ButtonGroup>
      </Flex>

      <LegendSwatches
        items={[
          {
            color: "#4CAF50",
            value: "Estimated Tree Cover Loss 4PSG 932 (hsa)",
          },
          {
            color: "#FFC107",
            value: "Estimated burn area",
          },
        ]}
      />

      <LegendCategorical
        items={[
          { color: "#4CAF50", value: "Forest" },
          { color: "#FFC107", value: "Grassland" },
          { color: "#2196F3", value: "Wetland" },
          { color: "#9E9E9E", value: "Barren" },
          { color: "#F44336", value: "Urban" },
          { color: "#0a986b", value: "Tundra" },
          { color: "#e4e0e0", value: "Snowy" },
        ]}
      />

      <LegendSequential
        min={10}
        max={100}
        color={["#4CAF50", "#FFC107", "#2196F3"]}
      />

      <LegendSequential
        min={10}
        max={100}
        color={[
          { color: "#4CAF50", value: 10 },
          { color: "#FFC107", value: 80 },
          { color: "#2196F3", value: 95 },
        ]}
      />

      <LegendDivergent
        min={-1}
        max={1}
        color={["#2196F3", "#b41919", "#ff00dd"]}
      />

      <Slider.Root width="100%">
        <Slider.Control>
          <Slider.Track>
            <Slider.Range />
          </Slider.Track>
          <Slider.Thumbs />
          <Slider.Marks marks={marks} />
        </Slider.Control>
      </Slider.Root>
      <Text>Tree cover loss is not always deforestation</Text>
    </Flex>
  );
}

type ColorList = string[];
type ColorValueList<T = number | string> = { color: string; value: T }[];

/**
 * LegendSwatches component rendering a vertical list of color swatches with
 * labels.
 * @param props.items - Array of color/value pairs to display.
 */
function LegendSwatches(props: { items: ColorValueList }) {
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
          <ColorSwatch size="xs" value={item.color} /> {item.value}
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
function LegendCategorical(props: { items: ColorValueList }) {
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
        <GridItem as="li" flexDir="column" maxW="100%" key={item.color}>
          <ColorBlock color={item.color} borderRadius="3px" />
          <Text textOverflow="ellipsis" wordWrap="normal" overflow="hidden">
            {item.value}
          </Text>
        </GridItem>
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
function LegendSequential(props: {
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
function LegendDivergent(props: {
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

import { useEffect, useRef, useState } from "react";
import { Box, Flex, Text } from "@chakra-ui/react";

import { Tooltip } from "@/app/components/ui/tooltip";

import type { RankedArea, Ranking } from "../model/ranking";
import {
  rowValueText,
  tooltipLines,
  valueReserve,
} from "../model/ranking-text";

/**
 * Width of the name column by the width of the chart's own box (a container
 * query, so a card on a narrow chat panel and one on a wide dashboard each get
 * the name column that fits).
 */
const NAME_WIDTH = { base: "112px", wide: "160px", wider: "220px" };
const NAME_COLUMN = "--ranking-name-width";
/** Marks a row, so a tap can tell its own row from another place. */
const ROW_ATTRIBUTE = "data-ranking-row";

/**
 * A tap opens the row's tooltip and a tap elsewhere closes it: Ark's tooltip
 * does not open on touch. Only touch is handled here, so a mouse hover and
 * keyboard focus keep the tooltip's own behavior.
 *
 * The same tap would close it again: the tooltip closes on `click` and on the
 * `pointerleave` a touch sends after the finger lifts. So while the tooltip is
 * open from a tap, the tooltip's own close requests are ignored and only a
 * pointer down outside the row closes it.
 */
function useTouchTooltip(rowId: string) {
  const [open, setOpen] = useState(false);
  const openedByTouch = useRef(false);

  useEffect(() => {
    if (!open) return;
    const closeOutside = (event: PointerEvent) => {
      const row = (event.target as Element).closest(`[${ROW_ATTRIBUTE}]`);
      if (row?.getAttribute(ROW_ATTRIBUTE) === rowId) return;
      openedByTouch.current = false;
      setOpen(false);
    };
    document.addEventListener("pointerdown", closeOutside);
    return () => document.removeEventListener("pointerdown", closeOutside);
  }, [open, rowId]);

  return {
    open,
    onOpenChange: ({ open }: { open: boolean }) => {
      if (!open && openedByTouch.current) return;
      setOpen(open);
    },
    onPointerUp: (event: React.PointerEvent) => {
      if (event.pointerType !== "touch") return;
      openedByTouch.current = true;
      setOpen(true);
    },
  };
}

function RankingRow({
  area,
  ranking,
  color,
  reserve,
  print,
}: {
  area: RankedArea;
  ranking: Ranking;
  color: string;
  reserve: string;
  print: boolean;
}) {
  const touch = useTouchTooltip(area.aoiId);
  const [fullName, figures] = tooltipLines(area, ranking);

  const row = (
    <Box
      as="li"
      {...{ [ROW_ATTRIBUTE]: area.aoiId }}
      listStyleType="none"
      display="grid"
      gridTemplateColumns={`20px var(${NAME_COLUMN}) minmax(0, 1fr)`}
      columnGap="8px"
      alignItems="center"
      fontSize="12px"
      lineHeight="16px"
      rounded="2px"
      tabIndex={print ? undefined : 0}
      aria-label={print ? undefined : `${fullName}: ${figures}`}
      onPointerUp={print ? undefined : touch.onPointerUp}
      _focusVisible={{
        outline: "2px solid",
        outlineColor: "primary.focusRing",
        outlineOffset: "2px",
      }}
      css={{ fontVariantNumeric: "tabular-nums" }}
    >
      <Text color="fg.muted" textAlign="end">
        {area.rank}
      </Text>
      <Text color="neutral.700" truncate>
        {area.name}
        {area.qualifier !== undefined && (
          <Text as="span" color="fg.muted">
            {` · ${area.qualifier}`}
          </Text>
        )}
      </Text>
      <Flex align="center" gap="6px" minW={0}>
        <Box
          h="14px"
          flexShrink={0}
          rounded="2px"
          style={{
            width: `max(2px, calc((100% - ${reserve}) * ${area.value / ranking.bars[0].value}))`,
            backgroundColor: color,
          }}
        />
        <Text color="fg.muted" whiteSpace="nowrap">
          {rowValueText(area, ranking, print)}
        </Text>
      </Flex>
    </Box>
  );

  if (print) return row;
  return (
    <Tooltip
      content={
        <>
          <Text fontWeight="medium">{fullName}</Text>
          <Text>{figures}</Text>
        </>
      }
      variant="dark"
      showArrow
      openDelay={150}
      positioning={{ placement: "top-start" }}
      lazyMount
      unmountOnExit
      open={touch.open}
      onOpenChange={touch.onOpenChange}
    >
      {row}
    </Tooltip>
  );
}

/**
 * Ranked area bars: rank, name, a bar as long as its share of the largest value, and
 * the value. In `print` every row is plain: no tooltip, no tab stop, and the
 * share printed after the value.
 */
export function RankingBars({
  rows,
  ranking,
  color,
  print = false,
}: {
  rows: RankedArea[];
  ranking: Ranking;
  color: string;
  print?: boolean;
}) {
  const reserve = valueReserve(ranking, print);
  return (
    <Flex
      as="ol"
      direction="column"
      // The card has no fixed height (the 280px cap is the generic chart's, and
      // this body does not use it), so the stack grows: page share 26 + 8 + 8,
      // 10 rows (160 + 9 * 5 = 205), 8, the 32px pager = 287 on a full first
      // page. A last page with 10 rows and a two-line no-loss note (8 + 32)
      // is 327.
      gap="5px"
      m={0}
      p={0}
      aria-label="Areas, largest first"
      css={{
        [NAME_COLUMN]: NAME_WIDTH.base,
        "@container (min-width: 560px)": { [NAME_COLUMN]: NAME_WIDTH.wide },
        "@container (min-width: 900px)": { [NAME_COLUMN]: NAME_WIDTH.wider },
      }}
    >
      {rows.map((area) => (
        <RankingRow
          key={area.aoiId}
          area={area}
          ranking={ranking}
          color={color}
          reserve={reserve}
          print={print}
        />
      ))}
    </Flex>
  );
}

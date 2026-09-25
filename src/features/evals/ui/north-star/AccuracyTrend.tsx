"use client";

import { useState } from "react";
import { Box, Button, Flex, Table, Text, Wrap } from "@chakra-ui/react";
import {
  Area,
  CartesianGrid,
  ComposedChart,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { fmtPct } from "../../lib/format";
import { CHART_CHROME } from "../charts/palette";
import { fmtDay, markerNote, TREND_HINT, TREND_TITLE } from "./copy";
import type { TrendPoint } from "./model";
import { Panel } from "./Section";
import { fmtRange } from "./tokens";

const ACCENT = "var(--chakra-colors-primary-solid)";
const DIP = "var(--chakra-colors-orange-solid)";
const SURFACE = "var(--chakra-colors-bg-panel)";

function pointLabel(point: TrendPoint): string {
  return `${fmtDay(point.started)} ${point.started.slice(11, 16)}`;
}

interface DotProps {
  cx?: number;
  cy?: number;
  payload?: { runId: string };
}

/**
 * Headline accuracy per composition snapshot. Ringed points carry derived
 * change markers (orange for dips); selecting one — on the chart or in the
 * chip row, which is the keyboard path — opens its note below.
 */
export function AccuracyTrend({
  points,
  showRange,
}: {
  readonly points: readonly TrendPoint[];
  readonly showRange: boolean;
}) {
  const marked = points.filter((point) => point.marker);
  const [selected, setSelected] = useState<string | null>(null);
  const active = marked.find((point) => point.runId === selected);

  const data = points.map((point) => ({
    runId: point.runId,
    label: pointLabel(point),
    rate: point.stat.rate,
    range: [point.stat.ciLow, point.stat.ciHigh],
  }));
  const floor = Math.min(
    ...points.map((p) => (showRange ? p.stat.ciLow : (p.stat.rate ?? 1)))
  );
  const yMin = Math.max(0, Math.floor((floor - 0.05) * 10) / 10);

  function renderDot({ cx, cy, payload }: DotProps) {
    if (cx === undefined || cy === undefined || !payload) return <g />;
    const point = points.find((p) => p.runId === payload.runId);
    const marker = point?.marker;
    if (!marker) {
      return (
        <circle key={payload.runId} cx={cx} cy={cy} r={2.5} fill={ACCENT} />
      );
    }
    const dip = marker.kinds.includes("dip");
    const isActive = selected === payload.runId;
    return (
      <g
        key={payload.runId}
        style={{ cursor: "pointer" }}
        onClick={() => setSelected(payload.runId)}
      >
        <circle cx={cx} cy={cy} r={14} fill="transparent" />
        <circle
          cx={cx}
          cy={cy}
          r={6}
          fill={SURFACE}
          stroke={dip ? DIP : ACCENT}
          strokeWidth={isActive ? 3.5 : 2}
        />
      </g>
    );
  }

  const note = active
    ? markerNote(active.marker!, active)
    : { title: "Change markers", body: TREND_HINT, tone: "neutral" as const };

  return (
    <Panel p={{ base: 4, md: 5 }}>
      <Flex justify="space-between" align="baseline" gap={2} wrap="wrap">
        <Text fontSize="sm" fontWeight="bold">
          {TREND_TITLE}
        </Text>
        <Text fontSize="xs" color="fg.subtle">
          {points.length} {points.length === 1 ? "snapshot" : "snapshots"}
        </Text>
      </Flex>
      <Box mt={2} h="220px">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart
            data={data}
            margin={{ top: 12, right: 12, bottom: 0, left: 0 }}
          >
            <CartesianGrid
              stroke={CHART_CHROME.grid}
              vertical={false}
              strokeDasharray="3 3"
            />
            <XAxis
              dataKey="label"
              axisLine={false}
              tickLine={false}
              minTickGap={32}
              tick={{
                fontSize: CHART_CHROME.tickFontSize,
                fill: CHART_CHROME.axisTick,
              }}
            />
            <YAxis
              domain={[yMin, 1]}
              tickFormatter={(value: number) => fmtPct(value, 0)}
              axisLine={false}
              tickLine={false}
              width={52}
              tick={{
                fontSize: CHART_CHROME.tickFontSize,
                fill: CHART_CHROME.axisTick,
              }}
            />
            <Tooltip
              formatter={(value, name) =>
                name === "range" && Array.isArray(value)
                  ? fmtRange(Number(value[0]), Number(value[1]))
                  : fmtPct(typeof value === "number" ? value : null)
              }
            />
            {showRange ? (
              <Area
                dataKey="range"
                name="range"
                stroke="none"
                fill={ACCENT}
                fillOpacity={0.12}
                isAnimationActive={false}
              />
            ) : null}
            <Line
              dataKey="rate"
              name="accuracy"
              stroke={ACCENT}
              strokeWidth={2.5}
              dot={renderDot}
              activeDot={false}
              isAnimationActive={false}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </Box>

      {marked.length ? (
        <Wrap gap={1.5} mt={2} role="group" aria-label="Change markers">
          {marked.map((point) => (
            <Button
              key={point.runId}
              size="2xs"
              variant={selected === point.runId ? "solid" : "outline"}
              colorPalette={
                point.marker!.kinds.includes("dip") ? "orange" : "primary"
              }
              onClick={() => setSelected(point.runId)}
            >
              {markerNote(point.marker!, point).title} · {pointLabel(point)}
            </Button>
          ))}
        </Wrap>
      ) : null}

      <Box
        mt={3}
        pt={3}
        borderTopWidth="1px"
        borderColor="border.subtle"
        fontSize="sm"
        color="fg.muted"
        minH="3em"
        aria-live="polite"
      >
        <Text
          fontFamily="mono"
          fontSize="2xs"
          letterSpacing="0.08em"
          textTransform="uppercase"
          color={note.tone === "dip" ? "orange.fg" : "fg.subtle"}
        >
          {active ? `${note.title} · ${pointLabel(active)}` : note.title}
        </Text>
        {note.body}
      </Box>

      <Box as="details" mt={3} fontSize="xs" color="fg.muted">
        <Box
          as="summary"
          cursor="pointer"
          color="primary.fg"
          fontWeight="semibold"
          w="max-content"
        >
          The figures behind this chart
        </Box>
        <Box overflowX="auto" mt={2}>
          <Table.Root size="sm" variant="line">
            <Table.Header>
              <Table.Row>
                <Table.ColumnHeader>Snapshot</Table.ColumnHeader>
                <Table.ColumnHeader textAlign="end">Rate</Table.ColumnHeader>
                <Table.ColumnHeader textAlign="end">
                  Likely range
                </Table.ColumnHeader>
                <Table.ColumnHeader textAlign="end">
                  Questions
                </Table.ColumnHeader>
                <Table.ColumnHeader>Note</Table.ColumnHeader>
              </Table.Row>
            </Table.Header>
            <Table.Body>
              {points.map((point) => (
                <Table.Row key={point.runId}>
                  <Table.Cell whiteSpace="nowrap">
                    {pointLabel(point)}
                  </Table.Cell>
                  <Table.Cell textAlign="end">
                    {fmtPct(point.stat.rate)}
                  </Table.Cell>
                  <Table.Cell textAlign="end" whiteSpace="nowrap">
                    {fmtRange(point.stat.ciLow, point.stat.ciHigh)}
                  </Table.Cell>
                  <Table.Cell textAlign="end">{point.stat.n}</Table.Cell>
                  <Table.Cell>
                    {point.marker ? markerNote(point.marker, point).title : ""}
                  </Table.Cell>
                </Table.Row>
              ))}
            </Table.Body>
          </Table.Root>
        </Box>
      </Box>
    </Panel>
  );
}

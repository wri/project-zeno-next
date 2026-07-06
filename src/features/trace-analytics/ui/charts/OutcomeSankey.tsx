"use client";

/**
 * Outcome flow Sankey: all queries → "user sees a response" junction →
 * outcome terminals, with count · share and Δpp-vs-previous-window chips
 * rendered as direct labels (every node is labeled; color is never the only
 * identity channel).
 */

import { ResponsiveContainer, Sankey, Tooltip } from "recharts";
import type {
  FlowTerminal,
  OutcomeFlow,
} from "../../lib/analytics/outcomeRefine";
import { FLOW_NODE_COLORS } from "./palette";
import { ChartTooltip } from "./ChartTooltip";
import { formatCount } from "../../lib/format";

const NODE_LABELS: Readonly<Record<string, string>> = {
  HARD_ERROR: "Hard error",
  NO_PROMPT: "UI event (no prompt)",
  SOFT_ERROR: "Soft error",
  DEFER: "Defer",
  DEFER_OTHER: "Clarify / other defer",
  CONTEXT_ANSWER: "Answered from context",
  ANSWER_DEGRADED: "Answered (internal errors)",
  ANSWER_CLEAN: "Attempted answer",
  ANSWER: "Attempted answer",
};

/** Whether a rising share is good news (colors the Δ chip). */
const UP_IS_GOOD: Readonly<Record<string, boolean | undefined>> = {
  ANSWER: true,
  ANSWER_CLEAN: true,
  CONTEXT_ANSWER: true,
  RESPONDED: true,
  HARD_ERROR: false,
  SOFT_ERROR: false,
};

const INK = "#13171A";
const INK_MUTED = "#656E7B";
const INK_SUBTLE = "#979FA8";
const GOOD = "#00A651";
const BAD = "#E23A22";

interface FlowNodeDatum {
  readonly name: string;
  /**
   * "spacer" nodes are invisible waypoints in the junction column: routing a
   * source→terminal flow through one gives it its own vertical lane, so the
   * band never crosses the junction's fan-out.
   */
  readonly kind: "source" | "mid" | "terminal" | "spacer";
  readonly key: string;
  readonly sub: string;
  readonly chip: { readonly text: string; readonly color: string } | null;
  readonly annotation: string | null;
}

interface FlowNodeProps {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
  readonly payload: FlowNodeDatum;
}

interface FlowLinkProps {
  readonly sourceX: number;
  readonly sourceY: number;
  readonly sourceControlX: number;
  readonly targetX: number;
  readonly targetY: number;
  readonly targetControlX: number;
  readonly linkWidth: number;
  readonly payload: { readonly target: FlowNodeDatum };
}

function deltaChip(deltaPp: number | null, key: string): FlowNodeDatum["chip"] {
  if (deltaPp === null || !Number.isFinite(deltaPp)) return null;
  if (Math.abs(deltaPp) < 0.05) {
    return { text: "(±0.0)", color: INK_SUBTLE };
  }
  const up = deltaPp > 0;
  const text = `(${up ? "+" : "−"}${Math.abs(deltaPp).toFixed(1)}${up ? "▲" : "▼"})`;
  const upIsGood = UP_IS_GOOD[key];
  if (upIsGood === undefined) return { text, color: INK_SUBTLE };
  return { text, color: up === upIsGood ? GOOD : BAD };
}

function subLine(count: number, share: number): string {
  return `${formatCount(count)} · ${(share * 100).toFixed(1)}%`;
}

function FlowNode({ x, y, width, height, payload }: FlowNodeProps) {
  const color = FLOW_NODE_COLORS[payload.key] ?? INK_MUTED;
  const midY = y + height / 2;

  if (payload.kind === "spacer") {
    // Matches the links' stroke opacity so the band reads as one ribbon.
    return (
      <rect
        x={x}
        y={y}
        width={width}
        height={height}
        fill={color}
        fillOpacity={0.4}
      />
    );
  }

  return (
    <g>
      <rect x={x} y={y} width={width} height={height} fill={color} rx={2} />
      {payload.kind === "terminal" ? (
        <g textAnchor="start" fontSize={11}>
          <text
            x={x + width + 10}
            y={midY - 4}
            fontSize={12}
            fontWeight={600}
            fill={INK}
          >
            {payload.name}
          </text>
          <text x={x + width + 10} y={midY + 11} fill={INK_MUTED}>
            {payload.sub}
            {payload.chip ? (
              <tspan fill={payload.chip.color}> {payload.chip.text}</tspan>
            ) : null}
          </text>
          {payload.annotation ? (
            <text
              x={x + width + 10}
              y={midY + 25}
              fontSize={10}
              fill={INK_SUBTLE}
            >
              {payload.annotation}
            </text>
          ) : null}
        </g>
      ) : null}
      {payload.kind === "source" ? (
        <g textAnchor="end" fontSize={11}>
          <text
            x={x - 10}
            y={midY - 4}
            fontSize={12}
            fontWeight={600}
            fill={INK}
          >
            {payload.name}
          </text>
          <text x={x - 10} y={midY + 11} fill={INK_MUTED}>
            {payload.sub}
          </text>
        </g>
      ) : null}
      {payload.kind === "mid" ? (
        <g textAnchor="middle" fontSize={11}>
          <text
            x={x + width / 2}
            y={y + height + 16}
            fontSize={12}
            fontWeight={600}
            fill={INK}
          >
            {payload.name}
          </text>
          <text x={x + width / 2} y={y + height + 30} fill={INK_MUTED}>
            {payload.sub}
            {payload.chip ? (
              <tspan fill={payload.chip.color}> {payload.chip.text}</tspan>
            ) : null}
          </text>
        </g>
      ) : null}
    </g>
  );
}

function FlowLink({
  sourceX,
  sourceY,
  sourceControlX,
  targetX,
  targetY,
  targetControlX,
  linkWidth,
  payload,
}: FlowLinkProps) {
  const target = payload.target;
  const color =
    target.kind === "mid"
      ? "#D5D9DE"
      : (FLOW_NODE_COLORS[target.key] ?? INK_MUTED);
  return (
    <path
      d={`M${sourceX},${sourceY} C${sourceControlX},${sourceY} ${targetControlX},${targetY} ${targetX},${targetY}`}
      fill="none"
      stroke={color}
      strokeWidth={Math.max(1, linkWidth)}
      strokeOpacity={0.4}
    />
  );
}

interface OutcomeSankeyProps {
  readonly flow: OutcomeFlow;
  readonly height?: number;
}

export function OutcomeSankey({ flow, height = 440 }: OutcomeSankeyProps) {
  if (!flow.total) return null;

  const terminalNode = (t: FlowTerminal): FlowNodeDatum => ({
    name: NODE_LABELS[t.key] ?? t.key,
    kind: "terminal",
    key: t.key,
    sub: subLine(t.count, t.share),
    chip: deltaChip(t.deltaPp, t.key),
    annotation: t.annotation,
  });

  const nodes: FlowNodeDatum[] = [
    {
      name: "All queries",
      kind: "source",
      key: "SOURCE",
      sub: `${formatCount(flow.total)} traces`,
      chip: null,
      annotation: null,
    },
  ];
  const links: { source: number; target: number; value: number }[] = [];

  // Source-direct flows (hard error above the junction, UI events below it)
  // route through invisible spacer waypoints in the junction column: each
  // band gets its own vertical lane instead of cutting across the junction's
  // fan-out. Insertion order fixes the column stacking top → bottom.
  const spacerNode = (t: FlowTerminal): FlowNodeDatum => ({
    name: NODE_LABELS[t.key] ?? t.key,
    kind: "spacer",
    key: t.key,
    sub: "",
    chip: null,
    annotation: null,
  });
  const pushSourceDirect = (t: FlowTerminal) => {
    nodes.push(spacerNode(t));
    const spacer = nodes.length - 1;
    links.push({ source: 0, target: spacer, value: t.count });
    nodes.push(terminalNode(t));
    links.push({ source: spacer, target: nodes.length - 1, value: t.count });
  };

  const hardError = flow.sourceDirect.find((t) => t.key === "HARD_ERROR");
  const noPrompt = flow.sourceDirect.find((t) => t.key === "NO_PROMPT");
  if (hardError) pushSourceDirect(hardError);

  let midIndex = -1;
  if (flow.responded > 0) {
    nodes.push({
      name: "User sees a response",
      kind: "mid",
      key: "RESPONDED",
      sub: subLine(flow.responded, flow.respondedShare),
      chip: deltaChip(flow.respondedDeltaPp, "RESPONDED"),
      annotation: null,
    });
    midIndex = nodes.length - 1;
    links.push({ source: 0, target: midIndex, value: flow.responded });
  }
  for (const t of flow.viaResponse) {
    nodes.push(terminalNode(t));
    links.push({ source: midIndex, target: nodes.length - 1, value: t.count });
  }
  if (noPrompt) pushSourceDirect(noPrompt);

  return (
    <ResponsiveContainer width="100%" height={height}>
      <Sankey
        data={{
          nodes: nodes.map((n) => ({ ...n })),
          links: [...links],
        }}
        node={(props: unknown) => <FlowNode {...(props as FlowNodeProps)} />}
        link={(props: unknown) => <FlowLink {...(props as FlowLinkProps)} />}
        nodeWidth={12}
        nodePadding={36}
        iterations={0}
        margin={{ top: 20, bottom: 44, left: 130, right: 290 }}
      >
        <Tooltip
          content={<ChartTooltip formatValue={(v) => formatCount(v)} />}
        />
      </Sankey>
    </ResponsiveContainer>
  );
}

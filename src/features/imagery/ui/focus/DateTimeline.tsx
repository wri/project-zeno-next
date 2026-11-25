import { useRef, useState, type PointerEvent } from "react";

const DAY_MS = 86_400_000;
/**
 * Days the timeline shows: four windows wide, so the window band and its
 * scenes stay readable, and at least four months for context.
 */
const spanDays = (windowDays: number) => Math.max(120, windowDays * 2 * 4);

const W = 328;
const PAD_X = 8;
const PLOT_TOP = 10;
const PLOT_BOTTOM = 56;
const AXIS_Y = 62;
const H = 80;

const toDay = (iso: string) =>
  Math.round(Date.parse(`${iso.slice(0, 10)}T00:00:00Z`) / DAY_MS);
const fromDay = (day: number) =>
  new Date(day * DAY_MS).toISOString().slice(0, 10);

/** The last day the timeline shows when centred on `target`. */
const viewEndFor = (target: number, today: number, span: number) =>
  Math.min(today, target + Math.round(span / 2));

/** SVG text size in user units; inline, since page CSS beats attributes. */
const textStyle = (size: number, weight = 400) => ({
  fontSize: `${size}px`,
  fontWeight: weight,
  fontFamily: "var(--chakra-fonts-body)",
});

export interface TimelineScene {
  id: string;
  datetime: string;
  cloudCover: number;
  onMap: boolean;
}

/**
 * The imagery date as a timeline: the search window is a band
 * around the target date, and each scene the search found is a dot (left to
 * right by date, top to bottom from clear to cloudy). The dashed line is the
 * cloud limit. Click or drag to move the target date.
 */
export function DateTimeline(props: {
  targetDate: string;
  windowDays: number;
  maxCloudCover: number;
  today: string;
  firstDate: string;
  scenes: TimelineScene[];
  hoveredId: string | null;
  onChange: (date: string) => void;
}) {
  const {
    targetDate,
    windowDays,
    maxCloudCover,
    today,
    firstDate,
    scenes,
    hoveredId,
    onChange,
  } = props;
  const svgRef = useRef<SVGSVGElement>(null);
  const [dragging, setDragging] = useState(false);
  const todayDay = toDay(today);
  const firstDay = toDay(firstDate);
  const target = toDay(targetDate);
  const span = spanDays(windowDays);
  const [view, setView] = useState(() => ({
    end: viewEndFor(target, todayDay, span),
    span,
  }));
  const viewEnd = view.end;

  // Keep the target in view, adjusted during render (no effect). Not while
  // the user drags: the view would shift under the pointer.
  if (
    view.span !== span ||
    (!dragging && (target < viewEnd - span + 7 || target > viewEnd))
  ) {
    setView({ end: viewEndFor(target, todayDay, span), span });
  }

  const start = viewEnd - span;
  const x = (day: number) => PAD_X + ((day - start) / span) * (W - 2 * PAD_X);
  const y = (cloud: number) =>
    PLOT_TOP +
    (Math.min(Math.max(cloud, 0), 100) / 100) * (PLOT_BOTTOM - PLOT_TOP);
  const clampX = (value: number) => Math.min(Math.max(value, PAD_X), W - PAD_X);

  const dayAt = (clientX: number) => {
    const rect = svgRef.current!.getBoundingClientRect();
    const svgX = ((clientX - rect.left) / rect.width) * W;
    const day = Math.round(start + ((svgX - PAD_X) / (W - 2 * PAD_X)) * span);
    return Math.min(Math.max(day, firstDay, start), todayDay, viewEnd);
  };
  const pick = (clientX: number) => {
    const day = dayAt(clientX);
    if (day !== target) onChange(fromDay(day));
  };
  const onPointerDown = (e: PointerEvent<SVGRectElement>) => {
    setDragging(true);
    e.currentTarget.setPointerCapture(e.pointerId);
    pick(e.clientX);
  };
  const onPointerMove = (e: PointerEvent<SVGRectElement>) => {
    if (dragging) pick(e.clientX);
  };
  const endDrag = () => {
    setDragging(false);
  };

  // Month ticks; January carries the year.
  const ticks: { day: number; label: string; year: boolean }[] = [];
  const cursor = new Date(start * DAY_MS);
  cursor.setUTCDate(1);
  cursor.setUTCMonth(cursor.getUTCMonth() + 1);
  // Label every month while they fit (~26 px each), else every 2nd or 3rd.
  const monthPx = ((W - 2 * PAD_X) * 30) / span;
  const every = monthPx >= 26 ? 1 : monthPx >= 13 ? 2 : 3;
  while (cursor.getTime() / DAY_MS <= viewEnd) {
    const month = cursor.getUTCMonth();
    if (month % every === 0)
      ticks.push({
        day: Math.round(cursor.getTime() / DAY_MS),
        label:
          month === 0
            ? String(cursor.getUTCFullYear())
            : cursor.toLocaleDateString("en-GB", {
                month: "short",
                timeZone: "UTC",
              }),
        year: month === 0,
      });
    cursor.setUTCMonth(month + 1);
  }

  const bandStart = clampX(x(target - windowDays));
  const bandEnd = clampX(x(Math.min(target + windowDays, todayDay)));
  const cloudY = y(maxCloudCover);
  const primary = "var(--chakra-colors-primary-500)";
  const primaryDark = "var(--chakra-colors-primary-700)";

  return (
    <svg
      ref={svgRef}
      viewBox={`0 0 ${W} ${H}`}
      width="100%"
      role="slider"
      aria-label="Imagery date"
      aria-valuetext={targetDate}
      aria-valuemin={firstDay}
      aria-valuemax={todayDay}
      aria-valuenow={target}
      tabIndex={0}
      style={{ display: "block", touchAction: "none", userSelect: "none" }}
      onKeyDown={(e) => {
        const step = e.shiftKey ? 30 : 1;
        if (e.key === "ArrowLeft" || e.key === "ArrowRight") {
          e.preventDefault();
          const next = target + (e.key === "ArrowLeft" ? -step : step);
          onChange(fromDay(Math.min(Math.max(next, firstDay), todayDay)));
        }
      }}
    >
      {/* Plot background */}
      <rect
        x={PAD_X}
        y={PLOT_TOP - 4}
        width={W - 2 * PAD_X}
        height={PLOT_BOTTOM - PLOT_TOP + 8}
        rx={4}
        fill="#F4F5F6"
      />
      {/* Before the first Sentinel-2 L2A scene: nothing to find */}
      {start < firstDay && (
        <rect
          x={PAD_X}
          y={PLOT_TOP - 4}
          width={Math.max(0, x(firstDay) - PAD_X)}
          height={PLOT_BOTTOM - PLOT_TOP + 8}
          fill="#E0E2E5"
        />
      )}
      {/* Search window */}
      <rect
        x={bandStart}
        y={PLOT_TOP - 4}
        width={Math.max(2, bandEnd - bandStart)}
        height={PLOT_BOTTOM - PLOT_TOP + 8}
        fill="var(--chakra-colors-primary-100)"
        stroke="var(--chakra-colors-primary-300)"
        strokeWidth={1}
        rx={3}
      />
      {/* Cloud limit */}
      <line
        x1={PAD_X}
        x2={W - PAD_X}
        y1={cloudY}
        y2={cloudY}
        stroke="#737C94"
        strokeWidth={1}
        strokeDasharray="3 3"
      />
      <text
        x={W - PAD_X - 3}
        y={cloudY - 3}
        textAnchor="end"
        style={{ ...textStyle(8), fontFamily: "var(--chakra-fonts-mono)" }}
        fill="#737C94"
      >
        {maxCloudCover}% cloud
      </text>
      <text x={PAD_X + 3} y={PLOT_TOP + 3} style={textStyle(7)} fill="#9AA1B4">
        clear
      </text>
      <text
        x={PAD_X + 3}
        y={PLOT_BOTTOM + 1}
        style={textStyle(7)}
        fill="#9AA1B4"
      >
        cloudy
      </text>
      {/* Scenes */}
      {scenes.map((scene) => {
        const cx = x(toDay(scene.datetime));
        if (cx < PAD_X || cx > W - PAD_X) return null;
        const hovered = scene.id === hoveredId;
        return (
          <circle
            key={scene.id}
            cx={cx}
            cy={y(scene.cloudCover)}
            r={hovered ? 5.5 : 3.25}
            fill={scene.onMap ? primary : "white"}
            stroke={scene.onMap ? "white" : "#737C94"}
            strokeWidth={hovered ? 2 : 1}
            style={{ transition: "r 0.12s ease" }}
          />
        );
      })}
      {/* Axis */}
      <line
        x1={PAD_X}
        x2={W - PAD_X}
        y1={AXIS_Y}
        y2={AXIS_Y}
        stroke="#C9CED6"
      />
      {ticks.map((tick) => (
        <g key={tick.day}>
          <line
            x1={x(tick.day)}
            x2={x(tick.day)}
            y1={AXIS_Y}
            y2={AXIS_Y + 3}
            stroke="#C9CED6"
          />
          <text
            x={x(tick.day)}
            y={AXIS_Y + 12}
            textAnchor="middle"
            style={textStyle(8, tick.year ? 600 : 400)}
            fill={tick.year ? "#3A4048" : "#737C94"}
          >
            {tick.label}
          </text>
        </g>
      ))}
      {/* Target date */}
      <line
        x1={x(target)}
        x2={x(target)}
        y1={PLOT_TOP - 6}
        y2={AXIS_Y}
        stroke={primaryDark}
        strokeWidth={2}
      />
      <circle
        cx={x(target)}
        cy={AXIS_Y}
        r={5}
        fill="white"
        stroke={primaryDark}
        strokeWidth={2}
      />
      {/* Hit area: click or drag anywhere to move the date */}
      <rect
        x={0}
        y={0}
        width={W}
        height={H}
        fill="transparent"
        style={{ cursor: "ew-resize" }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
      />
    </svg>
  );
}

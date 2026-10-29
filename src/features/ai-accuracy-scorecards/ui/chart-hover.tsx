import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type FocusEvent,
  type PointerEvent,
  type ReactNode,
  type Ref,
} from "react";
import { Box, HStack, Portal, Text } from "@chakra-ui/react";

/**
 * The hover layer every chart on the page shares: hovering (or focusing) a
 * mark makes it the active one, dims its siblings, and shows one tooltip
 * that follows the pointer. The tooltip leads with the value and keys the
 * series with a short line.
 */

/** Opacity of the marks around the active one. */
export const DIMMED = 0.18;
/** The fade between hover states; reduced motion turns it off. */
export const FADE = "opacity 140ms cubic-bezier(.2,.7,.2,1)";
/** Put on a chart's wrapper so its transitions respect reduced motion. */
export const MOTION_SAFE = {
  "@media (prefers-reduced-motion: reduce)": {
    "& *": { transition: "none !important" },
  },
} as const;

const OFFSET = 14;
const EDGE = 12;

export type ChartHover<K extends string> = ReturnType<typeof useChartHover<K>>;

export function useChartHover<K extends string>() {
  const [active, setActive] = useState<K | null>(null);
  const [content, setContent] = useState<ReactNode>(null);
  const tipRef = useRef<HTMLDivElement>(null);
  const point = useRef({ x: 0, y: 0 });

  /** Keep the tooltip beside the point, flipped to stay on screen. */
  const place = useCallback((x: number, y: number) => {
    point.current = { x, y };
    const node = tipRef.current;
    if (!node) return;
    const { width, height } = node.getBoundingClientRect();
    const left =
      x + OFFSET + width > window.innerWidth - EDGE
        ? x - OFFSET - width
        : x + OFFSET;
    const top =
      y + OFFSET + height > window.innerHeight - EDGE
        ? y - OFFSET - height
        : y + OFFSET;
    node.style.left = `${Math.max(EDGE, left)}px`;
    node.style.top = `${Math.max(EDGE, top)}px`;
  }, []);

  // New content changes the tooltip's size, so place it again once drawn.
  useLayoutEffect(() => {
    if (content) place(point.current.x, point.current.y);
  }, [content, place]);

  const clear = useCallback(() => {
    setActive(null);
    setContent(null);
  }, []);

  const show = useCallback(
    (key: K, tip: ReactNode, x: number, y: number) => {
      setActive(key);
      setContent(tip);
      place(x, y);
    },
    [place]
  );

  /** Handlers for a mark: hover and focus make it active. */
  function target(key: K, tip?: ReactNode) {
    return {
      onPointerEnter: (e: PointerEvent<Element>) =>
        tip ? show(key, tip, e.clientX, e.clientY) : setActive(key),
      onPointerMove: (e: PointerEvent<Element>) =>
        tip ? place(e.clientX, e.clientY) : undefined,
      onPointerLeave: clear,
      onFocus: (e: FocusEvent<Element>) => {
        const box = e.currentTarget.getBoundingClientRect();
        if (tip) show(key, tip, box.right, box.top + box.height / 2);
        else setActive(key);
      },
      onBlur: clear,
    };
  }

  return {
    active,
    /** Whether a mark is faded back because another one is active. */
    dimmed: (key: K) => active !== null && active !== key,
    target,
    show,
    place,
    clear,
    tooltip: <ChartTooltip ref={tipRef} content={content} />,
  };
}

const TWEEN_MS = 450;

/**
 * Values that ease to each new target instead of jumping, so a chart can
 * morph when its measure changes. Reduced motion jumps straight there.
 */
export function useTween<K extends string>(
  target: Readonly<Record<K, number>>
): Readonly<Record<K, number>> {
  const [shown, setShown] = useState(target);
  const current = useRef(target);
  useEffect(() => {
    const from = current.current;
    const keys = Object.keys(target) as K[];
    if (keys.every((k) => from[k] === target[k])) return;
    const duration = window.matchMedia("(prefers-reduced-motion: reduce)")
      .matches
      ? 0
      : TWEEN_MS;
    const start = performance.now();
    let frame = 0;
    const step = (now: number) => {
      const t = duration ? Math.min(1, (now - start) / duration) : 1;
      const eased = 1 - (1 - t) ** 3;
      const next = Object.fromEntries(
        keys.map((k) => [k, from[k] + (target[k] - from[k]) * eased])
      ) as Record<K, number>;
      current.current = next;
      setShown(next);
      if (t < 1) frame = requestAnimationFrame(step);
    };
    frame = requestAnimationFrame(step);
    return () => cancelAnimationFrame(frame);
  }, [target]);
  return shown;
}

function ChartTooltip({
  ref,
  content,
}: {
  readonly ref: Ref<HTMLDivElement>;
  readonly content: ReactNode;
}) {
  return (
    <Portal>
      <Box
        ref={ref}
        role="tooltip"
        aria-hidden
        position="fixed"
        top={0}
        left={0}
        zIndex="tooltip"
        pointerEvents="none"
        maxW="300px"
        bg="fg"
        color="bg"
        borderRadius="md"
        px={3}
        py={2.5}
        fontSize="xs"
        lineHeight="1.4"
        boxShadow="lg"
        opacity={content ? 1 : 0}
        transition="opacity 110ms ease-out"
        css={MOTION_SAFE}
      >
        {content}
      </Box>
    </Portal>
  );
}

/** The tooltip's lead: the number the reader came for. */
export function TipValue({ children }: { readonly children: ReactNode }) {
  return (
    <Text fontSize="md" fontWeight="semibold" fontVariantNumeric="tabular-nums">
      {children}
    </Text>
  );
}

/** A secondary line, muted against the tooltip's ground. */
export function TipNote({ children }: { readonly children: ReactNode }) {
  return (
    <Text mt={1} opacity={0.72}>
      {children}
    </Text>
  );
}

function KeyLine({
  color,
  opacity = 1,
}: {
  readonly color: string;
  readonly opacity?: number;
}) {
  return (
    <Box
      as="span"
      flex="none"
      w="12px"
      h="3px"
      borderRadius="2px"
      bg={color}
      opacity={opacity}
    />
  );
}

/** Names what the value is, keyed with the mark's colour. */
export function TipKey({
  color,
  opacity,
  children,
}: {
  readonly color: string;
  readonly opacity?: number;
  readonly children: ReactNode;
}) {
  return (
    <HStack gap={2} opacity={0.85}>
      <KeyLine color={color} opacity={opacity} />
      <span>{children}</span>
    </HStack>
  );
}

export function TipRule() {
  return <Box borderTopWidth="1px" borderColor="bg/30" my={2} />;
}

/** One keyed row per series: label, then the value right-aligned. */
export function TipRows({
  rows,
}: {
  readonly rows: readonly {
    readonly key: string;
    readonly color: string;
    readonly opacity?: number;
    readonly label: string;
    readonly value: ReactNode;
  }[];
}) {
  return (
    <Box display="grid" gap={1} mt={1.5}>
      {rows.map((r) => (
        <HStack key={r.key} gap={2} fontVariantNumeric="tabular-nums">
          <KeyLine color={r.color} opacity={r.opacity} />
          <Text flex="1">{r.label}</Text>
          <Text fontWeight="semibold">{r.value}</Text>
        </HStack>
      ))}
    </Box>
  );
}

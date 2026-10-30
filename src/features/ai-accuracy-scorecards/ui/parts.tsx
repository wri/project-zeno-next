import { useRef, useState, type ComponentProps, type ReactNode } from "react";
import {
  Box,
  Button,
  chakra,
  Flex,
  Heading,
  HStack,
  Link as ChakraLink,
  Text,
} from "@chakra-ui/react";
import { Link } from "@/src/shared/lib/router";
import type { GroupStats } from "../model/types";
import { pct } from "../lib/format";
import {
  TIERS,
  tierFigure,
  tiersOf,
  type Tier,
  type TierKey,
} from "../lib/tiers";
import { TIER_COLORS } from "./palette";
import {
  DIMMED,
  FADE,
  MOTION_SAFE,
  TipNote,
  TipRows,
  type ChartHover,
} from "./chart-hover";

/** Room above a panel scrolled into view (the page has no sticky header). */
const SCROLL_MARGIN = "16px";

export function Eyebrow({ children }: { readonly children: ReactNode }) {
  return (
    <Text
      fontFamily="mono"
      fontSize="xs"
      fontWeight="semibold"
      letterSpacing="0.08em"
      textTransform="uppercase"
      color="primary.solid"
    >
      {children}
    </Text>
  );
}

/** A small muted label over a block, e.g. "Got right". */
export function Caption({ children }: { readonly children: ReactNode }) {
  return (
    <Text
      fontFamily="mono"
      fontSize="xs"
      color="fg.subtle"
      textTransform="uppercase"
      letterSpacing="0.06em"
    >
      {children}
    </Text>
  );
}

/** The bordered card every block of the page sits in. */
export function Panel(props: ComponentProps<typeof Box>) {
  return (
    <Box
      borderWidth="1px"
      borderColor="border"
      borderRadius="lg"
      bg="bg.panel"
      p={{ base: 4, md: 5 }}
      {...props}
    />
  );
}

/** A dashboard section: heading, one-line explanation. */
export function Section({
  id,
  title,
  sub,
  action,
  children,
}: {
  readonly id: string;
  readonly title: string;
  readonly sub: ReactNode;
  readonly action?: ReactNode;
  readonly children: ReactNode;
}) {
  return (
    <Box
      as="section"
      id={id}
      aria-labelledby={`${id}-title`}
      py={{ base: 8, md: 12 }}
    >
      <Flex mb={5} gap={4} align="flex-end" justify="space-between" wrap="wrap">
        <Box maxW="760px">
          <Heading as="h2" id={`${id}-title`} size="xl" textWrap="balance">
            {title}
          </Heading>
          <Text mt={2} color="fg.muted" fontSize="sm">
            {sub}
          </Text>
        </Box>
        {action}
      </Flex>
      {children}
    </Box>
  );
}

/** A titled block of the methodology: a section (h2) or a part of one (h3). */
export function Block({
  id,
  title,
  lead,
  level = "h2",
  children,
}: {
  readonly id?: string;
  readonly title: string;
  readonly lead?: ReactNode;
  readonly level?: "h2" | "h3";
  readonly children?: ReactNode;
}) {
  const section = level === "h2";
  return (
    <Box
      as="section"
      id={id}
      py={6}
      borderTopWidth={section ? "2px" : "1px"}
      borderColor={section ? "border.emphasized" : "border"}
      scrollMarginTop={SCROLL_MARGIN}
    >
      <Heading as={level} size={section ? "xl" : "lg"} mb={3}>
        {title}
      </Heading>
      {lead ? (
        <Text color="fg.muted" mb={4} maxW="72ch">
          {lead}
        </Text>
      ) : null}
      {children}
    </Box>
  );
}

/** The standalone page's way back to the app. */
export function HomeLink() {
  return (
    <ChakraLink asChild color="primary.solid" fontWeight="semibold">
      <Link href="/">← GNW Horizon</Link>
    </ChakraLink>
  );
}

export function BackLink({ href }: { readonly href: string }) {
  return (
    <ChakraLink asChild color="primary.solid" fontSize="sm">
      <Link href={href}>← Back to the dashboard</Link>
    </ChakraLink>
  );
}

export function tierSwatchStyle(key: TierKey) {
  const bg = TIER_COLORS[key];
  // The empty "never" swatch needs an outline to show against the page.
  return key === "never"
    ? { bg, boxShadow: "inset 0 0 0 1px var(--chakra-colors-border)" }
    : { bg };
}

/** A legend; with a hover, pointing at an item highlights its marks. */
export function Legend<K extends string>({
  items,
  hover,
}: {
  readonly items: readonly {
    readonly key: K;
    readonly label: string;
    readonly swatch: ReactNode;
  }[];
  readonly hover?: ChartHover<K>;
}) {
  return (
    <HStack gap={4} wrap="wrap" fontSize="xs" color="fg.muted">
      {items.map((item) => (
        <HStack
          key={item.key}
          gap={1.5}
          opacity={hover?.dimmed(item.key) ? 0.45 : 1}
          color={hover?.active === item.key ? "fg" : undefined}
          transition={FADE}
          {...hover?.target(item.key)}
        >
          {item.swatch}
          <span>{item.label}</span>
        </HStack>
      ))}
    </HStack>
  );
}

export function TierLegend() {
  return (
    <Legend
      items={TIERS.map((t) => ({
        key: t.key,
        label: t.label,
        swatch: (
          <Box
            w="10px"
            h="10px"
            borderRadius="2px"
            {...tierSwatchStyle(t.key)}
          />
        ),
      }))}
    />
  );
}

/**
 * The four reliability tiers of a group as one stacked bar (decorative).
 * With a hover, each segment dims the others and shows its tooltip.
 */
export function TierSegments({
  stats,
  height = "12px",
  hover,
  tip,
}: {
  readonly stats: GroupStats;
  readonly height?: string;
  readonly hover?: ChartHover<TierKey>;
  readonly tip?: (tier: Tier) => ReactNode;
}) {
  return (
    <Flex
      gap="2px"
      h={height}
      borderRadius="4px"
      overflow="hidden"
      w="100%"
      aria-hidden
      css={MOTION_SAFE}
    >
      {tiersOf(stats).map((t) => {
        if (!t.count) return null;
        return (
          <Box
            key={t.key}
            flex={`${t.count} 1 0`}
            minW="2px"
            {...tierSwatchStyle(t.key)}
            opacity={hover?.dimmed(t.key) ? DIMMED : 1}
            transition={FADE}
            {...hover?.target(t.key, tip?.(t))}
          />
        );
      })}
    </Flex>
  );
}

/**
 * A group's tier bar with the breakdown on hover, in its section's tooltip.
 * It sits inside a row button, which carries the same words as its label,
 * so the bar itself takes no focus.
 */
export function TierBar({
  group,
  hover,
}: {
  readonly group: {
    readonly key: string;
    readonly label: string;
    readonly stats: GroupStats;
  };
  readonly hover: ChartHover<string>;
}) {
  const tip = (
    <>
      <TipNote>{group.label}</TipNote>
      <TipRows
        rows={tiersOf(group.stats).map((t) => ({
          key: t.key,
          color: TIER_COLORS[t.key],
          label: t.label,
          value: tierFigure(t),
        }))}
      />
    </>
  );
  return (
    <Box w="100%" {...hover.target(group.key, tip)}>
      <TierSegments stats={group.stats} />
    </Box>
  );
}

/** Tier counts as inline facts, e.g. "Accurate every time 38". */
export function TierFacts({ stats }: { readonly stats: GroupStats }) {
  return (
    <>
      {tiersOf(stats).map((t) => (
        <Text as="span" key={t.key}>
          {t.label} <b>{t.count}</b>
        </Text>
      ))}
    </>
  );
}

/** "For X, users can expect an accurate answer every time on …". */
export function ReliabilitySentence({
  subject,
  stats,
}: {
  readonly subject: ReactNode;
  readonly stats: GroupStats;
}) {
  return (
    <Text fontSize="lg">
      For {subject}, users can expect an accurate answer every time on{" "}
      <b>{pct(stats.everyTime)} of questions</b>, and at least most of the time
      on {pct(stats.majority)}.
    </Text>
  );
}

/** A detail panel that a row below it can bring back into view. */
export function DetailPanel(props: ComponentProps<typeof Panel>) {
  return (
    <Panel scrollMarginTop={SCROLL_MARGIN} aria-live="polite" {...props} />
  );
}

/**
 * Master-detail selection for a list of groups: the selected item (the
 * first until one is picked) and a ref for the detail panel, which is
 * scrolled back into view when a row below it is picked.
 */
export function useRowSelection<T extends { readonly key: string }>(
  items: readonly T[]
) {
  const [key, setKey] = useState<string | null>(null);
  const detailRef = useRef<HTMLDivElement>(null);
  const selected = items.find((i) => i.key === key) ?? items[0];
  function select(next: string) {
    setKey(next);
    const reduced = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches;
    detailRef.current?.scrollIntoView({
      behavior: reduced ? "auto" : "smooth",
      block: "nearest",
    });
  }
  return { selected, select, detailRef };
}

/** One selectable group row: name, headline share, then a bar. */
export function SelectableRow({
  selected,
  onSelect,
  ariaLabel,
  title,
  sub,
  value,
  caption,
  children,
}: {
  readonly selected: boolean;
  readonly onSelect: () => void;
  readonly ariaLabel: string;
  readonly title: string;
  readonly sub: string;
  readonly value: string;
  readonly caption: string;
  readonly children: ReactNode;
}) {
  return (
    <chakra.button
      type="button"
      onClick={onSelect}
      aria-pressed={selected}
      aria-label={ariaLabel}
      display="grid"
      gridTemplateColumns={{
        base: "minmax(0, 1fr) 5rem",
        md: "minmax(0, 16rem) 6rem minmax(0, 1fr)",
      }}
      gap={{ base: 2, md: 4 }}
      alignItems="center"
      textAlign="left"
      cursor="pointer"
      p={3}
      borderWidth="1px"
      borderColor={selected ? "primary.solid" : "border"}
      borderRadius="md"
      bg={selected ? "bg.subtle" : "bg.panel"}
      _hover={{ borderColor: "primary.solid" }}
      _focusVisible={{
        outline: "2px solid",
        outlineColor: "primary.solid",
        outlineOffset: "2px",
      }}
    >
      <Box minW={0}>
        <Text fontWeight="semibold" truncate>
          {title}
        </Text>
        <Text fontSize="xs" color="fg.subtle">
          {sub}
        </Text>
      </Box>
      <Box textAlign={{ base: "right", md: "left" }}>
        <Text fontWeight="semibold" fontVariantNumeric="tabular-nums">
          {value}
        </Text>
        <Text fontSize="xs" color="fg.subtle">
          {caption}
        </Text>
      </Box>
      <Box gridColumn={{ base: "1 / -1", md: "auto" }} minW={0}>
        {children}
      </Box>
    </chakra.button>
  );
}

/** A small segmented control of mutually exclusive options. */
export function Segmented<T extends string>({
  label,
  options,
  value,
  onChange,
}: {
  readonly label: string;
  readonly options: readonly (readonly [T, string])[];
  readonly value: T;
  readonly onChange: (value: T) => void;
}) {
  return (
    <HStack
      gap={0}
      role="group"
      aria-label={label}
      borderWidth="1px"
      borderColor="border"
      borderRadius="md"
      p="2px"
    >
      {options.map(([option, text]) => (
        <Button
          key={option}
          size="xs"
          variant={value === option ? "solid" : "ghost"}
          aria-pressed={value === option}
          onClick={() => onChange(option)}
        >
          {text}
        </Button>
      ))}
    </HStack>
  );
}

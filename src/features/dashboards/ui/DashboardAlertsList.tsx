import { useState } from "react";
import {
  Box,
  Button,
  Flex,
  Input,
  Popover,
  Portal,
  Skeleton,
  Table,
  Text,
} from "@chakra-ui/react";
import { CaretDownIcon } from "@phosphor-icons/react";

import InsightCaption from "@/app/components/InsightCaption";
import DownloadMenu from "@/app/components/widgets/DownloadMenu";
import type { DateRange } from "@/src/shared/lib/iso-date";
import { InfoTooltip } from "@/src/shared/ui/InfoTooltip";
import { Pill } from "@/src/shared/ui/Pill";
import { isRetryable, type AlertsListError } from "../api/alerts";
import {
  customRangeProblem,
  formatAlertDate,
  formatHa,
  formatRangeCaps,
  formatSinceDay,
  LAND_FILTERS,
  rowArea,
  rowsSummary,
  rowTiers,
  sinceRange,
  TIERS,
  type AlertDay,
  type AlertsChip,
  type AlertsConfidence,
  type AlertsHeadline,
  type AlertsLandFilter,
} from "../lib/alertsWidgets";
import { pageNumbers, paginate } from "../lib/pagination";
import { TWO_COLUMN_QUERY } from "./gridLayout";

const PAGE_SIZE = 10;

const CHIP_LABELS: Record<AlertsChip, string> = {
  "new-week": "New alerts",
  "last-30-days": "Last 30 days",
  custom: "Custom",
};

/** The preset period pills, in the toolbar's order; Custom follows them. */
const PILLS: Exclude<AlertsChip, "custom">[] = ["new-week", "last-30-days"];

const CONFIDENCES: AlertsConfidence[] = ["all", "high", "highest"];

const LAND_FILTER_OPTIONS = (
  Object.keys(LAND_FILTERS) as AlertsLandFilter[]
).map((value) => ({ value, label: LAND_FILTERS[value].label }));

/** The Custom popover's two inputs, each editing one end of the range. */
const CUSTOM_BOUNDS: { bound: keyof DateRange; label: string }[] = [
  { bound: "start", label: "Start" },
  { bound: "end", label: "End" },
];

/** A failed fetch, as the pane words it. */
export type AlertsFailure = Pick<AlertsListError, "kind" | "detail">;

/**
 * The sentence for a failure: the backend's own for a refused request or a
 * failed job (a 422 or 502 `detail`), a sign-in prompt, else the generic
 * line.
 */
function failureMessage(failure: AlertsFailure): string {
  if (failure.detail) return failure.detail;
  return failure.kind === "unauthenticated"
    ? "Sign in to see the alerts list."
    : "Couldn't load the alerts.";
}

/**
 * What the pane has to show, settled once by the container: nothing yet,
 * a failure with no rows behind it, or rows for a period — possibly with a
 * failure above them (a wider window or a land filter that did not load).
 */
export type AlertsListView =
  | { kind: "loading" }
  | { kind: "error"; failure: AlertsFailure }
  | {
      kind: "ready";
      /** The period the rows cover. */
      range: DateRange;
      /** The last day a custom range may reach (the latest alert date); bounds the custom inputs. */
      anchor: string;
      failure?: AlertsFailure;
    };

function rangeLabel(range: DateRange): string {
  return range.start === range.end
    ? `on ${formatAlertDate(range.start)}`
    : `from ${formatAlertDate(range.start)} to ${formatAlertDate(range.end)}`;
}

/** The design's filter pill: a rounded 24px chip, solid primary when on. */
const pillProps = (selected: boolean) =>
  ({
    size: "xs",
    h: "24px",
    px: "10px",
    gap: "6px",
    rounded: "full",
    fontSize: "12px",
    fontWeight: "medium",
    colorPalette: selected ? "primary" : undefined,
    variant: selected ? "solid" : "outline",
    bg: selected ? undefined : "white",
    borderColor: selected ? undefined : "#E0E2E5",
    color: selected ? undefined : "#131619",
    // The button recipe sizes every descendant svg to 20px; the design's
    // chevron is 10px.
    _icon: { width: "auto", height: "auto" },
  }) as const;

/** The design's NEW pill: red on a pale red ground, with a dot. */
function NewBadge() {
  return (
    <Flex
      as="span"
      display="inline-flex"
      align="center"
      gap="4px"
      px="6px"
      py="2px"
      rounded="full"
      bg="#FEF2F2"
      border="1px solid"
      borderColor="#F8BABA"
      color="#B91C1C"
      fontFamily="mono"
      fontSize="10px"
      fontWeight="medium"
      lineHeight="14px"
    >
      <Box as="span" boxSize="6px" rounded="full" bg="#B91C1C" aria-hidden />
      NEW
    </Flex>
  );
}

/**
 * One figure of the headline (the design's "KPI"): the hectares large, what
 * they are beside them, and the period they cover in mono beneath. The
 * new-week figure is red with the NEW dot; the since figure is the title
 * blue.
 */
function Kpi({
  name,
  ha,
  label,
  period,
  tone,
  ...rest
}: {
  name: string;
  ha: number;
  label: string;
  period: string;
  tone: "new" | "since";
} & React.ComponentProps<typeof Flex>) {
  return (
    <Flex role="group" aria-label={name} direction="column" gap="2px" {...rest}>
      <Flex align="center" gap="8px">
        {tone === "new" && (
          <Box
            as="span"
            boxSize="8px"
            rounded="full"
            bg="#EF4444"
            aria-hidden
          />
        )}
        <Text
          as="span"
          fontSize="28px"
          lineHeight="34px"
          fontWeight="normal"
          color={tone === "new" ? "#B91C1C" : "#172B7A"}
          css={{ fontVariantNumeric: "tabular-nums" }}
        >
          {formatHa(ha)}
        </Text>
        <Text
          as="span"
          fontSize="14px"
          lineHeight="20px"
          fontWeight="medium"
          color="#131619"
        >
          {label}
        </Text>
      </Flex>
      <Text
        fontFamily="mono"
        fontSize="10px"
        lineHeight="14px"
        color="#565E7B"
        whiteSpace="nowrap"
      >
        {period}
      </Text>
    </Flex>
  );
}

/** The headline over the list: the new week and the 30 days to the latest alert date. */
function Headline({ headline }: { headline: AlertsHeadline }) {
  const { newWeek, since } = headline;
  return (
    <Flex py="4px" align="stretch" wrap="wrap" rowGap="8px">
      <Kpi
        name="New this week"
        ha={newWeek.ha}
        label="ha new this week"
        period={`DETECTED ${formatRangeCaps(newWeek.range)}`}
        tone="new"
        pr="24px"
      />
      <Box w="1px" bg="#DDE2F5" aria-hidden />
      <Kpi
        name="Alerts since"
        ha={since.ha}
        label={`ha of alerts since ${formatSinceDay(since.range.start)}`}
        period={formatRangeCaps(since.range)}
        tone="since"
        px="24px"
      />
    </Flex>
  );
}

/**
 * The latest alert date every pill counts back from, in the dashboards
 * list's words, for the card's params row.
 */
export function LatestAlertDetected({ date }: { date: string }) {
  return (
    <Flex align="center" gap="4px" color="#565E7B">
      <InfoTooltip about="the alerts data" size={14}>
        Alerts are dated by when they were detected and reach Global Nature
        Watch a few days after that.
      </InfoTooltip>
      <Text
        fontFamily="mono"
        fontSize="10px"
        lineHeight="16px"
        whiteSpace="nowrap"
      >
        LATEST ALERT DETECTED {formatAlertDate(date).toUpperCase()}
      </Text>
    </Flex>
  );
}

/** A failure and, when a retry can help, the button for it. */
function FailureNotice({
  failure,
  onRetry,
}: {
  failure: AlertsFailure;
  onRetry: () => void;
}) {
  return (
    <Flex
      role="alert"
      align="center"
      gap="8px"
      wrap="wrap"
      px="8px"
      py="6px"
      bg="#FEF2F2"
      borderWidth="1px"
      borderColor="#F8BABA"
      borderRadius="sm"
    >
      <Text flex="1" minW={0} fontSize="12px" color="fg">
        {failureMessage(failure)}
      </Text>
      {isRetryable(failure.kind) && (
        <Button size="xs" variant="outline" bg="white" onClick={onRetry}>
          Retry
        </Button>
      )}
    </Flex>
  );
}

function HeaderCell({
  children,
  numeric,
}: {
  children?: React.ReactNode;
  numeric?: boolean;
}) {
  return (
    <Table.ColumnHeader
      scope="col"
      px="8px"
      py="6px"
      fontFamily="mono"
      fontSize="10px"
      fontWeight="normal"
      lineHeight="14px"
      color="#565E7B"
      textTransform="uppercase"
      whiteSpace="nowrap"
      borderColor="#EEF0F7"
      textAlign={numeric ? "end" : undefined}
    >
      {children}
    </Table.ColumnHeader>
  );
}

function BodyCell({
  children,
  numeric,
  ...rest
}: {
  children?: React.ReactNode;
  numeric?: boolean;
} & React.ComponentProps<typeof Table.Cell>) {
  return (
    <Table.Cell
      px="8px"
      py="7px"
      fontSize="12px"
      borderColor="#EEF0F7"
      whiteSpace={numeric ? undefined : "nowrap"}
      textAlign={numeric ? "end" : undefined}
      css={numeric ? { fontVariantNumeric: "tabular-nums" } : undefined}
      {...rest}
    >
      {children}
    </Table.Cell>
  );
}

/** The pager's ‹ › arrows: plain text buttons in the footer's grey. */
const pagerArrowProps = {
  size: "xs",
  variant: "plain",
  px: 0,
  minW: "auto",
  h: "18px",
  fontSize: "13px",
  color: "#565E7B",
} as const;

/**
 * The white card of the alerts widget (Figma "Alert list widget", Stage 1
 * columns): the curated caption, the headline figures, the period pills with
 * the Custom popover, the Confidence and Intersects dropdowns, an explainer,
 * then the table of alert days with its footer and the map pane beside it
 * (under it when the card is single or the grid narrow), and the download
 * action. Presentational: the rows arrive filtered to the period and
 * confidence, every choice goes back up through a callback, and nothing
 * here fetches. The container (`DashboardAlertsWidget`) owns the query and
 * the date-range state it shares with the map pane, and passes the pane in.
 *
 * The custom dates are the one input this pane judges itself: a bound
 * outside the 30 days the widget covers is ignored (a date input reports
 * every keystroke, so a year passes through "0002"), and an end before the
 * start is refused with a line saying so; only a range that holds goes up.
 */
export default function DashboardAlertsList({
  view,
  isFetching,
  rows,
  headline,
  chip,
  confidence,
  landFilter,
  custom,
  mapPane,
  sideBySide,
  onChip,
  onConfidence,
  onLandFilter,
  onCustomChange,
  onDownloadCsv,
  onRetry,
}: {
  view: AlertsListView;
  /** A refetch in flight behind rows already on show (a widened window, a land filter). */
  isFetching: boolean;
  /** The rows for the chosen period and confidence, newest first. */
  rows: readonly AlertDay[];
  /** The figures over the list, once a list has arrived. */
  headline?: AlertsHeadline;
  chip: AlertsChip;
  confidence: AlertsConfidence;
  landFilter: AlertsLandFilter;
  /** The committed custom range, once the Custom pill has been opened. */
  custom?: DateRange;
  /** The map pane, placed beside the table. */
  mapPane: React.ReactNode;
  /** Whether the map may sit beside the table (a full-width card); it still stacks in a narrow grid. */
  sideBySide: boolean;
  onChip: (chip: AlertsChip) => void;
  onConfidence: (confidence: AlertsConfidence) => void;
  onLandFilter: (filter: AlertsLandFilter) => void;
  onCustomChange: (range: DateRange) => void;
  /** Saves the rows on show (period, confidence and land filter applied) as CSV. */
  onDownloadCsv: () => void;
  onRetry: () => void;
}) {
  const ready = view.kind === "ready";
  const range = ready ? view.range : undefined;

  // The Custom dates open from the Custom pill, which also selects the chip,
  // so the popover is controlled rather than toggled by its trigger.
  const [customOpen, setCustomOpen] = useState(false);
  const [customInverted, setCustomInverted] = useState(false);
  const openCustom = () => {
    onChip("custom");
    setCustomInverted(false);
    setCustomOpen(true);
  };
  const changeBound = (bound: keyof DateRange, value: string) => {
    if (!custom || view.kind !== "ready" || !value) return;
    const next = { ...custom, [bound]: value };
    const problem = customRangeProblem(next, view.anchor);
    setCustomInverted(problem === "inverted");
    if (!problem) onCustomChange(next);
  };

  // The page resets whenever the rows it indexes change identity (a chip, a
  // tier, a new period). Reconciled during render, not in an effect, so the
  // table never paints a stale page first.
  const pageKey = `${chip}|${confidence}|${landFilter}|${range?.start}|${range?.end}`;
  const [paging, setPaging] = useState({ key: pageKey, page: 1 });
  const page = paging.key === pageKey ? paging.page : 1;
  const setPage = (next: number) => setPaging({ key: pageKey, page: next });

  const paged = paginate(rows, page, PAGE_SIZE);
  const summary = rowsSummary(rows, confidence);
  const land = LAND_FILTERS[landFilter];

  return (
    <Flex
      direction="column"
      gap="12px"
      p="12px"
      bg="white"
      borderWidth="1px"
      borderColor="#DDE2F5"
      borderRadius="sm"
      minW={0}
    >
      <InsightCaption curated />

      {headline ? (
        <Headline headline={headline} />
      ) : (
        view.kind === "loading" && (
          <Flex py="4px" gap="24px" aria-hidden>
            <Skeleton h="50px" w="180px" />
            <Skeleton h="50px" w="260px" />
          </Flex>
        )
      )}

      {/* Filter toolbar: the period pills, a divider, the two dropdowns */}
      <Flex gap="6px" align="center" wrap="wrap">
        {PILLS.map((value) => {
          const selected = chip === value;
          return (
            <Button
              key={value}
              {...pillProps(selected)}
              aria-pressed={selected}
              disabled={!ready}
              onClick={() => onChip(value)}
            >
              {value === "new-week" && selected && (
                <Box
                  as="span"
                  boxSize="6px"
                  rounded="full"
                  bg="white"
                  aria-hidden
                />
              )}
              {CHIP_LABELS[value]}
            </Button>
          );
        })}
        {/* Custom: the pill selects the chip and opens the dates under
            itself. Mounted on open, so the inputs start from the committed
            range each time (they are uncontrolled: a controlled date input
            snaps a half-typed year back on every keystroke the handler
            ignores). */}
        <Popover.Root
          open={customOpen}
          onOpenChange={(e) => {
            setCustomOpen(e.open);
            if (!e.open) setCustomInverted(false);
          }}
          // Fixed, as the basemap selector's: the dashboard scrolls inside a
          // container, and an absolute positioner lands off the page.
          positioning={{ placement: "bottom-start", strategy: "fixed" }}
          lazyMount
          unmountOnExit
        >
          <Popover.Anchor asChild>
            <Button
              {...pillProps(chip === "custom")}
              aria-pressed={chip === "custom"}
              disabled={!ready}
              onClick={openCustom}
            >
              Custom
              <CaretDownIcon size={10} />
            </Button>
          </Popover.Anchor>
          <Portal>
            <Popover.Positioner>
              <Popover.Content w="auto" zIndex={1400}>
                <Popover.Body p={3}>
                  {custom && view.kind === "ready" && (
                    <Flex direction="column" gap="8px">
                      <Flex gap="8px" align="center" wrap="wrap">
                        {CUSTOM_BOUNDS.map(({ bound, label }) => (
                          <Text
                            key={bound}
                            as="label"
                            fontSize="12px"
                            color="#565E7B"
                          >
                            {label}{" "}
                            <Input
                              type="date"
                              size="xs"
                              w="auto"
                              display="inline-block"
                              bg="white"
                              defaultValue={custom[bound]}
                              // Each input stops at the other's day: the
                              // picker greys the rest, and a typed date past
                              // it is refused below.
                              min={
                                bound === "start"
                                  ? sinceRange(view.anchor).start
                                  : custom.start
                              }
                              max={bound === "start" ? custom.end : view.anchor}
                              aria-label={`Custom period ${bound}`}
                              onChange={(e) =>
                                changeBound(bound, e.target.value)
                              }
                            />
                          </Text>
                        ))}
                      </Flex>
                      {customInverted && (
                        <Text
                          fontSize="12px"
                          color="#B91C1C"
                          aria-live="polite"
                        >
                          End must be on or after start.
                        </Text>
                      )}
                    </Flex>
                  )}
                </Popover.Body>
              </Popover.Content>
            </Popover.Positioner>
          </Portal>
        </Popover.Root>
        <Box w="1px" h="20px" bg="#DDE2F5" aria-hidden />
        <Pill
          variant="text"
          label="Confidence"
          value={confidence}
          options={CONFIDENCES.map((value) => ({
            value,
            label: TIERS[value].name,
          }))}
          onSelect={onConfidence}
        />
        <Pill
          variant="text"
          label="Intersects"
          value={landFilter}
          options={LAND_FILTER_OPTIONS}
          onSelect={onLandFilter}
        />
      </Flex>

      {range && (
        <Text fontSize="12px" lineHeight="16px" color="#565E7B">
          Alert days {rangeLabel(range)}
          {land.phrase ? `, ${land.phrase}` : ""}, newest first. Area is the
          disturbed area detected on that day.
        </Text>
      )}

      {view.kind === "ready" && view.failure && (
        <FailureNotice failure={view.failure} onRetry={onRetry} />
      )}

      {/* The table and the map: side by side across a full-width card in a
          two-column grid, stacked otherwise. The map column takes the
          table's height beside it and a height of its own beneath it. */}
      <Flex
        direction="column"
        gap="16px"
        align="stretch"
        css={
          sideBySide
            ? { [TWO_COLUMN_QUERY]: { flexDirection: "row" } }
            : undefined
        }
      >
        <Flex direction="column" gap="12px" flex="1 1 0" minW={0}>
          {view.kind === "loading" ? (
            <Flex direction="column" gap="8px" aria-label="Loading alerts">
              <Skeleton h="14px" w="60%" />
              <Skeleton h="14px" w="90%" />
              <Skeleton h="14px" w="80%" />
            </Flex>
          ) : view.kind === "error" ? (
            <FailureNotice failure={view.failure} onRetry={onRetry} />
          ) : rows.length === 0 ? (
            <Text fontSize="14px" color="fg.muted" py="8px">
              No alerts detected in this period.
            </Text>
          ) : (
            <Box
              overflowX="auto"
              opacity={isFetching ? 0.6 : 1}
              aria-busy={isFetching}
              transition="opacity 0.15s ease"
            >
              <Table.Root
                size="sm"
                variant="line"
                bg="transparent"
                aria-label="Alert days"
              >
                <Table.Header>
                  <Table.Row>
                    <HeaderCell />
                    <HeaderCell>Alert date</HeaderCell>
                    <HeaderCell>Confidence</HeaderCell>
                    <HeaderCell numeric>Total area (ha)</HeaderCell>
                  </Table.Row>
                </Table.Header>
                <Table.Body>
                  {paged.items.map((row) => (
                    <Table.Row key={row.date} bg="transparent">
                      <BodyCell w="76px">{row.isNew && <NewBadge />}</BodyCell>
                      <BodyCell>{formatAlertDate(row.date)}</BodyCell>
                      <BodyCell>{rowTiers(row, confidence)}</BodyCell>
                      <BodyCell numeric>
                        {formatHa(rowArea(row, confidence))}
                      </BodyCell>
                    </Table.Row>
                  ))}
                </Table.Body>
              </Table.Root>
            </Box>
          )}

          {ready && (
            <Flex align="center" justify="space-between" gap="8px" wrap="wrap">
              <Text fontSize="12px" lineHeight="16px" color="#565E7B">
                {paged.totalPages > 1
                  ? `Showing ${(paged.page - 1) * PAGE_SIZE + 1}–${Math.min(
                      paged.page * PAGE_SIZE,
                      summary.days
                    )} of ${summary.days} alert days`
                  : `${summary.days} alert ${summary.days === 1 ? "day" : "days"}`}
                {" · "}
                {formatHa(summary.ha)} ha in this period
              </Text>
              {paged.totalPages > 1 && (
                <Flex align="center" gap="10px" aria-label="Pages">
                  <Button
                    {...pagerArrowProps}
                    aria-label="Previous page"
                    disabled={paged.page === 1}
                    onClick={() => setPage(paged.page - 1)}
                  >
                    ‹
                  </Button>
                  {pageNumbers(paged.page, paged.totalPages).map(
                    (entry, index) =>
                      entry === "…" ? (
                        <Text
                          key={`gap-${index}`}
                          as="span"
                          fontSize="12px"
                          color="#565E7B"
                          aria-hidden
                        >
                          …
                        </Text>
                      ) : (
                        <Button
                          key={entry}
                          size="xs"
                          variant="plain"
                          px={0}
                          minW="auto"
                          h="17px"
                          fontSize="12px"
                          fontWeight={
                            entry === paged.page ? "medium" : "normal"
                          }
                          color={entry === paged.page ? "#0049AA" : "#565E7B"}
                          aria-label={`Page ${entry}`}
                          aria-current={
                            entry === paged.page ? "page" : undefined
                          }
                          onClick={() => setPage(entry)}
                        >
                          {entry}
                        </Button>
                      )
                  )}
                  <Button
                    {...pagerArrowProps}
                    aria-label="Next page"
                    disabled={paged.page === paged.totalPages}
                    onClick={() => setPage(paged.page + 1)}
                  >
                    ›
                  </Button>
                </Flex>
              )}
            </Flex>
          )}
        </Flex>

        <Box
          flex="1 1 0"
          minW={0}
          h={{ base: "280px", md: "360px" }}
          css={
            sideBySide ? { [TWO_COLUMN_QUERY]: { height: "auto" } } : undefined
          }
        >
          {mapPane}
        </Box>
      </Flex>

      {/* Widget actions, as the chart card's row: the rows on show as CSV.
          The design's "View data source" waits on a source link the
          catalogue does not carry yet. */}
      {ready && (
        <Flex gap="8px" align="center">
          <DownloadMenu onCsv={onDownloadCsv} disabled={rows.length === 0} />
        </Flex>
      )}
    </Flex>
  );
}

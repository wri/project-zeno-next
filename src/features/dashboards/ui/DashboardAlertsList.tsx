import { useState } from "react";
import {
  Box,
  Button,
  Flex,
  Input,
  Menu,
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
import { Pill } from "@/src/shared/ui/Pill";
import { isRetryable, type AlertsListError } from "../api/alerts";
import {
  customStartMin,
  formatAlertDate,
  formatHa,
  LAND_FILTERS,
  rowArea,
  rowsSummary,
  rowTiers,
  TIERS,
  type AlertDay,
  type AlertsChip,
  type AlertsConfidence,
  type AlertsLandFilter,
} from "../lib/alertsWidgets";
import { pageNumbers, paginate } from "../lib/pagination";
import { TWO_COLUMN_QUERY } from "./gridLayout";

const PAGE_SIZE = 10;

const CHIP_LABELS: Record<AlertsChip, string> = {
  "new-week": "New this week",
  "last-day": "Last day",
  "last-3-days": "Last 3 days",
  "last-week": "Last week",
  custom: "Custom",
};

/**
 * The period pills in the full-width toolbar's order. At half width (a
 * two-column grid: the panes side by side in a double card, or a single
 * card) the `folded` ones and Custom move into one "More" pill, as the
 * design's variant B. The width is the panes' own container query, so the
 * toolbar and the panes always agree; both sets are in the DOM and CSS
 * shows one.
 */
const PILLS: { chip: Exclude<AlertsChip, "custom">; folded?: boolean }[] = [
  { chip: "new-week" },
  { chip: "last-day", folded: true },
  { chip: "last-3-days", folded: true },
  { chip: "last-week" },
];

const MORE_CHIPS: AlertsChip[] = ["last-day", "last-3-days", "custom"];

const FULL_WIDTH_ONLY = { [TWO_COLUMN_QUERY]: { display: "none" } } as const;
const HALF_WIDTH_ONLY = {
  display: "none",
  [TWO_COLUMN_QUERY]: { display: "inline-flex" },
} as const;

const CONFIDENCES: AlertsConfidence[] = ["all", "high", "highest"];

const LAND_FILTER_OPTIONS = (
  Object.keys(LAND_FILTERS) as AlertsLandFilter[]
).map((value) => ({ value, label: LAND_FILTERS[value].label }));

/** The Custom popover's two inputs, each editing one end of the range. */
const CUSTOM_BOUNDS: { bound: keyof DateRange; label: string }[] = [
  { bound: "start", label: "From" },
  { bound: "end", label: "To" },
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
      /** The last day a custom range may reach (the latest alert day); bounds the custom inputs. */
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
 * The list pane of the alerts widget (Figma "Alert list widget", Stage 1
 * columns): the curated caption, the period pills with the Custom popover,
 * the Confidence and Intersects dropdowns, an explainer, the table of alert
 * days, and a footer with the period's totals and the pager. Presentational:
 * the rows arrive filtered to the period and confidence, every choice goes
 * back up through a callback, and nothing here fetches. The container
 * (`DashboardAlertsWidget`) owns the query and the date-range state it
 * shares with the map pane.
 *
 * The "New this week" pill carries hectares, not a count: Stage 1 rows are
 * days, so "New this week · 15.5 ha" is the honest number.
 */
export default function DashboardAlertsList({
  view,
  isFetching,
  rows,
  newWeekHa,
  chip,
  confidence,
  landFilter,
  custom,
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
  /** The "New this week" pill's hectares in the shown tier. */
  newWeekHa: number;
  chip: AlertsChip;
  confidence: AlertsConfidence;
  landFilter: AlertsLandFilter;
  /** The committed custom range, once the Custom pill has been opened. */
  custom?: DateRange;
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

  // The Custom dates open from the Custom pill at full width and from the
  // More menu at half width, so the popover is controlled rather than
  // toggled by one trigger.
  const [customOpen, setCustomOpen] = useState(false);
  const openCustom = () => {
    onChip("custom");
    setCustomOpen(true);
  };
  const moreSelected = MORE_CHIPS.includes(chip);

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

      {/* Filter toolbar: the period pills, a divider, the two dropdowns */}
      <Flex gap="6px" align="center" wrap="wrap">
        {PILLS.map(({ chip: value, folded }) => {
          const selected = chip === value;
          return (
            <Button
              key={value}
              {...pillProps(selected)}
              css={folded ? FULL_WIDTH_ONLY : undefined}
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
              {value === "new-week" && ready && (
                <Text
                  as="span"
                  fontFamily="mono"
                  fontSize="10px"
                  fontWeight="normal"
                  lineHeight="14px"
                  opacity={selected ? 0.9 : 0.7}
                >
                  {formatHa(newWeekHa)} ha
                </Text>
              )}
            </Button>
          );
        })}
        {/* Custom: the pill (or the More menu's item) selects the chip and
            opens the dates under whichever of the two pills the width shows:
            both share one anchor. Mounted on open, so the inputs start from
            the committed range each time (they are uncontrolled: a controlled
            date input snaps a half-typed year back on every keystroke the
            handler ignores). */}
        <Popover.Root
          open={customOpen}
          onOpenChange={(e) => setCustomOpen(e.open)}
          // Fixed, as the basemap selector's: the dashboard scrolls inside a
          // container, and an absolute positioner lands off the page.
          positioning={{ placement: "bottom-start", strategy: "fixed" }}
          lazyMount
          unmountOnExit
        >
          <Popover.Anchor asChild>
            <Flex display="inline-flex" align="center">
              <Button
                {...pillProps(chip === "custom")}
                css={FULL_WIDTH_ONLY}
                aria-pressed={chip === "custom"}
                disabled={!ready}
                onClick={openCustom}
              >
                Custom
                <CaretDownIcon size={10} />
              </Button>
              <Menu.Root positioning={{ placement: "bottom-start" }}>
                <Menu.Trigger asChild>
                  <Button
                    {...pillProps(moreSelected)}
                    css={HALF_WIDTH_ONLY}
                    disabled={!ready}
                    aria-label={
                      moreSelected
                        ? `More periods: ${CHIP_LABELS[chip]}`
                        : "More periods"
                    }
                  >
                    {moreSelected ? CHIP_LABELS[chip] : "More"}
                    <CaretDownIcon size={10} />
                  </Button>
                </Menu.Trigger>
                <Portal>
                  <Menu.Positioner>
                    <Menu.Content minW="140px" zIndex={1400}>
                      {MORE_CHIPS.map((value) => (
                        <Menu.Item
                          key={value}
                          value={value}
                          fontSize="12px"
                          onSelect={() =>
                            value === "custom" ? openCustom() : onChip(value)
                          }
                        >
                          {CHIP_LABELS[value]}
                        </Menu.Item>
                      ))}
                    </Menu.Content>
                  </Menu.Positioner>
                </Portal>
              </Menu.Root>
            </Flex>
          </Popover.Anchor>
          <Portal>
            <Popover.Positioner>
              <Popover.Content w="auto" zIndex={1400}>
                <Popover.Body p={3}>
                  {custom && view.kind === "ready" && (
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
                            min={customStartMin(view.anchor)}
                            max={view.anchor}
                            aria-label={`Custom period ${bound}`}
                            onChange={(e) =>
                              e.target.value &&
                              onCustomChange({
                                ...custom,
                                [bound]: e.target.value,
                              })
                            }
                          />
                        </Text>
                      ))}
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
          No alerts in this period.
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
              {pageNumbers(paged.page, paged.totalPages).map((entry, index) =>
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
                    fontWeight={entry === paged.page ? "medium" : "normal"}
                    color={entry === paged.page ? "#0049AA" : "#565E7B"}
                    aria-label={`Page ${entry}`}
                    aria-current={entry === paged.page ? "page" : undefined}
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

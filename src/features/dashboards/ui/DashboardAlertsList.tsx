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
import {
  formatAlertDate,
  formatHa,
  LAND_FILTERS,
  landFilterOption,
  pageNumbers,
  rowArea,
  rowsSummary,
  rowTiers,
  TIERS,
  type AlertDay,
  type AlertsChip,
  type AlertsConfidence,
  type AlertsLandFilter,
  type DateRange,
} from "../lib/alertsWidgets";
import { paginate } from "../lib/pagination";

const PAGE_SIZE = 10;

const PRESET_CHIPS: { chip: Exclude<AlertsChip, "custom">; label: string }[] = [
  { chip: "new-week", label: "New this week" },
  { chip: "last-day", label: "Last day" },
  { chip: "last-3-days", label: "Last 3 days" },
  { chip: "last-week", label: "Last week" },
];

const CONFIDENCES: AlertsConfidence[] = ["all", "high", "highest"];

/** A failed fetch, as the pane shows it. */
export interface AlertsFailure {
  message: string;
  retryable: boolean;
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
      /** The earliest start a custom range may have. */
      startMin: string;
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

/**
 * The design's "Dropdown / …" control: a label, the chosen value and a
 * chevron on a 24px pill, opening a menu of the options.
 */
function FilterDropdown<T extends string | undefined>({
  label,
  value,
  options,
  onSelect,
}: {
  label: string;
  value: T;
  options: { value: T; label: string }[];
  onSelect: (value: T) => void;
}) {
  const current = options.find((option) => option.value === value);
  return (
    <Menu.Root positioning={{ placement: "bottom-start" }}>
      <Menu.Trigger asChild>
        <Button
          size="xs"
          h="24px"
          pl="10px"
          pr="8px"
          gap="6px"
          rounded="sm"
          variant="outline"
          bg="white"
          borderColor="#E0E2E5"
          fontSize="12px"
          _icon={{ width: "auto", height: "auto" }}
          aria-label={`${label}: ${current?.label ?? ""}`}
        >
          <Text as="span" fontWeight="normal" color="#565E7B">
            {label}:
          </Text>
          <Text as="span" fontWeight="medium" color="#131619">
            {current?.label}
          </Text>
          <CaretDownIcon size={10} color="#131619" />
        </Button>
      </Menu.Trigger>
      <Portal>
        <Menu.Positioner>
          <Menu.Content minW="140px" zIndex={1400}>
            {options.map((option) => (
              <Menu.Item
                key={option.label}
                value={option.label}
                onSelect={() => onSelect(option.value)}
                fontSize="12px"
              >
                {option.label}
              </Menu.Item>
            ))}
          </Menu.Content>
        </Menu.Positioner>
      </Portal>
    </Menu.Root>
  );
}

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
        {failure.message}
      </Text>
      {failure.retryable && (
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
  /** The Intersects choice; undefined is "Any". */
  landFilter?: AlertsLandFilter;
  /** The committed custom range, once the Custom pill has been opened. */
  custom?: DateRange;
  onChip: (chip: AlertsChip) => void;
  onConfidence: (confidence: AlertsConfidence) => void;
  onLandFilter: (filter?: AlertsLandFilter) => void;
  onCustomChange: (range: DateRange) => void;
  onRetry: () => void;
}) {
  const ready = view.kind === "ready";
  const range = ready ? view.range : undefined;

  // The page resets whenever the rows it indexes change identity (a chip, a
  // tier, a new period). Reconciled during render, not in an effect, so the
  // table never paints a stale page first.
  const pageKey = `${chip}|${confidence}|${landFilter}|${range?.start}|${range?.end}`;
  const [paging, setPaging] = useState({ key: pageKey, page: 1 });
  const page = paging.key === pageKey ? paging.page : 1;
  const setPage = (next: number) => setPaging({ key: pageKey, page: next });

  const paged = paginate(rows, page, PAGE_SIZE);
  const summary = rowsSummary(rows, confidence);
  const land = landFilterOption(landFilter);

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
        {PRESET_CHIPS.map(({ chip: value, label }) => {
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
              {label}
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
        {/* Custom: the pill selects the chip and opens the dates. Mounted on
            open, so the inputs start from the committed range each time
            (they are uncontrolled: a controlled date input snaps a
            half-typed year back on every keystroke the handler ignores). */}
        <Popover.Root
          // Fixed, as the basemap selector's: the dashboard scrolls inside a
          // container, and an absolute positioner lands off the page.
          positioning={{ placement: "bottom-start", strategy: "fixed" }}
          lazyMount
          unmountOnExit
        >
          <Popover.Trigger asChild>
            <Button
              {...pillProps(chip === "custom")}
              aria-pressed={chip === "custom"}
              disabled={!ready}
              onClick={() => onChip("custom")}
            >
              Custom
              <CaretDownIcon size={10} />
            </Button>
          </Popover.Trigger>
          <Portal>
            <Popover.Positioner>
              <Popover.Content w="auto" zIndex={1400}>
                <Popover.Body p={3}>
                  {custom && view.kind === "ready" && (
                    <Flex gap="8px" align="center" wrap="wrap">
                      <Text as="label" fontSize="12px" color="#565E7B">
                        From{" "}
                        <Input
                          type="date"
                          size="xs"
                          w="auto"
                          display="inline-block"
                          bg="white"
                          defaultValue={custom.start}
                          min={view.startMin}
                          max={view.anchor}
                          aria-label="Custom period start"
                          onChange={(e) =>
                            e.target.value &&
                            onCustomChange({
                              start: e.target.value,
                              end: custom.end,
                            })
                          }
                        />
                      </Text>
                      <Text as="label" fontSize="12px" color="#565E7B">
                        To{" "}
                        <Input
                          type="date"
                          size="xs"
                          w="auto"
                          display="inline-block"
                          bg="white"
                          defaultValue={custom.end}
                          min={view.startMin}
                          max={view.anchor}
                          aria-label="Custom period end"
                          onChange={(e) =>
                            e.target.value &&
                            onCustomChange({
                              start: custom.start,
                              end: e.target.value,
                            })
                          }
                        />
                      </Text>
                    </Flex>
                  )}
                </Popover.Body>
              </Popover.Content>
            </Popover.Positioner>
          </Portal>
        </Popover.Root>
        <Box w="1px" h="20px" bg="#DDE2F5" aria-hidden />
        <FilterDropdown
          label="Confidence"
          value={confidence}
          options={CONFIDENCES.map((value) => ({
            value,
            label: TIERS[value].name,
          }))}
          onSelect={onConfidence}
        />
        <FilterDropdown
          label="Intersects"
          value={landFilter}
          options={LAND_FILTERS.map((option) => ({
            value: option.filter,
            label: option.label,
          }))}
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
                  <Table.Cell px="8px" py="7px" w="76px" borderColor="#EEF0F7">
                    {row.isNew && <NewBadge />}
                  </Table.Cell>
                  <Table.Cell
                    px="8px"
                    py="7px"
                    fontSize="12px"
                    whiteSpace="nowrap"
                    borderColor="#EEF0F7"
                  >
                    {formatAlertDate(row.date)}
                  </Table.Cell>
                  <Table.Cell
                    px="8px"
                    py="7px"
                    fontSize="12px"
                    whiteSpace="nowrap"
                    borderColor="#EEF0F7"
                  >
                    {rowTiers(row, confidence)}
                  </Table.Cell>
                  <Table.Cell
                    px="8px"
                    py="7px"
                    fontSize="12px"
                    textAlign="end"
                    borderColor="#EEF0F7"
                    css={{ fontVariantNumeric: "tabular-nums" }}
                  >
                    {formatHa(rowArea(row, confidence))}
                  </Table.Cell>
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
                size="xs"
                variant="plain"
                px={0}
                minW="auto"
                h="18px"
                fontSize="13px"
                color="#565E7B"
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
                size="xs"
                variant="plain"
                px={0}
                minW="auto"
                h="18px"
                fontSize="13px"
                color="#565E7B"
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
  );
}

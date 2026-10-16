import { useState } from "react";
import {
  Box,
  Button,
  Flex,
  IconButton,
  Input,
  Skeleton,
  Table,
  Text,
} from "@chakra-ui/react";
import { ArrowArcLeftIcon, ArrowArcRightIcon } from "@phosphor-icons/react";

import InsightCaption from "@/app/components/InsightCaption";
import {
  ALERTS_DATASET_START,
  formatAlertDate,
  formatHa,
  rowsSummary,
  type AlertDay,
  type AlertsChip,
  type AlertsConfidence,
  type DateRange,
} from "../lib/alertsWidgets";
import { paginate } from "../lib/pagination";

const PAGE_SIZE = 10;

const CHIPS: { chip: Exclude<AlertsChip, "custom">; label: string }[] = [
  { chip: "new-week", label: "New this week" },
  { chip: "last-day", label: "Last day" },
  { chip: "last-3-days", label: "Last 3 days" },
  { chip: "last-week", label: "Last week" },
];

const CONFIDENCES: { confidence: AlertsConfidence; label: string }[] = [
  { confidence: "all", label: "All" },
  { confidence: "high", label: "High" },
  { confidence: "highest", label: "Highest" },
];

/** The columns a confidence choice shows: a single tier is its own total. */
function columnsFor(confidence: AlertsConfidence): {
  key: "highHa" | "highestHa" | "totalHa";
  label: string;
}[] {
  switch (confidence) {
    case "high":
      return [{ key: "highHa", label: "High (ha)" }];
    case "highest":
      return [{ key: "highestHa", label: "Highest (ha)" }];
    case "all":
      return [
        { key: "highHa", label: "High (ha)" },
        { key: "highestHa", label: "Highest (ha)" },
        { key: "totalHa", label: "Total (ha)" },
      ];
  }
}

function rangeLabel(range: DateRange): string {
  return range.start === range.end
    ? `on ${formatAlertDate(range.start)}`
    : `from ${formatAlertDate(range.start)} to ${formatAlertDate(range.end)}`;
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
      textAlign={numeric ? "end" : undefined}
    >
      {children}
    </Table.ColumnHeader>
  );
}

/**
 * The list pane of the alerts widget (Figma "Alert list widget", Stage 1
 * columns): the curated caption, the period chips and confidence toggle, an
 * explainer, the table of alert days, and a footer with the period's totals
 * and the pager. Presentational: the rows arrive filtered to the period and
 * confidence, every choice goes back up through a callback, and nothing here
 * fetches. The container (`DashboardAlertsWidget`) owns the query and the
 * date-range state it shares with the map pane.
 *
 * The chips carry hectares, not counts: Stage 1 rows are days, so "New this
 * week · 15.5 ha" is the honest number.
 */
export default function DashboardAlertsList({
  status,
  error,
  isFetching,
  rows,
  range,
  dataTo,
  newWeekHa,
  chip,
  confidence,
  custom,
  onChip,
  onConfidence,
  onCustomChange,
  onRetry,
}: {
  status: "loading" | "ready" | "error";
  /**
   * The latest failure. With `status` "error" it is the whole body; with
   * "ready" it sits above rows already on show (a wider window that failed
   * to load), so the list never looks complete when it is not.
   */
  error: { message: string; retryable: boolean } | null;
  /** A refetch in flight behind rows already on show (a widened window). */
  isFetching: boolean;
  /** The rows for the chosen period and confidence, newest first. */
  rows: readonly AlertDay[];
  /** The period the rows cover; null until the first response. */
  range: DateRange | null;
  /** The data's last day; bounds the custom inputs. */
  dataTo: string | null;
  /** The "New this week" chip's hectares in the shown tier. */
  newWeekHa: number;
  chip: AlertsChip;
  confidence: AlertsConfidence;
  /** The custom inputs' values while the Custom chip is on. */
  custom: DateRange | null;
  onChip: (chip: AlertsChip) => void;
  onConfidence: (confidence: AlertsConfidence) => void;
  onCustomChange: (range: DateRange) => void;
  onRetry: () => void;
}) {
  // The page resets whenever the rows it indexes change identity (a chip, a
  // tier, a new period). Reconciled during render, not in an effect, so the
  // table never paints a stale page first.
  const pageKey = `${chip}|${confidence}|${range?.start}|${range?.end}`;
  const [paging, setPaging] = useState({ key: pageKey, page: 1 });
  const page = paging.key === pageKey ? paging.page : 1;
  const setPage = (next: number) => setPaging({ key: pageKey, page: next });

  const paged = paginate(rows, page, PAGE_SIZE);
  const summary = rowsSummary(rows, confidence);
  const columns = columnsFor(confidence);
  const ready = status === "ready";

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

      {/* Period chips, then the confidence toggle */}
      <Flex gap="6px" align="center" wrap="wrap">
        {CHIPS.map(({ chip: value, label }) => {
          const selected = chip === value;
          return (
            <Button
              key={value}
              size="xs"
              h="24px"
              px="10px"
              rounded="full"
              fontSize="12px"
              colorPalette={selected ? "primary" : undefined}
              variant={selected ? "solid" : "outline"}
              bg={selected ? undefined : "white"}
              aria-pressed={selected}
              disabled={!ready && !rows.length}
              onClick={() => onChip(value)}
            >
              {label}
              {value === "new-week" && ready && (
                <Text
                  as="span"
                  fontFamily="mono"
                  fontSize="10px"
                  fontWeight="normal"
                  opacity={selected ? 0.9 : 0.7}
                >
                  · {formatHa(newWeekHa)} ha
                </Text>
              )}
            </Button>
          );
        })}
        <Button
          size="xs"
          h="24px"
          px="10px"
          rounded="full"
          fontSize="12px"
          colorPalette={chip === "custom" ? "primary" : undefined}
          variant={chip === "custom" ? "solid" : "outline"}
          bg={chip === "custom" ? undefined : "white"}
          aria-pressed={chip === "custom"}
          disabled={!ready && !rows.length}
          onClick={() => onChip("custom")}
        >
          Custom
        </Button>
        <Box w="1px" h="20px" bg="#DDE2F5" mx="2px" aria-hidden />
        <Flex align="center" gap="2px" role="group" aria-label="Confidence">
          <Text fontSize="12px" color="#565E7B" pr="4px">
            Confidence:
          </Text>
          {CONFIDENCES.map(({ confidence: value, label }) => {
            const selected = confidence === value;
            return (
              <Button
                key={value}
                size="xs"
                h="24px"
                px="8px"
                rounded="sm"
                fontSize="12px"
                colorPalette={selected ? "primary" : undefined}
                variant={selected ? "subtle" : "ghost"}
                aria-pressed={selected}
                onClick={() => onConfidence(value)}
              >
                {label}
              </Button>
            );
          })}
        </Flex>
      </Flex>

      {chip === "custom" && custom && (
        <Flex gap="8px" align="center" wrap="wrap">
          <Text as="label" fontSize="12px" color="#565E7B">
            From{" "}
            <Input
              type="date"
              size="xs"
              w="auto"
              display="inline-block"
              bg="white"
              value={custom.start}
              min={ALERTS_DATASET_START}
              max={dataTo ?? undefined}
              aria-label="Custom period start"
              onChange={(e) =>
                e.target.value &&
                onCustomChange({ start: e.target.value, end: custom.end })
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
              value={custom.end}
              min={ALERTS_DATASET_START}
              max={dataTo ?? undefined}
              aria-label="Custom period end"
              onChange={(e) =>
                e.target.value &&
                onCustomChange({ start: custom.start, end: e.target.value })
              }
            />
          </Text>
        </Flex>
      )}

      {range && (
        <Text fontSize="12px" lineHeight="16px" color="#565E7B">
          Alert days {rangeLabel(range)}, newest first. Area is the disturbed
          area detected on that day.
        </Text>
      )}

      {ready && error && (
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
            {error.message}
          </Text>
          {error.retryable && (
            <Button size="xs" variant="outline" bg="white" onClick={onRetry}>
              Retry
            </Button>
          )}
        </Flex>
      )}

      {status === "loading" ? (
        <Flex direction="column" gap="8px" aria-label="Loading alerts">
          <Skeleton h="14px" w="60%" />
          <Skeleton h="14px" w="90%" />
          <Skeleton h="14px" w="80%" />
        </Flex>
      ) : status === "error" && error ? (
        <Flex direction="column" gap="8px" align="flex-start" py="8px">
          <Text fontSize="14px" color="fg">
            {error.message}
          </Text>
          {error.retryable && (
            <Button size="xs" variant="outline" onClick={onRetry}>
              Retry
            </Button>
          )}
        </Flex>
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
                {columns.map((column) => (
                  <HeaderCell key={column.key} numeric>
                    {column.label}
                  </HeaderCell>
                ))}
              </Table.Row>
            </Table.Header>
            <Table.Body>
              {paged.items.map((row) => (
                <Table.Row key={row.date} bg="transparent">
                  <Table.Cell px="8px" py="7px" w="60px">
                    {row.isNew && <NewBadge />}
                  </Table.Cell>
                  <Table.Cell
                    px="8px"
                    py="7px"
                    fontSize="12px"
                    whiteSpace="nowrap"
                  >
                    {formatAlertDate(row.date)}
                  </Table.Cell>
                  {columns.map((column) => (
                    <Table.Cell
                      key={column.key}
                      px="8px"
                      py="7px"
                      fontSize="12px"
                      textAlign="end"
                      css={{ fontVariantNumeric: "tabular-nums" }}
                    >
                      {formatHa(row[column.key])}
                    </Table.Cell>
                  ))}
                </Table.Row>
              ))}
            </Table.Body>
          </Table.Root>
        </Box>
      )}

      {ready && (
        <Flex align="center" justify="space-between" gap="8px" wrap="wrap">
          <Text fontSize="12px" lineHeight="16px" color="#565E7B">
            {summary.days} alert {summary.days === 1 ? "day" : "days"} ·{" "}
            {formatHa(summary.ha)} ha in this period
          </Text>
          {paged.totalPages > 1 && (
            <Flex align="center" gap="8px">
              <IconButton
                aria-label="Previous page"
                title="Previous page"
                size="xs"
                variant="ghost"
                border="1px solid"
                borderColor="border.emphasized"
                disabled={paged.page === 1}
                onClick={() => setPage(paged.page - 1)}
              >
                <ArrowArcLeftIcon size={14} />
              </IconButton>
              <Text
                fontSize="12px"
                color="fg.muted"
                aria-live="polite"
                css={{ fontVariantNumeric: "tabular-nums" }}
              >
                {paged.page} of {paged.totalPages}
              </Text>
              <IconButton
                aria-label="Next page"
                title="Next page"
                size="xs"
                variant="ghost"
                border="1px solid"
                borderColor="border.emphasized"
                disabled={paged.page === paged.totalPages}
                onClick={() => setPage(paged.page + 1)}
              >
                <ArrowArcRightIcon size={14} />
              </IconButton>
            </Flex>
          )}
        </Flex>
      )}
    </Flex>
  );
}

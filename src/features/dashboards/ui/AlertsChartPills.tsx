import { Button, Flex } from "@chakra-ui/react";

import type { DateRange } from "@/src/shared/lib/iso-date";
import { ALERTS_CHART_PRESETS, type AlertsChartPill } from "../lib/alertsChart";
import { CustomPeriodPill, pillProps } from "./PeriodPills";

/**
 * The period pills above the alerts chart of a Near real-time monitoring
 * section (PZB-1566): Last 30 days, Last 2 weeks, Last week, each to the
 * latest alert date, and Custom, within the chart's 30 days. The container
 * trims the stored rows to the pill's range (`alertsChartRange`); nothing
 * is fetched.
 */
export default function AlertsChartPills({
  pill,
  period,
  custom,
  onPill,
  onCustomOpen,
  onCustomChange,
}: {
  pill: AlertsChartPill;
  /** The chart's period, which bounds a custom range. */
  period: DateRange;
  /** The committed custom range, once Custom has been opened. */
  custom?: DateRange;
  onPill: (pill: AlertsChartPill) => void;
  /** Custom was picked: select it, its dates opening on the range on show. */
  onCustomOpen: () => void;
  onCustomChange: (range: DateRange) => void;
}) {
  return (
    <Flex
      gap="6px"
      align="center"
      wrap="wrap"
      role="group"
      aria-label="Chart period"
    >
      {ALERTS_CHART_PRESETS.map(({ value, label }) => {
        const selected = pill === value;
        return (
          <Button
            key={value}
            {...pillProps(selected)}
            aria-pressed={selected}
            onClick={() => onPill(value)}
          >
            {label}
          </Button>
        );
      })}
      <CustomPeriodPill
        selected={pill === "custom"}
        custom={custom}
        bounds={period}
        onOpen={onCustomOpen}
        onChange={onCustomChange}
      />
    </Flex>
  );
}

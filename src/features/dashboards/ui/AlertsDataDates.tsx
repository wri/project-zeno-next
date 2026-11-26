import { Flex, Text } from "@chakra-ui/react";

import { InfoTooltip } from "@/src/shared/ui/InfoTooltip";

/**
 * The tooltip beside every line that dates the alerts data. Users read an
 * alert date a week old as data that stopped updating, so it says how often
 * new data arrives.
 */
const ALERTS_DATA_TOOLTIP =
  "Alerts are dated by when they were detected. Global Nature Watch gets new alerts data about once a week, so the newest alerts can be a week or more old.";

const SIZES = {
  sm: { icon: 14, fontSize: "10px", color: "#565E7B", nowrap: true },
  md: { icon: 16, fontSize: "12px", color: "#656E7B", nowrap: false },
} as const;

/**
 * How current the alerts data is: the label the container words
 * (`formatFreshness`, day first and in capitals) beside the tooltip every
 * alerts date line carries. `sm` is the widget card's params row; `md` is
 * the dashboards list's summary row.
 */
export function AlertsDataDates({
  label,
  size = "sm",
}: {
  label: string;
  size?: keyof typeof SIZES;
}) {
  const s = SIZES[size];
  return (
    <Flex align="center" gap="4px" color={s.color}>
      <InfoTooltip about="the alerts data" size={s.icon}>
        {ALERTS_DATA_TOOLTIP}
      </InfoTooltip>
      <Text
        fontFamily="mono"
        fontSize={s.fontSize}
        lineHeight="16px"
        whiteSpace={s.nowrap ? "nowrap" : undefined}
      >
        {label}
      </Text>
    </Flex>
  );
}

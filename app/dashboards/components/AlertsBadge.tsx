"use client";

import { Badge } from "@chakra-ui/react";
import { Tooltip } from "@/app/components/ui/tooltip";
import { fakeAlertsUpdated } from "@/app/dashboards/lib/fixtures";

/** Red "N new alerts" pill. Hovering reveals a (faked) data-freshness note. */
export default function AlertsBadge({
  label,
  seed,
}: {
  label: string;
  seed: string;
}) {
  return (
    <Tooltip
      content={`Alerts data last updated ${fakeAlertsUpdated(seed)}`}
      showArrow
    >
      <Badge colorPalette="red" variant="subtle" cursor="default">
        {label}
      </Badge>
    </Tooltip>
  );
}

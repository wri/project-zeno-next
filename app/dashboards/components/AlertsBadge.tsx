"use client";

import { Box, Flex, Text } from "@chakra-ui/react";
import { Tooltip } from "@/app/components/ui/tooltip";
import { fakeAlertsUpdated } from "@/app/dashboards/lib/fixtures";

/** Red status pill with a leading dot (e.g. "3 new alerts" /
 *  "New data available"), matching the dashboard header badge in the design.
 *  Hovering reveals a (faked) data-freshness note. */
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
      <Flex
        as="span"
        display="inline-flex"
        align="center"
        gap="4px"
        w="fit-content"
        bg="#FEF2F2"
        borderWidth="1px"
        borderColor="#F8BABA"
        rounded="4px"
        px="6px"
        py="2px"
        cursor="default"
      >
        <Box w="6px" h="6px" rounded="full" bg="#EF4444" flexShrink={0} />
        <Text fontFamily="mono" fontSize="10px" color="#B91C1C">
          {label}
        </Text>
      </Flex>
    </Tooltip>
  );
}

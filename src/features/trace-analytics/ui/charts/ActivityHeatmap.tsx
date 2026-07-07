"use client";

/** Weekday × hour-of-day heat grid showing when traffic arrives (UTC). */

import { Box, Flex, Grid, Text } from "@chakra-ui/react";
import type { HourlyActivity } from "../../lib/analytics/activity";
import { SEQUENTIAL_BLUE, sequentialBlue } from "./palette";
import { formatCount } from "../../lib/format";

const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"] as const;
/** Hour labels every 3 hours keep the axis readable at cell width. */
const HOUR_LABEL_STEP = 3;

interface ActivityHeatmapProps {
  readonly activity: HourlyActivity;
}

export function ActivityHeatmap({ activity }: ActivityHeatmapProps) {
  const { cells, maxCount } = activity;
  const safeMax = Math.max(1, maxCount);

  return (
    <Box>
      <Grid
        templateColumns="max-content repeat(24, 1fr)"
        gap="2px"
        alignItems="center"
      >
        {WEEKDAYS.map((day, weekday) => (
          <Flex key={day} display="contents">
            <Text
              fontSize="2xs"
              fontFamily="mono"
              color="fg.subtle"
              pr={2}
              textAlign="right"
            >
              {day}
            </Text>
            {cells
              .filter((c) => c.weekday === weekday)
              .map((cell) => (
                <Box
                  key={`${cell.weekday}-${cell.hour}`}
                  h="18px"
                  borderRadius="2px"
                  bg={sequentialBlue(cell.count / safeMax)}
                  title={`${day} ${String(cell.hour).padStart(2, "0")}:00–${String(
                    (cell.hour + 1) % 24
                  ).padStart(
                    2,
                    "0"
                  )}:00 UTC · ${formatCount(cell.count)} traces`}
                />
              ))}
          </Flex>
        ))}
        {/* Hour axis row */}
        <Box />
        {Array.from({ length: 24 }, (_, hour) => (
          <Text
            key={hour}
            fontSize="2xs"
            fontFamily="mono"
            color="fg.subtle"
            textAlign="left"
          >
            {hour % HOUR_LABEL_STEP === 0 ? String(hour).padStart(2, "0") : ""}
          </Text>
        ))}
      </Grid>
      <Flex align="center" gap={2} mt={3}>
        <Text fontSize="2xs" color="fg.subtle">
          0
        </Text>
        <Box
          h="8px"
          w="120px"
          borderRadius="full"
          style={{
            background: `linear-gradient(90deg, ${SEQUENTIAL_BLUE.from}, ${SEQUENTIAL_BLUE.to})`,
          }}
        />
        <Text fontSize="2xs" color="fg.subtle">
          {formatCount(maxCount)} traces/hour · times in UTC
        </Text>
      </Flex>
    </Box>
  );
}

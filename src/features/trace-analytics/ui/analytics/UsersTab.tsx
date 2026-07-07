"use client";

/** Users tab — acquisition, engagement, retention cohorts and top users. */

import { useMemo } from "react";
import { Flex, Heading, SimpleGrid, Text } from "@chakra-ui/react";
import type { TraceRow } from "../../model/types";
import type { UserSegments } from "../../lib/analytics/segments";
import { buildDailyUserSegments } from "../../lib/analytics/segments";
import { computePromptUtilisation } from "../../lib/analytics/aggregations";
import { computeHourlyActivity } from "../../lib/analytics/activity";
import { computeSessionDepth } from "../../lib/analytics/sessions";
import { buildWeeklyRetention } from "../../lib/analytics/retention";
import { computeUserActivity } from "../../lib/analytics/topUsers";
import { binValues } from "../../lib/analytics/stats";
import { DAILY_PROMPT_LIMIT } from "../../model/config";
import { formatCount, formatPercent } from "../../lib/format";
import { CATEGORY_COLORS, SEGMENT_COLORS } from "../charts/palette";
import { ChartCard } from "../charts/ChartCard";
import { StackedBarsChart } from "../charts/StackedBarsChart";
import { DonutChart } from "../charts/DonutChart";
import { DailyLinesChart } from "../charts/DailyLinesChart";
import { HistogramChart } from "../charts/HistogramChart";
import { ActivityHeatmap } from "../charts/ActivityHeatmap";
import { InfoCallout } from "../primitives/InfoCallout";
import { StatCards } from "../primitives/StatCards";
import { RetentionGrid } from "./RetentionGrid";
import { TopUsersTable } from "./TopUsersTable";

interface UsersTabProps {
  readonly rows: readonly TraceRow[];
  readonly segments: UserSegments | null;
  readonly startDate: string;
  readonly emailByUserId: ReadonlyMap<string, string> | null;
  readonly firstSeenByUser: ReadonlyMap<string, string> | null;
}

export function UsersTab({
  rows,
  segments,
  startDate,
  emailByUserId,
  firstSeenByUser,
}: UsersTabProps) {
  const utilisation = useMemo(() => computePromptUtilisation(rows), [rows]);
  const utilisationBins = useMemo(
    () => binValues(utilisation.userDayCounts, 30, { integer: true }),
    [utilisation]
  );
  const depth = useMemo(() => computeSessionDepth(rows), [rows]);
  const depthBins = useMemo(
    () => binValues(depth.turnsPerSession, 30, { integer: true }),
    [depth]
  );
  const hourly = useMemo(() => computeHourlyActivity(rows), [rows]);
  const dailySegments = useMemo(
    () =>
      segments
        ? buildDailyUserSegments(
            rows,
            segments.firstSeenByUser,
            segments.engagedUsers
          )
        : [],
    [rows, segments]
  );
  const retention = useMemo(
    () => buildWeeklyRetention(rows, firstSeenByUser),
    [rows, firstSeenByUser]
  );
  const activity = useMemo(() => computeUserActivity(rows), [rows]);

  return (
    <Flex direction="column" gap={4}>
      {segments && dailySegments.length > 1 ? (
        <>
          <Heading as="h4" size="sm">
            Acquisition &amp; engagement
          </Heading>
          <InfoCallout title="How are these categories defined?">
            <Text whiteSpace="pre-wrap" fontSize="sm">
              {`Users are classified along two independent dimensions:

Acquisition — New: first-ever activity on or after ${startDate}; Returning: first activity before ${startDate}. On the daily chart a user is "New" only on their first-seen day; afterwards they count as "Returning".

Engagement — Engaged: ≥2 sessions each containing ≥2 prompts (applies to all users); Not Engaged: everyone else.

The donuts count each user once across the whole range; the daily chart counts each user once per active day.`}
            </Text>
          </InfoCallout>

          <SimpleGrid columns={{ base: 1, lg: 2 }} gap={4}>
            <ChartCard
              title="Daily new vs returning"
              help="Active users per day, split by whether it is their first day."
              info="The solid blue segment is genuinely new accounts — their very first
                trace happened that day. The pale segment is everyone coming back.
                A healthy product shows a steady pale base (habit) with regular blue
                pulses (acquisition). All-blue days mean traffic is arriving but not
                sticking."
            >
              <StackedBarsChart
                data={dailySegments as unknown as Record<string, unknown>[]}
                series={[
                  { key: "newUsers", label: "New", color: SEGMENT_COLORS.new },
                  {
                    key: "returningUsers",
                    label: "Returning",
                    color: SEGMENT_COLORS.returning,
                  },
                ]}
                yLabel="Users"
              />
            </ChartCard>
            <ChartCard
              title="Total new vs returning"
              help="Unique users in the date range, counted once each."
              info="Same definition as the daily chart, but each user counts once for
                the whole window. New + Returning = every user active in the range."
            >
              <DonutChart
                data={[
                  { label: "New", count: segments.newUsers.size },
                  { label: "Returning", count: segments.returningUsers.size },
                ]}
                colors={{
                  New: SEGMENT_COLORS.new,
                  Returning: SEGMENT_COLORS.returning,
                }}
                height={200}
                centerLabel="users"
              />
            </ChartCard>
          </SimpleGrid>

          <SimpleGrid columns={{ base: 1, lg: 2 }} gap={4}>
            <ChartCard
              title="Daily engaged vs not engaged"
              help="Active users per day, split by the engagement bar."
              info="Engaged means the user has ≥2 sessions with ≥2 prompts each —
                i.e. they came back and dug in. The green share growing over time is
                the single best signal that the product is forming habits."
            >
              <StackedBarsChart
                data={dailySegments as unknown as Record<string, unknown>[]}
                series={[
                  {
                    key: "notEngagedUsers",
                    label: "Not engaged",
                    color: SEGMENT_COLORS.notEngaged,
                  },
                  {
                    key: "engagedUsers",
                    label: "Engaged",
                    color: SEGMENT_COLORS.engaged,
                  },
                ]}
                yLabel="Users"
              />
            </ChartCard>
            <ChartCard
              title="Total engaged vs not engaged"
              help="Unique users in the date range, counted once each."
              info="Each user counts once for the whole window. Engaged + Not engaged =
                every user active in the range."
            >
              <DonutChart
                data={[
                  {
                    label: "Not engaged",
                    count: segments.notEngagedUsers.size,
                  },
                  { label: "Engaged", count: segments.engagedUsers.size },
                ]}
                colors={{
                  "Not engaged": SEGMENT_COLORS.notEngaged,
                  Engaged: SEGMENT_COLORS.engaged,
                }}
                height={200}
                centerLabel="users"
              />
            </ChartCard>
          </SimpleGrid>
        </>
      ) : (
        <Text fontSize="sm" color="fg.muted">
          Acquisition charts appear once user data is loaded and the window
          spans more than one day.
        </Text>
      )}

      <RetentionGrid retention={retention} />

      <TopUsersTable
        activity={activity}
        emailByUserId={emailByUserId}
        firstSeenByUser={firstSeenByUser}
      />

      <Heading as="h4" size="sm">
        Prompt utilisation
      </Heading>
      {utilisation.userDays ? (
        <SimpleGrid columns={{ base: 1, lg: 2 }} gap={4}>
          <ChartCard
            title="Prompts per user per day (distribution)"
            help="How many prompts users send on a day they are active."
            info="Each observation is one user-day: one user on one day they sent at
              least one prompt. A long right tail means a handful of power users; a
              pile-up at the daily limit means the cap is binding."
          >
            <HistogramChart
              bins={utilisationBins}
              countLabel="User-days"
              height={260}
            />
          </ChartCard>
          <ChartCard
            title="Prompts per user per day (daily)"
            help="Mean, median and p95 prompts per active user, per day."
            info="Median is the typical user; p95 is your power users. When p95 rides
              the red daily-limit line, heavy users are being throttled — mean rising
              while median stays flat means depth is concentrating in fewer hands."
          >
            <DailyLinesChart
              data={utilisation.daily as unknown as Record<string, unknown>[]}
              series={[
                {
                  key: "meanPromptsPerUser",
                  label: "Mean",
                  color: CATEGORY_COLORS[0],
                },
                {
                  key: "medianPromptsPerUser",
                  label: "Median",
                  color: CATEGORY_COLORS[2],
                },
                {
                  key: "p95PromptsPerUser",
                  label: "p95",
                  color: CATEGORY_COLORS[1],
                },
              ]}
              yLabel="Prompts per user"
              valueFormatter={(v) => v.toFixed(2)}
              referenceY={DAILY_PROMPT_LIMIT}
              referenceLabel="Daily limit"
            />
          </ChartCard>
        </SimpleGrid>
      ) : (
        <Text fontSize="sm" color="fg.muted">
          No prompt utilisation data available.
        </Text>
      )}

      <Heading as="h4" size="sm">
        Conversation depth
      </Heading>
      {depth.sessionCount ? (
        <SimpleGrid columns={{ base: 1, lg: 2 }} gap={4}>
          <ChartCard
            title="Prompts per conversation"
            help="How many prompts each conversation thread contains (within the window)."
            info="Depth is the strongest engagement signal we have per thread. A
              heavy bar at 1 means most conversations die after a single prompt —
              users either got what they needed immediately or bounced. Compare the
              single-prompt share over time after onboarding or starter-prompt
              changes."
          >
            <Flex direction="column" gap={3}>
              <StatCards
                items={[
                  {
                    label: "Conversations",
                    value: formatCount(depth.sessionCount),
                  },
                  {
                    label: "Single-prompt",
                    value: formatPercent(depth.singleTurnShare),
                  },
                  {
                    label: "Median depth",
                    value: depth.medianTurns.toFixed(1),
                  },
                  { label: "p95 depth", value: depth.p95Turns.toFixed(1) },
                ]}
                columns={4}
              />
              <HistogramChart
                bins={depthBins}
                countLabel="Conversations"
                height={200}
              />
            </Flex>
          </ChartCard>
          <ChartCard
            title="Activity by hour and weekday"
            help="When prompts arrive, by UTC hour of day."
            info="Rows are weekdays, columns are UTC hours; darker blue = more
              traces. A single dark column can be one power user's routine; a dark
              weekday band matches office hours in the dominant user time zones.
              Use it to time deploys and to interpret daily dips."
          >
            <ActivityHeatmap activity={hourly} />
          </ChartCard>
        </SimpleGrid>
      ) : (
        <Text fontSize="sm" color="fg.muted">
          No session data available in the window.
        </Text>
      )}
    </Flex>
  );
}
